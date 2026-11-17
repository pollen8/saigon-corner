import {
  ActionIcon,
  Box,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useCallback, useEffect } from "react";
import {
  DAY_LABELS,
  formatShortDate,
  formatTimeRange,
} from "../../shared/lib/week";
import {
  formatHourLabel,
  minutesToTimeValue,
  parseTimeToMinutes,
  TIMELINE_HOUR_REM,
} from "../../shared/lib/time";
import {
  closedIntervalsInRange,
  minuteIsWithinOpening,
  shiftFitsOpeningHours,
} from "../../shared/lib/openingHours";
import { useTimelineDrag } from "./useTimelineDrag";

type StaffRow = { id: string; name: string; department: "foh" | "kitchen" };
type ShiftRow = {
  id: string;
  staffMemberId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  department: "foh" | "kitchen";
};
type PeriodRow = { id: string; openTime: string; closeTime: string };

const GRID_LINE_COLOR = "var(--app-schedule-grid-line)";
const GRID_BORDER = `1px solid ${GRID_LINE_COLOR}`;

function hourGridBackground(): string {
  const step = `calc(${TIMELINE_HOUR_REM}rem * var(--mantine-scale))`;
  return `repeating-linear-gradient(
    to bottom,
    transparent,
    transparent calc(${step} - 1px),
    ${GRID_LINE_COLOR} calc(${step} - 1px),
    ${GRID_LINE_COLOR} ${step}
  )`;
}

function computeTimelineBounds(
  dates: string[],
  operatingHoursByDay: Record<string, PeriodRow[]>,
  shifts: ShiftRow[],
): { startMinutes: number; endMinutes: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const iso of dates) {
    for (const period of operatingHoursByDay[iso] ?? []) {
      min = Math.min(min, parseTimeToMinutes(period.openTime));
      max = Math.max(max, parseTimeToMinutes(period.closeTime));
    }
  }
  for (const shift of shifts) {
    min = Math.min(min, parseTimeToMinutes(shift.startTime));
    max = Math.max(max, parseTimeToMinutes(shift.endTime));
  }

  if (!Number.isFinite(min)) {
    return { startMinutes: 8 * 60, endMinutes: 18 * 60 };
  }

  const startMinutes = Math.floor(min / 60) * 60;
  const endMinutes = Math.ceil(max / 60) * 60;
  return {
    startMinutes,
    endMinutes: Math.max(endMinutes, startMinutes + 60),
  };
}

function minutesToHeightRem(durationMinutes: number): number {
  return (durationMinutes / 60) * TIMELINE_HOUR_REM;
}

function layoutDayLanes(shifts: ShiftRow[]) {
  const sorted = [...shifts].sort(
    (a, b) =>
      parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime),
  );
  const laneEnds: number[] = [];
  const placed: { shift: ShiftRow; lane: number }[] = [];

  for (const shift of sorted) {
    const start = parseTimeToMinutes(shift.startTime);
    const end = parseTimeToMinutes(shift.endTime);
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = end;
    placed.push({ shift, lane });
  }

  const laneCount = Math.max(1, laneEnds.length);
  return placed.map((item) => ({ ...item, laneCount }));
}

