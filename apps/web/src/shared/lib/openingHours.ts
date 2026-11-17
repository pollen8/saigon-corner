import { parseTimeToMinutes, TIME_SNAP_MINUTES } from "./time";
import { TIME_OPTIONS } from "./timeOptions";

export type OpeningPeriod = {
  openTime: string;
  closeTime: string;
};

export function shiftFitsOpeningHours(
  periods: OpeningPeriod[],
  startTime: string,
  endTime: string,
): boolean {
  if (periods.length === 0) return false;
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (end <= start) return false;
  return periods.some((period) => {
    const open = parseTimeToMinutes(period.openTime);
    const close = parseTimeToMinutes(period.closeTime);
    return start >= open && end <= close;
  });
}

export function isValidShiftStart(
  periods: OpeningPeriod[],
  startTime: string,
  minDurationMinutes = TIME_SNAP_MINUTES,
): boolean {
  if (periods.length === 0) return false;
  const start = parseTimeToMinutes(startTime);
  return periods.some((period) => {
    const open = parseTimeToMinutes(period.openTime);
    const close = parseTimeToMinutes(period.closeTime);
    return start >= open && start + minDurationMinutes <= close;
  });
}

export function isValidShiftEnd(
  periods: OpeningPeriod[],
  startTime: string,
  endTime: string,
): boolean {
  return shiftFitsOpeningHours(periods, startTime, endTime);
}

export function minuteIsWithinOpening(
  minute: number,
  periods: OpeningPeriod[],
): boolean {
  return periods.some((period) => {
    const open = parseTimeToMinutes(period.openTime);
    const close = parseTimeToMinutes(period.closeTime);
    return minute >= open && minute < close;
  });
}

export function closedIntervalsInRange(
  periods: OpeningPeriod[],
  rangeStart: number,
  rangeEnd: number,
): Array<{ start: number; end: number }> {
  if (rangeEnd <= rangeStart) return [];
  if (periods.length === 0) {
    return [{ start: rangeStart, end: rangeEnd }];
  }

  const open = periods
    .map((period) => ({
      start: parseTimeToMinutes(period.openTime),
      end: parseTimeToMinutes(period.closeTime),
    }))
    .filter((interval) => interval.end > rangeStart && interval.start < rangeEnd)
    .map((interval) => ({
      start: Math.max(interval.start, rangeStart),
      end: Math.min(interval.end, rangeEnd),
    }))
    .sort((a, b) => a.start - b.start);

  const merged: typeof open = [];
  for (const interval of open) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  const closed: Array<{ start: number; end: number }> = [];
  let cursor = rangeStart;
  for (const interval of merged) {
    if (interval.start > cursor) {
      closed.push({ start: cursor, end: interval.start });
    }
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < rangeEnd) {
    closed.push({ start: cursor, end: rangeEnd });
  }
  return closed;
}

export function startTimeSelectOptions(periods: OpeningPeriod[]) {
  return TIME_OPTIONS.map((option) => ({
    ...option,
    disabled:
      periods.length === 0 || !isValidShiftStart(periods, option.value),
  }));
}

export function endTimeSelectOptions(
  periods: OpeningPeriod[],
  startTime: string,
) {
  return TIME_OPTIONS.map((option) => ({
    ...option,
    disabled:
      periods.length === 0 ||
      !isValidShiftEnd(periods, startTime, option.value),
  }));
}

export function firstValidEndTime(
  periods: OpeningPeriod[],
  startTime: string,
): string | undefined {
  return endTimeSelectOptions(periods, startTime).find(
    (option) => !option.disabled,
  )?.value;
}