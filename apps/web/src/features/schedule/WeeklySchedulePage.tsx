import { trpc } from "../../trpc";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Menu,
  Modal,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconChevronDown,
  IconClock,
  IconDotsVertical,
  IconLayoutList,
  IconPlus,
  IconPrinter,
  IconTemplate,
  IconTimeline,
  IconTrash,
} from "@tabler/icons-react";
import {
  RosterTemplatesModal,
  TEMPLATE_MENU_LABELS,
  type RosterTemplateModalMode,
} from "./RosterTemplatesModal";
import { RosterDayView } from "./RosterDayView";
import { ScheduleTimelineView } from "./ScheduleTimelineView";
import { WeekDaySegmentedControl } from "./WeekDaySegmentedControl";
import { useMediaQuery } from "@mantine/hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  currentWeekStartIso,
  DAY_LABELS,
  formatDayMonth,
  formatShortDate,
  formatTimeRange,
  todayIso,
  weekStartForIsoDate,
} from "../../shared/lib/week";
import { buildTimeLogPrefillSearchParams } from "../../shared/lib/timeLogPrefill";
import {
  endTimeSelectOptions,
  firstValidEndTime,
  startTimeSelectOptions,
} from "../../shared/lib/openingHours";
import { AreaBadge } from "../../shared/ui/AreaBadge";
import { WeekNavigator } from "../../shared/ui/WeekNavigator";

function parseScheduleView(value: string | null): "roster" | "timeline" {
  return value === "timeline" ? "timeline" : "roster";
}

