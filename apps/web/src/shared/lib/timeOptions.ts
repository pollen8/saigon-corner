export const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const totalMinutes = 6 * 60 + index * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return { value: `${label}:00`, label };
});