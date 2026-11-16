import { trpc } from "../../trpc";
import {
  ActionIcon,
  Button,
  Group,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconTrash } from "@tabler/icons-react";
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import {
  currentWeekStartIso,
  formatShortDate,
  formatTimeRange,
  shiftWeek,
  totalHoursFromRanges,
} from "../../shared/lib/week";
import { TIME_OPTIONS } from "../../shared/lib/timeOptions";

export function TimeLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const weekStart = searchParams.get("week") ?? currentWeekStartIso();

  const utils = trpc.useUtils();
  const staffQuery = trpc.staff.list.useQuery();
  const logsQuery = trpc.timeLog.listForWeek.useQuery({ weekStart });
  const createLog = trpc.timeLog.create.useMutation({
    onSuccess: () => {
      utils.timeLog.listForWeek.invalidate();
      setNotes("");
    },
  });
  const removeLog = trpc.timeLog.remove.useMutation({
    onSuccess: () => utils.timeLog.listForWeek.invalidate(),
  });

  const [staffMemberId, setStaffMemberId] = useState<string | null>(null);
  const [workDate, setWorkDate] = useState(logsQuery.data?.dates[0] ?? weekStart);
  const [startTime, setStartTime] = useState("09:00:00");
  const [endTime, setEndTime] = useState("17:00:00");
  const [notes, setNotes] = useState("");

  const activeStaff = (staffQuery.data ?? []).filter((s) => s.active);
  const logs = logsQuery.data?.logs ?? [];
  const actualHours = totalHoursFromRanges(
    logs.map((row) => row.log),
  );

  function setWeek(iso: string) {
    setSearchParams({ week: iso });
  }

  const dateOptions =
    logsQuery.data?.dates.map((iso) => ({
      value: iso,
      label: formatShortDate(iso),
    })) ?? [];

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Stack gap={4}>
          <Title order={2} size="h4">
            Actual hours worked
          </Title>
          <Text size="sm" c="dimmed">
            Week of {formatShortDate(weekStart)} · logged total{" "}
            <strong>{actualHours}h</strong>
          </Text>
        </Stack>
        <Group gap="xs">
          <ActionIcon variant="default" onClick={() => setWeek(shiftWeek(weekStart, -1))}>
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Button variant="light" size="compact-sm" onClick={() => setWeek(currentWeekStartIso())}>
            This week
          </Button>
          <ActionIcon variant="default" onClick={() => setWeek(shiftWeek(weekStart, 1))}>
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>
      </Group>

      <Stack gap="sm" maw={480}>
        <Select
          label="Staff"
          placeholder="Choose staff"
          data={activeStaff.map((s) => ({ value: s.id, label: s.name }))}
          value={staffMemberId}
          onChange={setStaffMemberId}
        />
        <Select
          label="Date"
          data={dateOptions}
          value={workDate}
          onChange={(v) => setWorkDate(v ?? workDate)}
        />
        <Group grow>
          <Select
            label="Started"
            data={TIME_OPTIONS}
            value={startTime}
            onChange={(v) => setStartTime(v ?? startTime)}
            searchable
          />
          <Select
            label="Finished"
            data={TIME_OPTIONS}
            value={endTime}
            onChange={(v) => setEndTime(v ?? endTime)}
            searchable
          />
        </Group>
        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          autosize
          minRows={2}
        />
        <Button
          disabled={!staffMemberId}
          loading={createLog.isPending}
          onClick={() => {
            if (!staffMemberId) return;
            createLog.mutate({
              staffMemberId,
              workDate,
              startTime,
              endTime,
              notes: notes.trim() || undefined,
            });
          }}
        >
          Log hours
        </Button>
      </Stack>

      <Table withTableBorder striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Staff</Table.Th>
            <Table.Th>Date</Table.Th>
            <Table.Th>Time</Table.Th>
            <Table.Th>Notes</Table.Th>
            <Table.Th w={48} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {logs.map(({ log, staffName, department }) => (
            <Table.Tr key={log.id}>
              <Table.Td>
                {staffName}
                <Text size="xs" c="dimmed">
                  {department === "foh" ? "FOH" : "Kitchen"}
                </Text>
              </Table.Td>
              <Table.Td>{formatShortDate(String(log.workDate))}</Table.Td>
              <Table.Td>{formatTimeRange(log.startTime, log.endTime)}</Table.Td>
              <Table.Td>{log.notes ?? "—"}</Table.Td>
              <Table.Td>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label="Delete"
                  onClick={() => removeLog.mutate({ id: log.id })}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}