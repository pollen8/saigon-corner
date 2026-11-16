import { trpc } from "../../trpc";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconChevronLeft, IconChevronRight, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  currentWeekStartIso,
  DAY_LABELS,
  formatShortDate,
  formatTimeRange,
  shiftWeek,
} from "../../shared/lib/week";
import { TIME_OPTIONS } from "../../shared/lib/timeOptions";

export function WeeklySchedulePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const weekStart = searchParams.get("week") ?? currentWeekStartIso();

  const utils = trpc.useUtils();
  const weekQuery = trpc.schedule.week.useQuery({ weekStart });
  const assignShift = trpc.schedule.assignShift.useMutation({
    onSuccess: () => utils.schedule.week.invalidate(),
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Could not add shift",
        message: error.message,
      });
    },
  });
  const removeShift = trpc.schedule.removeShift.useMutation({
    onSuccess: () => utils.schedule.week.invalidate(),
  });

  const [modal, setModal] = useState<{
    staffMemberId: string;
    staffName: string;
    workDate: string;
  } | null>(null);
  const [startTime, setStartTime] = useState("09:00:00");
  const [endTime, setEndTime] = useState("17:00:00");

  const data = weekQuery.data;

  function setWeek(iso: string) {
    setSearchParams({ week: iso });
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Stack gap={4}>
          <Title order={2} size="h4">
            Weekly roster
          </Title>
          <Text size="sm" c="dimmed">
            Week starting {formatShortDate(weekStart)}
          </Text>
        </Stack>
        <Group gap="xs">
          <ActionIcon
            variant="default"
            aria-label="Previous week"
            onClick={() => setWeek(shiftWeek(weekStart, -1))}
          >
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Button variant="light" size="compact-sm" onClick={() => setWeek(currentWeekStartIso())}>
            This week
          </Button>
          <ActionIcon
            variant="default"
            aria-label="Next week"
            onClick={() => setWeek(shiftWeek(weekStart, 1))}
          >
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>
      </Group>

      <ScrollArea>
        <Table withTableBorder striped style={{ minWidth: 900 }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={160}>Staff</Table.Th>
              {data?.dates.map((iso, index) => (
                <Table.Th key={iso}>
                  <Stack gap={2}>
                    <Text size="sm" fw={600}>
                      {DAY_LABELS[index]}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatShortDate(iso)}
                    </Text>
                    {(data.operatingHoursByDay[iso] ?? []).map((period) => (
                      <Text key={period.id} size="xs" c="teal">
                        {formatTimeRange(period.openTime, period.closeTime)}
                      </Text>
                    ))}
                  </Stack>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(data?.staff ?? []).map((member) => (
              <Table.Tr key={member.id}>
                <Table.Td>
                  <Stack gap={4}>
                    <Text size="sm" fw={600}>
                      {member.name}
                    </Text>
                    <Badge size="xs" variant="light" color={member.department === "foh" ? "blue" : "orange"}>
                      {member.department === "foh" ? "FOH" : "Kitchen"}
                    </Badge>
                  </Stack>
                </Table.Td>
                {data?.dates.map((iso) => {
                  const shifts = (data.shifts ?? []).filter(
                    (shift) =>
                      shift.staffMemberId === member.id && shift.workDate === iso,
                  );
                  const dayPeriods = data?.operatingHoursByDay[iso] ?? [];
                  const dayIsOpen = dayPeriods.length > 0;
                  return (
                    <Table.Td key={iso} style={{ verticalAlign: "top" }}>
                      <Stack gap={6}>
                        {shifts.map((shift) => (
                          <Paper key={shift.id} withBorder p={6} radius="sm">
                            <Group justify="space-between" wrap="nowrap" gap={4}>
                              <Text size="xs" fw={600}>
                                {formatTimeRange(shift.startTime, shift.endTime)}
                              </Text>
                              <ActionIcon
                                size="xs"
                                variant="subtle"
                                color="red"
                                aria-label="Remove shift"
                                onClick={() => removeShift.mutate({ id: shift.id })}
                              >
                                <IconTrash size={12} />
                              </ActionIcon>
                            </Group>
                          </Paper>
                        ))}
                        {dayIsOpen ? (
                          <Button
                            size="compact-xs"
                            variant="light"
                            leftSection={<IconPlus size={12} />}
                            onClick={() => {
                              const first = dayPeriods[0];
                              setModal({
                                staffMemberId: member.id,
                                staffName: member.name,
                                workDate: iso,
                              });
                              setStartTime(first.openTime);
                              setEndTime(first.closeTime);
                            }}
                          >
                            Add block
                          </Button>
                        ) : (
                          <Text size="xs" c="dimmed">
                            Closed
                          </Text>
                        )}
                      </Stack>
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <Modal
        opened={modal !== null}
        onClose={() => setModal(null)}
        title={modal ? `Shift · ${modal.staffName}` : "Shift"}
      >
        {modal ? (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {formatShortDate(modal.workDate)}
            </Text>
            <Select
              label="Start"
              data={TIME_OPTIONS}
              value={startTime}
              onChange={(v) => setStartTime(v ?? startTime)}
              searchable
            />
            <Select
              label="End"
              data={TIME_OPTIONS}
              value={endTime}
              onChange={(v) => setEndTime(v ?? endTime)}
              searchable
            />
            <Button
              onClick={() => {
                assignShift.mutate(
                  {
                    staffMemberId: modal.staffMemberId,
                    workDate: modal.workDate,
                    startTime,
                    endTime,
                  },
                  { onSuccess: () => setModal(null) },
                );
              }}
              loading={assignShift.isPending}
            >
              Save shift
            </Button>
          </Stack>
        ) : null}
      </Modal>
    </Stack>
  );
}