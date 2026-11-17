import { Button } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { currentWeekStartIso, shiftWeek } from "../lib/week";

export function WeekNavigator({
  weekStart,
  onChange,
}: {
  weekStart: string;
  onChange: (weekStart: string) => void;
}) {
  return (
    <Button.Group>
      <Button
        variant="default"
        size="sm"
        px={10}
        aria-label="Previous week"
        onClick={() => onChange(shiftWeek(weekStart, -1))}
      >
        <IconChevronLeft size={16} />
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={() => onChange(currentWeekStartIso())}
      >
        This week
      </Button>
      <Button
        variant="default"
        size="sm"
        px={10}
        aria-label="Next week"
        onClick={() => onChange(shiftWeek(weekStart, 1))}
      >
        <IconChevronRight size={16} />
      </Button>
    </Button.Group>
  );
}
