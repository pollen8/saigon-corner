const DAY_MS = 24 * 60 * 60 * 1000;

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Monday of the week containing `date` (local time). */
export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const weekday = d.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  d.setDate(d.getDate() + offset);
  return d;
}

export function weekDatesFromMonday(monday: Date): string[] {
  const start = startOfWeekMonday(monday);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start.getTime() + index * DAY_MS);
    return formatIsoDate(day);
  });
}

export function dayOfWeekFromIso(iso: string): number {
  const date = parseIsoDate(iso);
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

/** Inclusive list of ISO dates from `startIso` through `endIso`. */
export function eachIsoDateInRange(startIso: string, endIso: string): string[] {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (end < start) {
    return [];
  }
  const dates: string[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(formatIsoDate(cursor));
  }
  return dates;
}

export function timeToMinutes(value: string): number {
  const [h, m] = value.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export function minutesToDuration(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start);
}

/** True if ranges overlap in time. Adjacent blocks (one ends when the other starts) do not overlap. */
export function timeRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA);
}