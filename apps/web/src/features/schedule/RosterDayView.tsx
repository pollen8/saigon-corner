import { ActionIcon, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { IconClock, IconPlus, IconTrash } from "@tabler/icons-react";
import { DAY_LABELS, formatShortDate, formatTimeRange } from "../../shared/lib/week";
import { AreaBadge } from "../../shared/ui/AreaBadge";
import { WeekDaySegmentedControl } from "./WeekDaySegmentedControl";

type StaffMember = {
  id: string;
  name: string;
  department: "foh" | "kitchen";
};

type ShiftRow = {
  id: string;
  staffMemberId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  department: "foh" | "kitchen";
};

type PeriodRow = { id: string; openTime: string; closeTime: string };

type CoverageGap = {
  id: string;
  workDate: string;
  startTime: string;
  endTime: string;
  department: "foh" | "kitchen";
  absentStaffName: string;
};

export function RosterDayView({
  dates,
  dayIndex,
  onDayIndexChange,
  staff,
  shifts,
  operatingHoursByDay,
  holidayKeySet,
  coverageGaps,
  onAddShift,
  onRemoveShift,
  onLogShift,
}: {
  dates: string[];
  dayIndex: number;
  onDayIndexChange: (index: number) => void;
  staff: StaffMember[];
  shifts: ShiftRow[];
  operatingHoursByDay: Record<string, PeriodRow[]>;
  holidayKeySet: Set<string>;
  coverageGaps: CoverageGap[];
  onAddShift: (payload: {
    staffMemberId: string;
    staffName: string;
    workDate: string;
    defaultDepartment: "foh" | "kitchen";
    startTime: string;
    endTime: string;
  }) => void;
  onRemoveShift: (id: string) => void;
  onLogShift: (shift: ShiftRow) => void;
}) {
  const iso = dates[dayIndex];
  if (!iso) return null;

  const dayPeriods = operatingHoursByDay[iso] ?? [];
  const dayIsOpen = dayPeriods.length > 0;

  return (
    <Stack gap="md">
      <WeekDaySegmentedControl
        dates={dates}
        dayIndex={dayIndex}
        onDayIndexChange={onDayIndexChange}
      />

      <Stack gap={4}>
        <Title order={3} size="h5">
          {DAY_LABELS[dayIndex]} · {formatShortDate(iso)}
        </Title>
        {dayIsOpen ? (
          <Group gap="xs">
            {dayPeriods.map((period) => (
              <Text key={period.id} size="sm" c="teal">
                {formatTimeRange(period.openTime, period.closeTime)}
              </Text>
            ))}
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            Closed
          </Text>
        )}
      </Stack>

      {coverageGaps.length > 0 ? (
        <Stack gap="xs">
          <Text size="sm" fw={600} c="orange">
            Coverage needed
          </Text>
          {coverageGaps.map((gap) => (
            <Paper
              key={gap.id}
              withBorder
              p="sm"
              radius="md"
              style={{ borderColor: "var(--mantine-color-orange-4)" }}
            >
              <Stack gap={4}>
                <Text size="sm" fw={600}>
                  {formatTimeRange(gap.startTime, gap.endTime)}
                </Text>
                <AreaBadge department={gap.department} />
                <Text size="xs" c="dimmed">
                  {gap.absentStaffName} off — add cover
                </Text>
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : null}

      <Stack gap="sm">
        {staff.map((member) => {
          const memberShifts = shifts.filter(
            (shift) =>
              shift.staffMemberId === member.id && shift.workDate === iso,
          );
          const onHoliday = holidayKeySet.has(`${member.id}:${iso}`);

          return (
            <Paper key={member.id} withBorder p="sm" radius="md">
              <Group justify="space-between" align="flex-start" wrap="nowrap" mb="xs">
                <Stack gap={2}>
                  <Text size="sm" fw={600}>
                    {member.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Usual: {member.department === "foh" ? "FOH" : "Kitchen"}
                  </Text>
                </Stack>
                {!onHoliday && dayIsOpen ? (
                  <ActionIcon
                    variant="light"
                    color="gray"
                    aria-label={`Add shift for ${member.name}`}
                    onClick={() => {
                      const first = dayPeriods[0];
                      if (!first) return;
                      onAddShift({
                        staffMemberId: member.id,
                        staffName: member.name,
                        workDate: iso,
                        defaultDepartment: member.department,
                        startTime: first.openTime,
                        endTime: first.closeTime,
                      });
                    }}
                  >
                    <IconPlus size={16} />
                  </ActionIcon>
                ) : null}
              </Group>

              {onHoliday ? (
                <Text size="sm" c="dimmed">
                  Off
                </Text>
              ) : !dayIsOpen ? (
                <Text size="sm" c="dimmed">
                  —
                </Text>
              ) : memberShifts.length === 0 ? (
                <Text size="sm" c="dimmed">
                  No shift
                </Text>
              ) : (
                <Stack gap="xs">
                  {memberShifts.map((shift) => (
                    <Paper key={shift.id} withBorder p="sm" radius="sm">
                      <Group justify="space-between" wrap="nowrap" align="flex-start">
                        <Stack gap={4}>
                          <Text size="sm" fw={600}>
                            {formatTimeRange(shift.startTime, shift.endTime)}
                          </Text>
                          <AreaBadge department={shift.department} />
                        </Stack>
                        <Group gap={4} wrap="nowrap">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label="Log time for this shift"
                            onClick={() => onLogShift(shift)}
                          >
                            <IconClock size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label="Remove shift"
                            onClick={() => onRemoveShift(shift.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          );
        })}
      </Stack>
    </Stack>
  );
}