export function ScheduleTimelineView({
  dates,
  staff,
  shifts,
  operatingHoursByDay,
  onRemoveShift,
  onCreateRange,
  onResizeEnd,
  onMoveEnd,
  onDragControls,
}: {
  dates: string[];
  staff: StaffRow[];
  shifts: ShiftRow[];
  operatingHoursByDay: Record<string, PeriodRow[]>;
  onRemoveShift: (id: string) => void;
  onCreateRange: (payload: {
    workDate: string;
    startTime: string;
    endTime: string;
  }) => void;
  onResizeEnd: (payload: { shiftId: string; endTime: string }) => void;
  onMoveEnd: (payload: {
    shiftId: string;
    workDate: string;
    startTime: string;
    endTime: string;
  }) => void;
  onDragControls?: (controls: { resetDrag: () => void }) => void;
}) {
  const staffById = new Map(staff.map((member) => [member.id, member]));
  const { startMinutes, endMinutes } = computeTimelineBounds(
    dates,
    operatingHoursByDay,
    shifts,
  );
  const hourMarks: number[] = [];
  for (let m = startMinutes; m < endMinutes; m += 60) {
    hourMarks.push(m);
  }

  const hourRow = `calc(${TIMELINE_HOUR_REM}rem * var(--mantine-scale))`;

  const handleCreateRange = useCallback(
    (payload: { workDate: string; startTime: string; endTime: string }) => {
      const periods = operatingHoursByDay[payload.workDate] ?? [];
      if (!shiftFitsOpeningHours(periods, payload.startTime, payload.endTime)) {
        return;
      }
      onCreateRange(payload);
    },
    [onCreateRange, operatingHoursByDay],
  );

  const handleMoveEnd = useCallback(
    (payload: {
      shiftId: string;
      workDate: string;
      startTime: string;
      endTime: string;
    }) => {
      const periods = operatingHoursByDay[payload.workDate] ?? [];
      if (
        periods.length === 0 ||
        !shiftFitsOpeningHours(periods, payload.startTime, payload.endTime)
      ) {
        return false;
      }
      onMoveEnd(payload);
      return true;
    },
    [onMoveEnd, operatingHoursByDay],
  );

  const {
    createDrag,
    resizeDrag,
    moveDrag,
    setColumnRef,
    beginCreate,
    beginResize,
    beginMove,
    resetDrag,
  } = useTimelineDrag({
    rangeStartMinutes: startMinutes,
    rangeEndMinutes: endMinutes,
    shifts,
    onCreateRange: handleCreateRange,
    onResizeEnd,
    onMoveEnd: handleMoveEnd,
  });

  useEffect(() => {
    onDragControls?.({ resetDrag });
  }, [onDragControls, resetDrag]);

  const renderCreatePreview = useCallback(
    (workDate: string) => {
      if (!createDrag || createDrag.workDate !== workDate) return null;
      const start = Math.min(
        createDrag.anchorMinutes,
        createDrag.currentMinutes,
      );
      const end = Math.max(createDrag.anchorMinutes, createDrag.currentMinutes);
      const topRem = minutesToHeightRem(start - startMinutes);
      const heightRem = minutesToHeightRem(Math.max(end - start, 0));
      return (
        <Box
          pos="absolute"
          left={4}
          right={4}
          style={{
            top: `calc(${topRem}rem * var(--mantine-scale))`,
            height: `calc(${Math.max(heightRem, 0.5)}rem * var(--mantine-scale))`,
            zIndex: 2,
            pointerEvents: "none",
            borderRadius: 4,
            border: "1px dashed var(--mantine-color-teal-6)",
            background: "rgba(53, 82, 100, 0.15)",
          }}
        />
      );
    },
    [createDrag, startMinutes],
  );

  const renderMovePreview = useCallback(
    (workDate: string) => {
      if (!moveDrag || moveDrag.workDate !== workDate) return null;
      const shift = shifts.find((row) => row.id === moveDrag.shiftId);
      if (!shift) return null;
      const member = staffById.get(shift.staffMemberId);
      const topRem = minutesToHeightRem(moveDrag.startMinutes - startMinutes);
      const heightRem = minutesToHeightRem(moveDrag.durationMinutes);
      const kitchen = shift.department === "kitchen";
      const endTime = minutesToTimeValue(
        moveDrag.startMinutes + moveDrag.durationMinutes,
      );

      return (
        <Box
          pos="absolute"
          left={4}
          right={4}
          style={{
            top: `calc(${topRem}rem * var(--mantine-scale))`,
            height: `calc(${Math.max(heightRem, 1.25)}rem * var(--mantine-scale))`,
            zIndex: 4,
            pointerEvents: "none",
            opacity: 0.92,
          }}
        >
          <Box
            h="100%"
            p={4}
            style={{
              borderRadius: 4,
              border: "2px dashed var(--mantine-color-teal-6)",
              background: kitchen
                ? "var(--mantine-color-saigonNavy-7)"
                : "var(--mantine-color-saigonNavy-0)",
              color: kitchen
                ? "var(--mantine-color-white)"
                : "var(--mantine-color-saigonNavy-9)",
              overflow: "hidden",
              boxShadow: "var(--mantine-shadow-sm)",
            }}
          >
            <Text size="xs" fw={600} lineClamp={2}>
              {member?.name ?? "Staff"}
            </Text>
            {heightRem >= 1.75 ? (
              <Text
                size="xs"
                c={kitchen ? "gray.1" : "dimmed"}
                style={{ fontSize: 10 }}
              >
                {formatTimeRange(
                  minutesToTimeValue(moveDrag.startMinutes),
                  endTime,
                )}
              </Text>
            ) : null}
          </Box>
        </Box>
      );
    },
    [moveDrag, shifts, staffById, startMinutes],
  );

  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed">
        Drag on an open day to add a shift. Drag a block to move it (including
        across days). Use the bottom-right corner to change its end time.
      </Text>
      <ScrollArea>
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: `4.5rem repeat(${dates.length}, minmax(${dates.length === 1 ? "0" : "7rem"}, 1fr))`,
            gridTemplateRows: `auto repeat(${hourMarks.length}, ${hourRow})`,
            minWidth: dates.length === 1 ? undefined : 900,
            width: dates.length === 1 ? "100%" : undefined,
            border: GRID_BORDER,
          }}
        >
          <Box
            style={{
              gridColumn: 1,
              gridRow: 1,
              padding: "var(--mantine-spacing-xs) var(--mantine-spacing-sm)",
              borderRight: GRID_BORDER,
              borderBottom: GRID_BORDER,
              alignSelf: "stretch",
            }}
          >
            <Text size="sm" fw={600}>
              Time
            </Text>
          </Box>

          {dates.map((iso, index) => (
            <Box
              key={`head-${iso}`}
              style={{
                gridColumn: index + 2,
                gridRow: 1,
                padding: "var(--mantine-spacing-xs) var(--mantine-spacing-sm)",
                borderRight: index === dates.length - 1 ? undefined : GRID_BORDER,
                borderBottom: GRID_BORDER,
              }}
            >
              <Text size="sm" fw={600}>
                {DAY_LABELS[index]}
              </Text>
              <Text size="xs" c="dimmed">
                {formatShortDate(iso)}
              </Text>
              {(operatingHoursByDay[iso] ?? []).map((period) => (
                <Text key={period.id} size="xs" c="teal">
                  {formatTimeRange(period.openTime, period.closeTime)}
                </Text>
              ))}
            </Box>
          ))}

          {hourMarks.map((mark, rowIndex) => (
            <Box
              key={`time-${mark}`}
              style={{
                gridColumn: 1,
                gridRow: rowIndex + 2,
                borderRight: GRID_BORDER,
                borderTop: GRID_BORDER,
                padding: "2px 6px 0",
                lineHeight: 1,
              }}
            >
              <Text size="xs" c="dimmed" ff="monospace">
                {formatHourLabel(mark)}
              </Text>
            </Box>
          ))}

          {dates.map((iso, dayIndex) => {
            const dayShifts = shifts.filter((s) => s.workDate === iso);
            const layout = layoutDayLanes(dayShifts);
            const dayOpen = (operatingHoursByDay[iso] ?? []).length > 0;

            const periods = operatingHoursByDay[iso] ?? [];
            const closedBands = closedIntervalsInRange(
              periods,
              startMinutes,
              endMinutes,
            );

            return (
              <Box
                key={`day-${iso}`}
                ref={(node) => setColumnRef(iso, node)}
                pos="relative"
                style={{
                  gridColumn: dayIndex + 2,
                  gridRow: `2 / ${hourMarks.length + 2}`,
                  borderRight:
                    dayIndex === dates.length - 1 ? undefined : GRID_BORDER,
                  background: dayOpen
                    ? undefined
                    : "var(--app-schedule-closed-band)",
                  overflow: "hidden",
                }}
              >
                <Box
                  pos="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  style={{
                    pointerEvents: "none",
                    zIndex: 0,
                    backgroundImage: hourGridBackground(),
                  }}
                />

                {closedBands.map((band) => {
                  const topRem = minutesToHeightRem(band.start - startMinutes);
                  const heightRem = minutesToHeightRem(band.end - band.start);
                  return (
                    <Box
                      key={`${iso}-${band.start}-${band.end}`}
                      pos="absolute"
                      left={0}
                      right={0}
                      style={{
                        top: `calc(${topRem}rem * var(--mantine-scale))`,
                        height: `calc(${heightRem}rem * var(--mantine-scale))`,
                        zIndex: 0.5,
                        pointerEvents: "none",
                        background: "var(--app-schedule-closed-band)",
                      }}
                    />
                  );
                })}

                {dayOpen ? (
                  <Box
                    pos="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    style={{ zIndex: 1, cursor: "crosshair" }}
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;
                      const column = event.currentTarget.parentElement;
                      if (!column) return;
                      const rect = column.getBoundingClientRect();
                      if (rect.height <= 0) return;
                      const ratio = Math.min(
                        1,
                        Math.max(0, (event.clientY - rect.top) / rect.height),
                      );
                      const minute =
                        startMinutes + ratio * (endMinutes - startMinutes);
                      if (!minuteIsWithinOpening(minute, periods)) {
                        return;
                      }
                      beginCreate(iso, event.clientY);
                    }}
                  />
                ) : null}

                {renderCreatePreview(iso)}
                {renderMovePreview(iso)}

                {layout.map(({ shift, lane, laneCount }) => {
                  if (moveDrag?.shiftId === shift.id) {
                    return null;
                  }
                  const member = staffById.get(shift.staffMemberId);
                  const shiftStart = parseTimeToMinutes(shift.startTime);
                  const shiftEnd =
                    resizeDrag?.shiftId === shift.id
                      ? resizeDrag.currentMinutes
                      : parseTimeToMinutes(shift.endTime);
                  const offsetMinutes = shiftStart - startMinutes;
                  const durationMinutes = shiftEnd - shiftStart;
                  const topRem = minutesToHeightRem(offsetMinutes);
                  const heightRem = minutesToHeightRem(durationMinutes);
                  const gap = 2;
                  const widthPct = 100 / laneCount;
                  const leftPct = lane * widthPct;
                  const kitchen = shift.department === "kitchen";
                  const endTimeStr =
                    resizeDrag?.shiftId === shift.id
                      ? minutesToTimeValue(shiftEnd)
                      : shift.endTime;

                  return (
                    <Box
                      key={shift.id}
                      pos="absolute"
                      style={{
                        top: `calc(${topRem}rem * var(--mantine-scale))`,
                        height: `calc(${Math.max(heightRem, 1.25)}rem * var(--mantine-scale))`,
                        left: `calc(${leftPct}% + ${gap}px)`,
                        width: `calc(${widthPct}% - ${gap * 2}px)`,
                        boxSizing: "border-box",
                        zIndex: 3,
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <Box
                        h="100%"
                        p={4}
                        pos="relative"
                        style={{
                          borderRadius: 4,
                          border: "1px solid var(--mantine-color-saigonNavy-3)",
                          background: kitchen
                            ? "var(--mantine-color-saigonNavy-7)"
                            : "var(--mantine-color-saigonNavy-0)",
                          color: kitchen
                            ? "var(--mantine-color-white)"
                            : "var(--mantine-color-saigonNavy-9)",
                          overflow: "hidden",
                          cursor: "grab",
                          touchAction: "none",
                        }}
                        onPointerDown={(event) => {
                          if (event.button !== 0) return;
                          beginMove(shift, iso, event.clientX, event.clientY);
                        }}
                      >
                        <Box
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 2,
                            alignItems: "flex-start",
                          }}
                        >
                          <Text size="xs" fw={600} lineClamp={2}>
                            {member?.name ?? "Staff"}
                          </Text>
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            color={kitchen ? "gray" : "red"}
                            aria-label="Remove shift"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={() => onRemoveShift(shift.id)}
                            style={{
                              flexShrink: 0,
                              color: kitchen
                                ? "rgba(255,255,255,0.85)"
                                : undefined,
                            }}
                          >
                            <IconTrash size={12} />
                          </ActionIcon>
                        </Box>
                        {heightRem >= 1.75 ? (
                          <Text
                            size="xs"
                            c={kitchen ? "gray.1" : "dimmed"}
                            style={{ fontSize: 10 }}
                          >
                            {formatTimeRange(shift.startTime, endTimeStr)}
                          </Text>
                        ) : null}
                        <Box
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            if (event.button !== 0) return;
                            beginResize(shift, iso, event.clientY);
                          }}
                          style={{
                            position: "absolute",
                            right: 0,
                            bottom: 0,
                            width: 14,
                            height: 14,
                            cursor: "ns-resize",
                            touchAction: "none",
                          }}
                          aria-label="Resize shift end time"
                        >
                          <Box
                            style={{
                              position: "absolute",
                              right: 2,
                              bottom: 2,
                              width: 8,
                              height: 8,
                              borderRight: `2px solid ${kitchen ? "rgba(255,255,255,0.7)" : "var(--mantine-color-saigonNavy-5)"}`,
                              borderBottom: `2px solid ${kitchen ? "rgba(255,255,255,0.7)" : "var(--mantine-color-saigonNavy-5)"}`,
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                  );
                })}

                {!dayOpen ? (
                  <Text
                    size="xs"
                    c="dimmed"
                    ta="center"
                    mt="md"
                    style={{ pointerEvents: "none" }}
                  >
                    Closed
                  </Text>
                ) : null}
              </Box>
            );
          })}
        </Box>
      </ScrollArea>
    </Stack>
  );
}