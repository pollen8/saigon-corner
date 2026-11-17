import { trpc } from "../../trpc";
import {
  Anchor,
  Badge,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AreaBadge } from "../../shared/ui/AreaBadge";
import { WeekNavigator } from "../../shared/ui/WeekNavigator";
import {
  overlappingActualLog,
  shiftActualStatus,
} from "../../shared/lib/shiftActualStatus";
import {
  currentWeekStartIso,
  DAY_LABELS,
  formatShortDate,
  formatTimeRange,
  totalHoursFromRanges,
} from "../../shared/lib/week";

export function StaffShiftsPage() {
  const { staffId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const weekStart = searchParams.get("week") ?? currentWeekStartIso();

  const detailQuery = trpc.schedule.staffDetail.useQuery({
    staffMemberId: staffId,
    weekStart,
  });
  const logsQuery = trpc.timeLog.listForWeek.useQuery({
    weekStart,
    staffMemberId: staffId,
  });

  const data = detailQuery.data;
  const staff = data?.staff;
  const shifts = data?.shifts ?? [];
  const actualLogs = (logsQuery.data?.logs ?? []).map((row) => row.log);
  const scheduledHours = totalHoursFromRanges(shifts);
  const loggedHours = totalHoursFromRanges(actualLogs);

  function setWeek(iso: string) {
    setSearchParams({ week: iso });
  }

  if (!staff && !detailQuery.isLoading) {
    return (
      <Text>
        Staff not found. <Anchor component={Link} to="/staff">Back to staff</Anchor>
      </Text>
    );
  }

  return (
    <Stack gap="md">
      <Anchor component={Link} to="/staff" size="sm">
        ← Staff list
      </Anchor>
      <Group justify="space-between" wrap="wrap">
        <Stack gap={4}>
          <Title order={2} size="h4">
            {staff?.name ?? "…"}
          </Title>
          {staff ? (
            <Text size="sm" c="dimmed">
              Usual area: {staff.department === "foh" ? "front of house" : "kitchen"}
            </Text>
          ) : null}
          <Text size="sm" c="dimmed">
            Scheduled: <strong>{scheduledHours}h</strong> · logged:{" "}
            <strong>{loggedHours}h</strong> this week
          </Text>
        </Stack>
        <WeekNavigator weekStart={weekStart} onChange={setWeek} />
      </Group>

      <Table withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Day</Table.Th>
            <Table.Th>Date</Table.Th>
            <Table.Th>Scheduled blocks</Table.Th>
            <Table.Th>Hours</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(data?.dates ?? []).map((iso, index) => {
            const dayShifts = shifts.filter((s) => s.workDate === iso);
            const dayHours = totalHoursFromRanges(dayShifts);
            return (
              <Table.Tr key={iso}>
                <Table.Td>{DAY_LABELS[index]}</Table.Td>
                <Table.Td>{formatShortDate(iso)}</Table.Td>
                <Table.Td>
                  {dayShifts.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      —
                    </Text>
                  ) : (
                    <Stack gap={4}>
                      {dayShifts.map((shift) => {
                        const status = shiftActualStatus(shift, actualLogs);
                        const overlap =
                          status === "fail"
                            ? overlappingActualLog(shift, actualLogs)
                            : undefined;
                        const notLogged = status === "fail" && !overlap;
                        const mismatch = status === "fail" && overlap;
                        const borderColor =
                          status === "success"
                            ? "var(--mantine-color-green-5)"
                            : notLogged
                              ? "var(--mantine-color-orange-5)"
                              : mismatch
                                ? "var(--mantine-color-red-5)"
                                : undefined;
                        const background =
                          status === "success"
                            ? "var(--mantine-color-green-light)"
                            : notLogged
                              ? "var(--mantine-color-orange-light)"
                              : mismatch
                                ? "var(--mantine-color-red-light)"
                                : undefined;
                        return (
                          <Paper
                            key={shift.id}
                            withBorder
                            p="xs"
                            radius="sm"
                            style={{
                              borderColor,
                              background,
                            }}
                          >
                            <Group gap="xs" justify="space-between" wrap="wrap">
                              <Group gap="xs">
                                <Text size="sm">
                                  {formatTimeRange(shift.startTime, shift.endTime)}
                                </Text>
                                <AreaBadge department={shift.department} />
                              </Group>
                              {status === "success" ? (
                                <Badge size="sm" color="green" variant="light">
                                  Logged
                                </Badge>
                              ) : null}
                              {notLogged ? (
                                <Badge size="sm" color="orange" variant="light">
                                  Not logged
                                </Badge>
                              ) : null}
                              {mismatch ? (
                                <Badge size="sm" color="red" variant="light">
                                  Mismatch
                                </Badge>
                              ) : null}
                            </Group>
                            {status === "fail" && overlap ? (
                              <Text size="xs" c="dimmed" mt={4}>
                                Recorded:{" "}
                                {formatTimeRange(overlap.startTime, overlap.endTime)}
                              </Text>
                            ) : null}
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}
                </Table.Td>
                <Table.Td>{dayHours}h</Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}