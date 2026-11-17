/** Minutes from midnight for `HH:MM` or `HH:MM:SS`. */
export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export function formatHourLabel(minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60);
  return `${String(h).padStart(2, "0")}:00`;
}

export const TIMELINE_HOUR_REM = 2;

export const TIME_SNAP_MINUTES = 30;

export function snapMinutes(
  minutes: number,
  step = TIME_SNAP_MINUTES,
): number {
  return Math.round(minutes / step) * step;
}

export function minutesToTimeValue(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, minutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}