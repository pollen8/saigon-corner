import { trpc } from "../../trpc";
import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  Menu,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconDots, IconPlus, IconTrash } from "@tabler/icons-react";
import { DAY_LABELS } from "../../shared/lib/week";
import { TIME_OPTIONS } from "../../shared/lib/timeOptions";
import { formatTimeRange } from "../../shared/lib/week";
import { useEffect, useState } from "react";

export function OperatingHoursPage() {
  const utils = trpc.useUtils();
  const hoursQuery = trpc.hours.list.useQuery();
  const addPeriod = trpc.hours.addPeriod.useMutation({
    onSuccess: () => utils.hours.list.invalidate(),
  });
  const removePeriod = trpc.hours.removePeriod.useMutation({
    onSuccess: () => utils.hours.list.invalidate(),
  });
  const copyDayToDays = trpc.hours.copyDayToDays.useMutation({
    onSuccess: () => {
      utils.hours.list.invalidate();
      setCopyModalDay(null);
      setCopyTargets([]);
    },
  });

  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [openTime, setOpenTime] = useState("09:00:00");
  const [closeTime, setCloseTime] = useState("17:00:00");

  const [copyModalDay, setCopyModalDay] = useState<number | null>(null);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);

  const periods = hoursQuery.data ?? [];

  useEffect(() => {
    if (copyModalDay === null) return;
    setCopyTargets([]);
  }, [copyModalDay]);

  function openCopyModal(dayIndex: number) {
    setCopyModalDay(dayIndex);
  }

  function toggleCopyTarget(dayIndex: number) {
    setCopyTargets((current) =>
      current.includes(dayIndex)
        ? current.filter((d) => d !== dayIndex)
        : [...current, dayIndex],
    );
  }

  const copySourceLabel =
    copyModalDay !== null ? DAY_LABELS[copyModalDay] : "";

  return (
    <Stack gap="md">
      <Title order={2} size="h4">
        Opening hours
      </Title>
      <Text size="sm" c="dimmed">
        Set one or more open/close windows per day (e.g. lunch service and evening
        service).
      </Text>

      <Paper withBorder p="md">
        <Group align="flex-end" wrap="wrap">
          <Select
            label="Day"
            data={DAY_LABELS.map((label, index) => ({
              value: String(index),
              label,
            }))}
            value={String(dayOfWeek)}
            onChange={(value) => setDayOfWeek(Number(value ?? 0))}
            w={140}
          />
          <Select
            label="Opens"
            data={TIME_OPTIONS}
            value={openTime}
            onChange={(value) => setOpenTime(value ?? openTime)}
            searchable
            w={120}
          />
          <Select
            label="Closes"
            data={TIME_OPTIONS}
            value={closeTime}
            onChange={(value) => setCloseTime(value ?? closeTime)}
            searchable
            w={120}
          />
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() =>
              addPeriod.mutate({ dayOfWeek, openTime, closeTime })
            }
            loading={addPeriod.isPending}
          >
            Add window
          </Button>
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
        {DAY_LABELS.map((label, dayIndex) => {
          const dayPeriods = periods.filter((p) => p.dayOfWeek === dayIndex);
          return (
            <Paper key={label} withBorder p="md" pos="relative">
              <Group justify="space-between" align="flex-start" mb="sm" wrap="nowrap">
                <Text fw={600}>{label}</Text>
                <Menu position="bottom-end" withinPortal>
                  <Menu.Target>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      aria-label={`Options for ${label}`}
                    >
                      <IconDots size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      disabled={dayPeriods.length === 0}
                      onClick={() => openCopyModal(dayIndex)}
                    >
                      Assign times to other days…
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
              <Stack gap="xs">
                {dayPeriods.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    Closed
                  </Text>
                ) : (
                  dayPeriods.map((period) => (
                    <Group key={period.id} justify="space-between" wrap="nowrap">
                      <Text size="sm">
                        {formatTimeRange(period.openTime, period.closeTime)}
                      </Text>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        aria-label="Remove"
                        onClick={() => removePeriod.mutate({ id: period.id })}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  ))
                )}
              </Stack>
            </Paper>
          );
        })}
      </SimpleGrid>

      <Modal
        opened={copyModalDay !== null}
        onClose={() => setCopyModalDay(null)}
        title={`Assign ${copySourceLabel} hours to`}
      >
        {copyModalDay !== null ? (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Replaces opening hours on the days you select with{" "}
              {copySourceLabel}&apos;s windows.
            </Text>
            <Stack gap="xs">
              {DAY_LABELS.map((label, index) => {
                if (index === copyModalDay) return null;
                return (
                  <Checkbox
                    key={label}
                    label={label}
                    checked={copyTargets.includes(index)}
                    onChange={() => toggleCopyTarget(index)}
                  />
                );
              })}
            </Stack>
            <Group justify="space-between">
              <Button
                variant="subtle"
                size="compact-sm"
                onClick={() =>
                  setCopyTargets(
                    DAY_LABELS.map((_, index) => index).filter(
                      (index) => index !== copyModalDay,
                    ),
                  )
                }
              >
                Select all
              </Button>
              <Group gap="sm">
                <Button variant="default" onClick={() => setCopyModalDay(null)}>
                  Cancel
                </Button>
                <Button
                  loading={copyDayToDays.isPending}
                  disabled={copyTargets.length === 0}
                  onClick={() =>
                    copyDayToDays.mutate({
                      fromDayOfWeek: copyModalDay,
                      targetDays: copyTargets,
                    })
                  }
                >
                  Apply
                </Button>
              </Group>
            </Group>
            {copyDayToDays.error ? (
              <Text size="sm" c="red">
                {copyDayToDays.error.message}
              </Text>
            ) : null}
          </Stack>
        ) : null}
      </Modal>
    </Stack>
  );
}