import { SegmentedControl } from "@mantine/core";
import { DAY_LABELS } from "../../shared/lib/week";

export function WeekDaySegmentedControl({
  dates,
  dayIndex,
  onDayIndexChange,
}: {
  dates: string[];
  dayIndex: number;
  onDayIndexChange: (index: number) => void;
}) {
  return (
    <SegmentedControl
      className="toolbar-segmented roster-day-picker"
      fullWidth
      size="xs"
      value={String(dayIndex)}
      onChange={(value) => onDayIndexChange(Number(value))}
      data={dates.map((_, index) => ({
        value: String(index),
        label: DAY_LABELS[index],
      }))}
    />
  );
}