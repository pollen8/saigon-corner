import { trpc } from "../../trpc";
import {
  ActionIcon,
  Button,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { DAY_LABELS } from "../../shared/lib/week";
import { TIME_OPTIONS } from "../../shared/lib/timeOptions";
import { formatTimeRange } from "../../shared/lib/week";
import { useState } from "react";

export function OperatingHoursPage() {
  const utils = trpc.useUtils();
  const hoursQuery = trpc.hours.list.useQuery();
  const addPeriod = trpc.hours.addPeriod.useMutation({
    onSuccess: () => utils.hours.list.invalidate(),
  });
  const removePeriod = trpc.hours.removePeriod.useMutation({
    onSuccess: () => utils.hours.list.invalidate(),
  });

  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [openTime, setOpenTime] = useState("09:00:00");
  const [closeTime, setCloseTime] = useState("17:00:00");

  const periods = hoursQuery.data ?? [];

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
            <Paper key={label} withBorder p="md">
              <Text fw={600} mb="sm">
                {label}
              </Text>
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
    </Stack>
  );
}