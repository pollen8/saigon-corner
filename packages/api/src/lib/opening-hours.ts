import { timeToMinutes } from "./dates.js";

export type OpeningPeriod = {
  openTime: string;
  closeTime: string;
};

export function shiftWithinOpeningHours(
  periods: OpeningPeriod[],
  startTime: string,
  endTime: string,
): boolean {
  if (periods.length === 0) return false;
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (end <= start) return false;

  return periods.some((period) => {
    const open = timeToMinutes(period.openTime);
    const close = timeToMinutes(period.closeTime);
    return start >= open && end <= close;
  });
}

export function openingHoursMessage(periods: OpeningPeriod[]): string {
  if (periods.length === 0) {
    return "This day is closed. Add opening hours before scheduling staff.";
  }
  return "Shift must fall entirely within an opening hours window.";
}