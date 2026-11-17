function timeOptionsFrom(startMinutes: number, stepMinutes: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const totalMinutes = startMinutes + index * stepMinutes;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    return { value: `${label}:00`, label };
  });
}

/** 06:00–29:30 in 30-minute steps (roster / opening hours). */
export const TIME_OPTIONS = timeOptionsFrom(6 * 60, 30, 48);

/** 00:00–23:45 in 15-minute steps (actual hours). */
export const TIME_LOG_OPTIONS = timeOptionsFrom(0, 15, 96);
