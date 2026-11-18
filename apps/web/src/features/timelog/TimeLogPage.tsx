import { trpc } from "../../trpc";
import { notifications } from "@mantine/notifications";
import {
  ActionIcon,
  Button,
  Group,
  Modal,
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
import { TIME_LOG_OPTIONS } from "../../shared/lib/timeOptions";
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
  const [exportOpen, setExportOpen] = useState(false);
  const [exportStart, setExportStart] = useState(weekStart);
  const [exportEnd, setExportEnd] = useState(todayIso);

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
  const exportDateOptions = useMemo(() => pastDateSelectOptions(730), []);
  const exportRangeInvalid = exportEnd < exportStart;

  function openExportModal() {
    const dates = logsQuery.data?.dates ?? [];
    setExportStart(dates[0] ?? weekStart);
    setExportEnd(dates[6] ?? todayIso());
    setExportOpen(true);
  }

  async function exportLogsCsv() {
    if (exportRangeInvalid) return;
    try {
      const result = await utils.timeLog.listForRange.fetch({
        startDate: exportStart,
        endDate: exportEnd,
      });
      if (result.logs.length === 0) {
        notifications.show({
          color: "yellow",
          title: "Nothing to export",
          message: "No time logs in that date range.",
        });
        return;
      }
      const byStaff = new Map<
        string,
        {
          staffName: string;
          department: string;
          ranges: { startTime: string; endTime: string }[];
        }
      >();
      for (const { log, staffName, department } of result.logs) {
        const existing = byStaff.get(log.staffMemberId);
        if (existing) {
          existing.ranges.push({
            startTime: log.startTime,
            endTime: log.endTime,
          });
        } else {
          byStaff.set(log.staffMemberId, {
            staffName,
            department,
            ranges: [{ startTime: log.startTime, endTime: log.endTime }],
          });
        }
      }
      const rows: string[][] = [
        ["Staff", "Area", "Hours"],
        ...[...byStaff.values()]
          .sort((a, b) => a.staffName.localeCompare(b.staffName))
          .map((row) => [
            row.staffName,
            row.department === "foh" ? "Front of house" : "Kitchen",
            String(totalHoursFromRanges(row.ranges)),
          ]),
      ];
      downloadCsv(`time-logs-${exportStart}-to-${exportEnd}.csv`, rows);
      setExportOpen(false);
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Could not export CSV",
        message: error instanceof Error ? error.message : "Try again.",
      });
    }
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
            onClick={openExportModal}
          >
            Export CSV
          </Button>
          <WeekNavigator weekStart={weekStart} onChange={setWeek} />
        </Group>
      </Group>

      <Modal
        opened={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export time logs"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Inclusive dates. Defaults to the week on screen.
          </Text>
          <Select
            label="Start date"
            data={exportDateOptions}
            value={exportStart}
            onChange={(value) => setExportStart(value ?? exportStart)}
            searchable
          />
          <Select
            label="End date"
            data={exportDateOptions}
            value={exportEnd}
            onChange={(value) => setExportEnd(value ?? exportEnd)}
            searchable
            error={
              exportRangeInvalid ? "End date must be on or after start date" : undefined
            }
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setExportOpen(false)}>
              Cancel
            </Button>
            <Button
              leftSection={<IconDownload size={16} />}
              disabled={exportRangeInvalid}
              onClick={() => {
                void exportLogsCsv();
              }}
            >
              Download CSV
            </Button>
          </Group>
        </Stack>
      </Modal>

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
              data={TIME_LOG_OPTIONS}
              value={startTime}
              onChange={(v) => setStartTime(v ?? startTime)}
              searchable
            />
            <Select
              label="Finished"
              data={TIME_LOG_OPTIONS}
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