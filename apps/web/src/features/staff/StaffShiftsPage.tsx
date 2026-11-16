import { trpc } from "../../trpc";
import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  currentWeekStartIso,
  DAY_LABELS,
  formatShortDate,
  formatTimeRange,
  shiftWeek,
  totalHoursFromRanges,
} from "../../shared/lib/week";

export function StaffShiftsPage() {
  const { staffId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const weekStart = searchParams.get("week") ?? currentWeekStartIso();

  const detailQuery = trpc.schedule.staffDetail.useQuery({
    staffMemberId: staffId,
    weekStart,
  });

  const data = detailQuery.data;
  const staff = data?.staff;
  const shifts = data?.shifts ?? [];
  const scheduledHours = totalHoursFromRanges(shifts);

  function setWeek(iso: string) {
    setSearchParams({ week: iso });
  }

  if (!staff && !detailQuery.isLoading) {
    return (
      <Text>
        Staff not found. <Anchor component={Link} to="/staff">Back to staff</Anchor>
      </Text>
    );
  }

  return (
    <Stack gap="md">
      <Anchor component={Link} to="/staff" size="sm">
        ← Staff list
      </Anchor>
      <Group justify="space-between" wrap="wrap">
        <Stack gap={4}>
          <Title order={2} size="h4">
            {staff?.name ?? "…"}
          </Title>
          {staff ? (
            <Badge variant="light">
              {staff.department === "foh" ? "Front of house" : "Kitchen"}
            </Badge>
          ) : null}
          <Text size="sm" c="dimmed">
            Scheduled: <strong>{scheduledHours}h</strong> this week
          </Text>
        </Stack>
        <Group gap="xs">
          <ActionIcon
            variant="default"
            onClick={() => setWeek(shiftWeek(weekStart, -1))}
            aria-label="Previous week"
          >
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Button variant="light" size="compact-sm" onClick={() => setWeek(currentWeekStartIso())}>
            This week
          </Button>
          <ActionIcon
            variant="default"
            onClick={() => setWeek(shiftWeek(weekStart, 1))}
            aria-label="Next week"
          >
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>
      </Group>

      <Table withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Day</Table.Th>
            <Table.Th>Date</Table.Th>
            <Table.Th>Scheduled blocks</Table.Th>
            <Table.Th>Hours</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(data?.dates ?? []).map((iso, index) => {
            const dayShifts = shifts.filter((s) => s.workDate === iso);
            const dayHours = totalHoursFromRanges(dayShifts);
            return (
              <Table.Tr key={iso}>
                <Table.Td>{DAY_LABELS[index]}</Table.Td>
                <Table.Td>{formatShortDate(iso)}</Table.Td>
                <Table.Td>
                  {dayShifts.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      —
                    </Text>
                  ) : (
                    <Stack gap={4}>
                      {dayShifts.map((shift) => (
                        <Paper key={shift.id} withBorder p="xs" radius="sm">
                          <Text size="sm">
                            {formatTimeRange(shift.startTime, shift.endTime)}
                          </Text>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Table.Td>
                <Table.Td>{dayHours}h</Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}