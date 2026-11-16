const DAY_MS = 24 * 60 * 60 * 1000;

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const weekday = d.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  d.setDate(d.getDate() + offset);
  return d;
}

export function currentWeekStartIso(): string {
  return formatIsoDate(startOfWeekMonday(new Date()));
}

export function shiftWeek(isoMonday: string, deltaWeeks: number): string {
  const [y, m, d] = isoMonday.split("-").map(Number);
  const monday = new Date(y, m - 1, d);
  monday.setDate(monday.getDate() + deltaWeeks * 7);
  return formatIsoDate(monday);
}

export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatTimeRange(start: string, end: string): string {
  return `${start.slice(0, 5)}–${end.slice(0, 5)}`;
}

export function totalHoursFromRanges(
  ranges: { startTime: string; endTime: string }[],
): number {
  let minutes = 0;
  for (const range of ranges) {
    const [sh, sm] = range.startTime.slice(0, 5).split(":").map(Number);
    const [eh, em] = range.endTime.slice(0, 5).split(":").map(Number);
    minutes += eh * 60 + em - (sh * 60 + sm);
  }
  return Math.round((minutes / 60) * 10) / 10;
}