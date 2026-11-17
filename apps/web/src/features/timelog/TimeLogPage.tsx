import { trpc } from "../../trpc";
import { notifications } from "@mantine/notifications";
import {
  ActionIcon,
  Button,
  Group,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { IconDownload, IconTrash } from "@tabler/icons-react";
import { useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  currentWeekStartIso,
  formatShortDate,
  formatTimeRange,
  pastDateSelectOptions,
  todayIso,
  totalHoursFromRanges,
  weekStartForIsoDate,
} from "../../shared/lib/week";
import { TIME_OPTIONS } from "../../shared/lib/timeOptions";
import { WeekNavigator } from "../../shared/ui/WeekNavigator";
import { downloadCsv } from "../../shared/lib/csv";
import { readTimeLogPrefill } from "../../shared/lib/timeLogPrefill";

export function TimeLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const weekStart = searchParams.get("week") ?? currentWeekStartIso();

  const utils = trpc.useUtils();
  const staffQuery = trpc.staff.list.useQuery();
  const logsQuery = trpc.timeLog.listForWeek.useQuery({ weekStart });
  const createLog = trpc.timeLog.create.useMutation({
    onSuccess: (_row, variables) => {
      utils.timeLog.listForWeek.invalidate();
      setNotes("");
      const loggedWeek = weekStartForIsoDate(variables.workDate);
      if (loggedWeek !== weekStart) {
        setWeek(loggedWeek);
      }
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Could not log hours",
        message: error.message,
      });
    },
  });
  const removeLog = trpc.timeLog.remove.useMutation({
    onSuccess: () => utils.timeLog.listForWeek.invalidate(),
  });

  const [staffMemberId, setStaffMemberId] = useState<string | null>(null);
  const [workDate, setWorkDate] = useState(todayIso);
  const [startTime, setStartTime] = useState("09:00:00");
  const [endTime, setEndTime] = useState("17:00:00");
  const [notes, setNotes] = useState("");

  const activeStaff = (staffQuery.data ?? []).filter((s) => s.active);
  const logs = logsQuery.data?.logs ?? [];
  const actualHours = totalHoursFromRanges(
    logs.map((row) => row.log),
  );

  function patchSearchParams(patch: (next: URLSearchParams) => void) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      patch(next);
      return next;
    });
  }

  function setWeek(iso: string) {
    patchSearchParams((next) => {
      next.set("week", iso);
    });
  }

  useEffect(() => {
    const prefill = readTimeLogPrefill(searchParams);
    if (prefill.staffMemberId) setStaffMemberId(prefill.staffMemberId);
    if (prefill.workDate) setWorkDate(prefill.workDate);
    if (prefill.startTime) setStartTime(prefill.startTime);
    if (prefill.endTime) setEndTime(prefill.endTime);
  }, [searchParams]);

  const dateOptions = useMemo(() => pastDateSelectOptions(), []);

  function exportLogsCsv() {
    if (logs.length === 0) return;
    const rows: string[][] = [
      [
        "Staff",
        "Area",
        "Date",
        "Start",
        "End",
        "Hours",
        "Notes",
      ],
    ];
    for (const { log, staffName, department } of logs) {
      const hours = totalHoursFromRanges([
        { startTime: log.startTime, endTime: log.endTime },
      ]);
      rows.push([
        staffName,
        department === "foh" ? "Front of house" : "Kitchen",
        String(log.workDate),
        log.startTime.slice(0, 5),
        log.endTime.slice(0, 5),
        String(hours),
        log.notes?.trim() ?? "",
      ]);
    }
    downloadCsv(`time-logs-week-${weekStart}.csv`, rows);
  }

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
        <Group gap="sm" wrap="wrap">
          <Button
            variant="default"
            size="sm"
            leftSection={<IconDownload size={16} />}
            disabled={logs.length === 0}
            onClick={exportLogsCsv}
          >
            Export CSV
          </Button>
          <WeekNavigator weekStart={weekStart} onChange={setWeek} />
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" verticalSpacing="lg">
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
            description="Any day up to today"
            data={dateOptions}
            value={workDate}
            onChange={(v) => setWorkDate(v ?? workDate)}
            searchable
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

        <ScrollArea>
          <Table withTableBorder striped style={{ minWidth: 480 }}>
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
                  <Table.Td>
                    {formatTimeRange(log.startTime, log.endTime)}
                  </Table.Td>
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
        </ScrollArea>
      </SimpleGrid>
    </Stack>
  );
}