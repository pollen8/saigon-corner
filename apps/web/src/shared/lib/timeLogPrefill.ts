export const TIME_LOG_PREFILL_KEYS = [
  "staffMemberId",
  "workDate",
  "startTime",
  "endTime",
] as const;

export function buildTimeLogPrefillSearchParams(shift: {
  staffMemberId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  weekStart: string;
}): URLSearchParams {
  const params = new URLSearchParams({
    week: shift.weekStart,
    staffMemberId: shift.staffMemberId,
    workDate: shift.workDate,
    startTime: shift.startTime,
    endTime: shift.endTime,
  });
  return params;
}

export function readTimeLogPrefill(searchParams: URLSearchParams): {
  staffMemberId: string | null;
  workDate: string | null;
  startTime: string | null;
  endTime: string | null;
} {
  return {
    staffMemberId: searchParams.get("staffMemberId"),
    workDate: searchParams.get("workDate"),
    startTime: searchParams.get("startTime"),
    endTime: searchParams.get("endTime"),
  };
}