export function WeeklySchedulePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const weekStart = searchParams.get("week") ?? currentWeekStartIso();
  const viewMode = parseScheduleView(searchParams.get("view"));

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
  const timelineResetDragRef = useRef<() => void>(() => {});

  const updateShift = trpc.schedule.updateShift.useMutation({
    onMutate: async (input) => {
      await utils.schedule.week.cancel({ weekStart });
      const previous = utils.schedule.week.getData({ weekStart });
      if (previous) {
        utils.schedule.week.setData(
          { weekStart },
          {
            ...previous,
            shifts: previous.shifts.map((shift) =>
              shift.id === input.id
                ? {
                    ...shift,
                    workDate: input.workDate ?? shift.workDate,
                    startTime: input.startTime ?? shift.startTime,
                    endTime: input.endTime ?? shift.endTime,
                    department: input.department ?? shift.department,
                  }
                : shift,
            ),
          },
        );
      }
      return { previous };
    },
    onSuccess: () => utils.schedule.week.invalidate(),
    onError: (error, _input, context) => {
      if (context?.previous) {
        utils.schedule.week.setData({ weekStart }, context.previous);
      }
      timelineResetDragRef.current();
      notifications.show({
        color: "red",
        title: "Could not update shift",
        message: error.message,
      });
    },
  });

  const [modal, setModal] = useState<{
    staffMemberId?: string;
    staffName?: string;
    workDate: string;
    defaultDepartment: "foh" | "kitchen";
    pickStaff?: boolean;
  } | null>(null);
  const [startTime, setStartTime] = useState("09:00:00");
  const [endTime, setEndTime] = useState("17:00:00");
  const [department, setDepartment] = useState<"foh" | "kitchen">("foh");
  const [templateModal, setTemplateModal] = useState<RosterTemplateModalMode | null>(
    null,
  );
  const [mobileDayIndex, setMobileDayIndex] = useState(0);
  const isNarrow = useMediaQuery("(max-width: 47.99em)");

  const data = weekQuery.data;

  const holidayKeySet = useMemo(() => {
    const set = new Set<string>();
    for (const row of data?.holidays ?? []) {
      set.add(`${row.staffMemberId}:${row.workDate}`);
    }
    return set;
  }, [data?.holidays]);

  const coverageGapsByDate = useMemo(() => {
    const map = new Map<string, NonNullable<typeof data>["coverageGaps"]>();
    for (const gap of data?.coverageGaps ?? []) {
      const list = map.get(gap.workDate) ?? [];
      list.push(gap);
      map.set(gap.workDate, list);
    }
    return map;
  }, [data?.coverageGaps]);

  const coverageGapCount = data?.coverageGaps?.length ?? 0;

  useEffect(() => {
    if (!data?.dates?.length) return;
    const today = todayIso();
    const index = data.dates.indexOf(today);
    setMobileDayIndex(index >= 0 ? index : 0);
  }, [weekStart, data?.dates]);

  const modalDayPeriods = useMemo(
    () =>
      modal && data
        ? (data.operatingHoursByDay[modal.workDate] ?? [])
        : [],
    [modal, data],
  );

  const startTimeOptions = useMemo(
    () => startTimeSelectOptions(modalDayPeriods),
    [modalDayPeriods],
  );

  const endTimeOptions = useMemo(
    () => endTimeSelectOptions(modalDayPeriods, startTime),
    [modalDayPeriods, startTime],
  );

  useEffect(() => {
    if (!modal) return;
    const stillValid = endTimeOptions.find(
      (option) => option.value === endTime && !option.disabled,
    );
    if (!stillValid) {
      const fallback = firstValidEndTime(modalDayPeriods, startTime);
      if (fallback) setEndTime(fallback);
    }
  }, [endTime, endTimeOptions, modal, modalDayPeriods, startTime]);

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

  function setViewMode(mode: "roster" | "timeline") {
    patchSearchParams((next) => {
      if (mode === "timeline") {
        next.set("view", "timeline");
      } else {
        next.delete("view");
      }
    });
  }

  const handleTimelineCreate = useCallback(
    (payload: { workDate: string; startTime: string; endTime: string }) => {
      const first = data?.staff[0];
      setStartTime(payload.startTime);
      setEndTime(payload.endTime);
      setDepartment(first?.department ?? "foh");
      setModal({
        workDate: payload.workDate,
        pickStaff: true,
        staffMemberId: first?.id,
        staffName: first?.name,
        defaultDepartment: first?.department ?? "foh",
      });
    },
    [data?.staff],
  );

  const handleTimelineResize = useCallback(
    (payload: { shiftId: string; endTime: string }) => {
      updateShift.mutate({ id: payload.shiftId, endTime: payload.endTime });
      return true;
    },
    [updateShift],
  );

  const handleTimelineMove = useCallback(
    (payload: {
      shiftId: string;
      workDate: string;
      startTime: string;
      endTime: string;
    }) => {
      updateShift.mutate({
        id: payload.shiftId,
        workDate: payload.workDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
      });
      return true;
    },
    [updateShift],
  );

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" w="100%">
        <Group
          gap="sm"
          align="center"
          wrap="nowrap"
          w={isNarrow ? "100%" : undefined}
          justify={isNarrow ? "space-between" : undefined}
        >
          <Group gap="sm" align="center" wrap={isNarrow ? "nowrap" : "wrap"}>
            <Title order={2} size="h4">
              Weekly rota
            </Title>
            <Badge
              size="lg"
              radius="xl"
              variant="filled"
              color="saigonGold"
              c="saigonNavy.9"
              styles={{
                root: {
                  backgroundColor: "var(--mantine-color-saigonGold-4)",
                  fontWeight: 700,
                  fontSize: "var(--mantine-font-size-sm)",
                  textTransform: "none",
                  letterSpacing: "0.02em",
                },
              }}
            >
              {formatDayMonth(weekStart)}
            </Badge>
          </Group>
          {isNarrow ? (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="default"
                  size="input-sm"
                  aria-label="Rota options"
                >
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconPrinter size={16} />}
                  onClick={() => window.print()}
                >
                  Print rota
                </Menu.Item>
                <Menu.Item onClick={() => setTemplateModal("save")}>
                  {TEMPLATE_MENU_LABELS.save}
                </Menu.Item>
                <Menu.Item onClick={() => setTemplateModal("apply")}>
                  {TEMPLATE_MENU_LABELS.apply}
                </Menu.Item>
                <Menu.Item onClick={() => setTemplateModal("manage")}>
                  {TEMPLATE_MENU_LABELS.manage}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : null}
        </Group>
        <Group gap="sm" wrap="wrap" w={isNarrow ? "100%" : undefined}>
          <SegmentedControl
            className="toolbar-segmented"
            value={viewMode}
            onChange={(value) => setViewMode(value as "roster" | "timeline")}
            data={[
              {
                value: "roster",
                label: (
                  <Group gap={6} wrap="nowrap" justify="center">
                    <IconLayoutList size={14} />
                    <span>Rota</span>
                  </Group>
                ),
              },
              {
                value: "timeline",
                label: (
                  <Group gap={6} wrap="nowrap" justify="center">
                    <IconTimeline size={14} />
                    <span>Timeline</span>
                  </Group>
                ),
              },
            ]}
          />
          <WeekNavigator weekStart={weekStart} onChange={setWeek} />
          {!isNarrow ? (
            <Button
              variant="default"
              size="sm"
              leftSection={<IconPrinter size={16} />}
              onClick={() => window.print()}
            >
              Print rota
            </Button>
          ) : null}
          {!isNarrow ? (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button
                  variant="default"
                  size="sm"
                  leftSection={<IconTemplate size={16} />}
                  rightSection={<IconChevronDown size={14} />}
                >
                  Templates
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={() => setTemplateModal("save")}>
                  {TEMPLATE_MENU_LABELS.save}
                </Menu.Item>
                <Menu.Item onClick={() => setTemplateModal("apply")}>
                  {TEMPLATE_MENU_LABELS.apply}
                </Menu.Item>
                <Menu.Item onClick={() => setTemplateModal("manage")}>
                  {TEMPLATE_MENU_LABELS.manage}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : null}
        </Group>
      </Group>

      <RosterTemplatesModal
        mode={templateModal}
        onClose={() => setTemplateModal(null)}
        weekStart={weekStart}
      />

      {coverageGapCount > 0 ? (
        <Alert color="orange" title="Coverage needed">
          {coverageGapCount} template shift block
          {coverageGapCount === 1 ? " was" : "s were"} not put on the rota because staff were
          off. Assign another team member on the days marked below.
        </Alert>
      ) : null}

      {viewMode === "timeline" && data ? (
        <Stack gap="sm">
          {isNarrow ? (
            <WeekDaySegmentedControl
              dates={data.dates}
              dayIndex={mobileDayIndex}
              onDayIndexChange={setMobileDayIndex}
            />
          ) : null}
          <ScheduleTimelineView
            dates={
              isNarrow
                ? data.dates[mobileDayIndex]
                  ? [data.dates[mobileDayIndex]]
                  : data.dates.slice(0, 1)
                : data.dates
            }
            staff={data.staff}
            shifts={data.shifts}
            operatingHoursByDay={data.operatingHoursByDay}
            onRemoveShift={(id) => removeShift.mutate({ id })}
            onCreateRange={handleTimelineCreate}
            onResizeEnd={handleTimelineResize}
            onMoveEnd={handleTimelineMove}
            onDragControls={({ resetDrag }) => {
              timelineResetDragRef.current = resetDrag;
            }}
          />
        </Stack>
      ) : null}

      {viewMode === "roster" && data && isNarrow ? (
        <div className="no-print">
        <RosterDayView
          dates={data.dates}
          dayIndex={mobileDayIndex}
          onDayIndexChange={setMobileDayIndex}
          staff={data.staff}
          shifts={data.shifts}
          operatingHoursByDay={data.operatingHoursByDay}
          holidayKeySet={holidayKeySet}
          coverageGaps={coverageGapsByDate.get(data.dates[mobileDayIndex] ?? "") ?? []}
          onAddShift={({ staffMemberId, staffName, workDate, defaultDepartment, startTime: open, endTime: close }) => {
            setModal({
              staffMemberId,
              staffName,
              workDate,
              defaultDepartment,
            });
            setStartTime(open);
            setEndTime(close);
            setDepartment(defaultDepartment);
          }}
          onRemoveShift={(id) => removeShift.mutate({ id })}
          onLogShift={(shift) => {
            const params = buildTimeLogPrefillSearchParams({
              staffMemberId: shift.staffMemberId,
              workDate: shift.workDate,
              startTime: shift.startTime,
              endTime: shift.endTime,
              weekStart: weekStartForIsoDate(shift.workDate),
            });
            navigate(`/time-logs?${params.toString()}`);
          }}
        />
        </div>
      ) : null}

      {viewMode === "roster" ? (
      <ScrollArea
        className={isNarrow ? "rota-week-print rota-week-print--screen-hidden" : "rota-week-print"}
      >
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
                    <Text size="xs" c="dimmed">
                      Usual: {member.department === "foh" ? "FOH" : "Kitchen"}
                    </Text>
                  </Stack>
                </Table.Td>
                {data?.dates.map((iso) => {
                  const shifts = (data.shifts ?? []).filter(
                    (shift) =>
                      shift.staffMemberId === member.id && shift.workDate === iso,
                  );
                  const dayPeriods = data?.operatingHoursByDay[iso] ?? [];
                  const dayIsOpen = dayPeriods.length > 0;
                  const onHoliday = holidayKeySet.has(`${member.id}:${iso}`);
                  return (
                    <Table.Td key={iso} style={{ verticalAlign: "top" }}>
                      <Stack gap={6}>
                        {shifts.map((shift) => (
                          <Paper key={shift.id} withBorder p={6} radius="sm">
                            <Group justify="space-between" wrap="nowrap" gap={4}>
                              <Stack gap={2}>
                                <Text size="xs" fw={600}>
                                  {formatTimeRange(shift.startTime, shift.endTime)}
                                </Text>
                                <AreaBadge department={shift.department} />
                              </Stack>
                              <Group gap={2} wrap="nowrap">
                                <ActionIcon
                                  size="xs"
                                  variant="subtle"
                                  color="gray"
                                  aria-label="Log time for this shift"
                                  onClick={() => {
                                    const params = buildTimeLogPrefillSearchParams({
                                      staffMemberId: shift.staffMemberId,
                                      workDate: shift.workDate,
                                      startTime: shift.startTime,
                                      endTime: shift.endTime,
                                      weekStart: weekStartForIsoDate(shift.workDate),
                                    });
                                    navigate(`/time-logs?${params.toString()}`);
                                  }}
                                >
                                  <IconClock size={12} />
                                </ActionIcon>
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
                            </Group>
                          </Paper>
                        ))}
                        {onHoliday ? (
                          <Text size="xs" c="dimmed" ta="center">
                            Off
                          </Text>
                        ) : dayIsOpen ? (
                          <Group justify="center">
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="gray"
                              aria-label="Add block"
                              onClick={() => {
                                const first = dayPeriods[0];
                                setModal({
                                  staffMemberId: member.id,
                                  staffName: member.name,
                                  workDate: iso,
                                  defaultDepartment: member.department,
                                });
                                setStartTime(first.openTime);
                                setEndTime(first.closeTime);
                                setDepartment(member.department);
                              }}
                            >
                              <IconPlus size={14} />
                            </ActionIcon>
                          </Group>
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
            {coverageGapCount > 0 ? (
              <Table.Tr>
                <Table.Td>
                  <Text size="sm" fw={600} c="orange">
                    Coverage needed
                  </Text>
                  <Text size="xs" c="dimmed">
                    Another team member may be required
                  </Text>
                </Table.Td>
                {data?.dates.map((iso) => {
                  const gaps = coverageGapsByDate.get(iso) ?? [];
                  return (
                    <Table.Td key={iso} style={{ verticalAlign: "top" }}>
                      <Stack gap={6}>
                        {gaps.map((gap) => (
                          <Paper
                            key={gap.id}
                            withBorder
                            p={6}
                            radius="sm"
                            style={{
                              borderColor: "var(--mantine-color-orange-4)",
                            }}
                          >
                            <Stack gap={4}>
                              <Text size="xs" fw={600}>
                                {formatTimeRange(gap.startTime, gap.endTime)}
                              </Text>
                              <AreaBadge department={gap.department} />
                              <Text size="xs" c="dimmed">
                                {gap.absentStaffName} off — add cover
                              </Text>
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      ) : null}

      <Modal
        opened={modal !== null}
        onClose={() => setModal(null)}
        title={
          modal?.pickStaff
            ? "New shift"
            : modal
              ? `Shift · ${modal.staffName}`
              : "Shift"
        }
      >
        {modal ? (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {formatShortDate(modal.workDate)}
            </Text>
            {modal.pickStaff ? (
              <Select
                label="Staff"
                placeholder="Choose staff"
                data={(data?.staff ?? []).map((member) => ({
                  value: member.id,
                  label: member.name,
                }))}
                value={modal.staffMemberId ?? null}
                onChange={(id) => {
                  const member = data?.staff.find((row) => row.id === id);
                  if (!member) return;
                  setModal({
                    ...modal,
                    staffMemberId: member.id,
                    staffName: member.name,
                    defaultDepartment: member.department,
                  });
                  setDepartment(member.department);
                }}
              />
            ) : null}
            <Select
              label="Start"
              data={startTimeOptions}
              value={startTime}
              onChange={(v) => setStartTime(v ?? startTime)}
              searchable
            />
            <Select
              label="End"
              data={endTimeOptions}
              value={endTime}
              onChange={(v) => setEndTime(v ?? endTime)}
              searchable
            />
            <Select
              label="Area for this block"
              description={`Usual area is ${modal.defaultDepartment === "foh" ? "front of house" : "kitchen"}`}
              data={[
                { value: "foh", label: "Front of house" },
                { value: "kitchen", label: "Kitchen" },
              ]}
              value={department}
              onChange={(value) => {
                if (value === "foh" || value === "kitchen") setDepartment(value);
              }}
            />
            <Button
              disabled={modal.pickStaff && !modal.staffMemberId}
              onClick={() => {
                if (!modal.staffMemberId) return;
                assignShift.mutate(
                  {
                    staffMemberId: modal.staffMemberId,
                    workDate: modal.workDate,
                    startTime,
                    endTime,
                    department,
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