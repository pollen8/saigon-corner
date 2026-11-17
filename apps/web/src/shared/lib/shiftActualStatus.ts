import { parseTimeToMinutes } from "./time";

export type ShiftActualStatus = "upcoming" | "success" | "fail";

function normalizeWorkDate(workDate: string | Date): string {
  if (workDate instanceof Date) {
    const y = workDate.getFullYear();
    const m = String(workDate.getMonth() + 1).padStart(2, "0");
    const d = String(workDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(workDate).slice(0, 10);
}

function normalizeTime(time: string): string {
  return time.slice(0, 5);
}

export function isScheduledShiftPast(
  workDate: string,
  endTime: string,
  now: Date = new Date(),
): boolean {
  const [y, m, d] = workDate.split("-").map(Number);
  const [eh, em] = normalizeTime(endTime).split(":").map(Number);
  const shiftEnd = new Date(y, m - 1, d, eh, em, 0, 0);
  return shiftEnd.getTime() < now.getTime();
}

type TimeRange = {
  workDate: string | Date;
  startTime: string;
  endTime: string;
};

export function shiftActualStatus(
  shift: TimeRange,
  actualLogs: TimeRange[],
  now: Date = new Date(),
): ShiftActualStatus {
  const workDate = normalizeWorkDate(shift.workDate);
  if (!isScheduledShiftPast(workDate, shift.endTime, now)) {
    return "upcoming";
  }

  const dayLogs = actualLogs.filter(
    (log) => normalizeWorkDate(log.workDate) === workDate,
  );

  const exact = dayLogs.find(
    (log) =>
      normalizeTime(log.startTime) === normalizeTime(shift.startTime) &&
      normalizeTime(log.endTime) === normalizeTime(shift.endTime),
  );
  if (exact) return "success";

  return "fail";
}

/** Log on the same day that overlaps the scheduled block, if any (for mismatch hint). */
export function overlappingActualLog(
  shift: TimeRange,
  actualLogs: TimeRange[],
): TimeRange | undefined {
  const workDate = normalizeWorkDate(shift.workDate);
  const dayLogs = actualLogs.filter(
    (log) => normalizeWorkDate(log.workDate) === workDate,
  );
  const s0 = parseTimeToMinutes(shift.startTime);
  const s1 = parseTimeToMinutes(shift.endTime);
  return dayLogs.find((log) => {
    const l0 = parseTimeToMinutes(log.startTime);
    const l1 = parseTimeToMinutes(log.endTime);
    return l0 < s1 && s0 < l1;
  });
}