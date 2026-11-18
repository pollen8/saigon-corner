import { trpc } from "../../trpc";

type StaffMember = {
  id: string;
  name: string;
  department: "foh" | "kitchen";
  active: boolean;
};
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import {
  formatIsoDateRange,
  formatShortDate,
  formatTimeRange,
  nextIsoDate,
  todayIso,
} from "../../shared/lib/week";
import { AreaBadge } from "../../shared/ui/AreaBadge";

type HolidayRow = {
  id: string;
  staffMemberId: string;
  staffName: string;
  workDate: string;
};

function groupHolidayRows(rows: HolidayRow[]) {
  const sorted = [...rows].sort(
    (a, b) =>
      a.staffName.localeCompare(b.staffName) ||
      a.workDate.localeCompare(b.workDate),
  );
  const groups: {
    staffName: string;
    startDate: string;
    endDate: string;
    ids: string[];
    key: string;
  }[] = [];

  for (const row of sorted) {
    const last = groups.at(-1);
    if (
      last &&
      last.staffName === row.staffName &&
      nextIsoDate(last.endDate) === row.workDate
    ) {
      last.endDate = row.workDate;
      last.ids.push(row.id);
      continue;
    }
    groups.push({
      staffName: row.staffName,
      startDate: row.workDate,
      endDate: row.workDate,
      ids: [row.id],
      key: row.id,
    });
  }
  return groups;
}

type HolidayConflictShift = {
  id: string;
  workDate: string;
  startTime: string;
  endTime: string;
  department: "foh" | "kitchen";
};

type HolidayConflictModalState = {
  staffMemberId: string;
  staffName: string;
  startDate: string;
  endDate?: string;
  shifts: HolidayConflictShift[];
};

export function StaffPage() {
  const utils = trpc.useUtils();
  const staffQuery = trpc.staff.list.useQuery();
  const create = trpc.staff.create.useMutation({
    onSuccess: () => utils.staff.list.invalidate(),
  });
  const update = trpc.staff.update.useMutation({
    onSuccess: () => utils.staff.list.invalidate(),
  });
  const remove = trpc.staff.remove.useMutation({
    onSuccess: () => utils.staff.list.invalidate(),
  });
  const holidaysQuery = trpc.staff.listHolidays.useQuery({ fromDate: todayIso() });
  const addHoliday = trpc.staff.addHoliday.useMutation({
    onSuccess: (result) => {
      utils.staff.listHolidays.invalidate();
      utils.schedule.week.invalidate();
      if (result.skipped > 0) {
        notifications.show({
          color: "yellow",
          title: "Days off partly added",
          message: `Added ${result.added} day${result.added === 1 ? "" : "s"}; ${result.skipped} already marked off.`,
        });
      }
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Could not add days off",
        message: error.message,
      });
    },
  });
  const removeHolidays = trpc.staff.removeHolidays.useMutation({
    onSuccess: () => {
      utils.staff.listHolidays.invalidate();
      utils.schedule.week.invalidate();
    },
  });

  const [name, setName] = useState("");
  const [department, setDepartment] = useState<"foh" | "kitchen">("foh");
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editDepartment, setEditDepartment] = useState<"foh" | "kitchen">("foh");
  const [editActive, setEditActive] = useState(true);
  const [holidayStaffId, setHolidayStaffId] = useState<string | null>(null);
  const [holidayStartDate, setHolidayStartDate] = useState("");
  const [holidayEndDate, setHolidayEndDate] = useState("");
  const [holidayConflictModal, setHolidayConflictModal] =
    useState<HolidayConflictModalState | null>(null);
  const [checkingHolidayConflicts, setCheckingHolidayConflicts] = useState(false);

  const holidayGroups = useMemo(
    () => groupHolidayRows(holidaysQuery.data ?? []),
    [holidaysQuery.data],
  );

  useEffect(() => {
    if (!editing) return;
    setEditName(editing.name);
    setEditDepartment(editing.department);
    setEditActive(editing.active);
  }, [editing]);

  const rows = staffQuery.data ?? [];

  function openEdit(member: StaffMember) {
    setEditing(member);
  }

  function saveEdit() {
    if (!editing || !editName.trim()) return;
    update.mutate(
      {
        id: editing.id,
        name: editName.trim(),
        department: editDepartment,
        active: editActive,
      },
      {
        onSuccess: () => setEditing(null),
      },
    );
  }

  function clearHolidayForm() {
    setHolidayStartDate("");
    setHolidayEndDate("");
  }

  function holidayRangePayload() {
    if (!holidayStaffId || !holidayStartDate) return null;
    const endDate = holidayEndDate || holidayStartDate;
    return {
      staffMemberId: holidayStaffId,
      startDate: holidayStartDate,
      endDate: endDate === holidayStartDate ? undefined : endDate,
    } as const;
  }

  function submitHoliday(removeScheduledShifts: boolean) {
    const payload = holidayRangePayload();
    if (!payload) return;
    addHoliday.mutate(
      { ...payload, removeScheduledShifts },
      {
        onSuccess: () => {
          clearHolidayForm();
          setHolidayConflictModal(null);
        },
      },
    );
  }

  async function onAddDaysOffClick() {
    const payload = holidayRangePayload();
    if (!payload) return;

    setCheckingHolidayConflicts(true);
    try {
      const { shifts } = await utils.client.staff.holidayScheduleConflicts.query(
        payload,
      );
      if (shifts.length > 0) {
        const staffName =
          rows.find((member) => member.id === payload.staffMemberId)?.name ??
          "Staff";
        setHolidayConflictModal({
          ...payload,
          staffName,
          shifts,
        });
        return;
      }
      submitHoliday(false);
    } finally {
      setCheckingHolidayConflicts(false);
    }
  }

  return (
    <Stack gap="md">
      <Title order={2} size="h4">
        Staff list
      </Title>
      <Text size="sm" c="dimmed">
        Usual area is the default on the rota — you can override it per shift.
        Inactive staff are hidden from the weekly rota. Mark days off below to
        block the rota and time logs for that person.
      </Text>

      <Group align="flex-end" wrap="wrap">
        <TextInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          style={{ flex: "1 1 200px" }}
        />
        <Select
          label="Usual area"
          data={[
            { value: "foh", label: "Front of house" },
            { value: "kitchen", label: "Kitchen" },
          ]}
          value={department}
          onChange={(value) => {
            if (value === "foh" || value === "kitchen") setDepartment(value);
          }}
          style={{ width: 180 }}
        />
        <Button
          onClick={() => {
            if (!name.trim()) return;
            create.mutate({ name: name.trim(), department });
            setName("");
          }}
          loading={create.isPending}
        >
          Add staff
        </Button>
      </Group>

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Usual area</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Shifts</Table.Th>
            <Table.Th w={100} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((member) => (
            <Table.Tr key={member.id}>
              <Table.Td>{member.name}</Table.Td>
              <Table.Td>
                {member.department === "foh" ? "Front of house" : "Kitchen"}
              </Table.Td>
              <Table.Td>
                <Badge color={member.active ? "saigonNavy" : "gray"} variant="light">
                  {member.active ? "Active" : "Inactive"}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text
                  component={Link}
                  to={`/staff/${member.id}/shifts`}
                  size="sm"
                >
                  View weekly hours
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap={4} wrap="nowrap">
                  <ActionIcon
                    variant="subtle"
                    aria-label="Edit staff"
                    onClick={() => openEdit(member)}
                  >
                    <IconPencil size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label="Remove"
                    onClick={() => {
                      if (confirm(`Remove ${member.name}?`)) {
                        remove.mutate({ id: member.id });
                      }
                    }}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Stack gap="sm">
        <Title order={3} size="h5">
          Days off
        </Title>
        <Text size="sm" c="dimmed">
          Staff cannot be scheduled or logged on these dates.
        </Text>
        <Group align="flex-end" wrap="wrap">
          <Select
            label="Staff"
            placeholder="Choose staff"
            data={rows.map((member) => ({ value: member.id, label: member.name }))}
            value={holidayStaffId}
            onChange={setHolidayStaffId}
            style={{ width: 220 }}
          />
          <TextInput
            label="From"
            type="date"
            value={holidayStartDate}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setHolidayStartDate(value);
              if (!holidayEndDate || holidayEndDate < value) {
                setHolidayEndDate(value);
              }
            }}
            style={{ width: 180 }}
          />
          <TextInput
            label="To"
            type="date"
            description="Same as From for one day"
            value={holidayEndDate}
            min={holidayStartDate || undefined}
            onChange={(e) => setHolidayEndDate(e.currentTarget.value)}
            style={{ width: 180 }}
          />
          <Button
            loading={addHoliday.isPending || checkingHolidayConflicts}
            disabled={!holidayStaffId || !holidayStartDate}
            onClick={() => void onAddDaysOffClick()}
          >
            Add days off
          </Button>
        </Group>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Staff</Table.Th>
              <Table.Th>Dates</Table.Th>
              <Table.Th w={60} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {holidayGroups.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={3}>
                  <Text size="sm" c="dimmed">
                    No upcoming days off.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              holidayGroups.map((row) => (
                <Table.Tr key={row.key}>
                  <Table.Td>{row.staffName}</Table.Td>
                  <Table.Td>
                    {formatIsoDateRange(row.startDate, row.endDate)}
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label="Remove days off"
                      onClick={() => removeHolidays.mutate({ ids: row.ids })}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Stack>

      <Modal
        opened={holidayConflictModal !== null}
        onClose={() => setHolidayConflictModal(null)}
        title="Scheduled shifts in this period"
      >
        {holidayConflictModal ? (
          <Stack gap="md">
            <Text size="sm">
              <Text span fw={600}>
                {holidayConflictModal.staffName}
              </Text>{" "}
              is still on the rota for{" "}
              {formatIsoDateRange(
                holidayConflictModal.startDate,
                holidayConflictModal.endDate ?? holidayConflictModal.startDate,
              )}
              .
            </Text>
            <Table striped withTableBorder highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Time</Table.Th>
                  <Table.Th>Area</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {holidayConflictModal.shifts.map((shift) => (
                  <Table.Tr key={shift.id}>
                    <Table.Td>{formatShortDate(shift.workDate)}</Table.Td>
                    <Table.Td>
                      {formatTimeRange(shift.startTime, shift.endTime)}
                    </Table.Td>
                    <Table.Td>
                      <AreaBadge department={shift.department} />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            <Text size="sm" c="dimmed">
              Add the days off and remove these shifts from the schedule, or cancel
              to keep the rota unchanged.
            </Text>
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => setHolidayConflictModal(null)}
              >
                Cancel
              </Button>
              <Button
                color="red"
                loading={addHoliday.isPending}
                onClick={() => submitHoliday(true)}
              >
                Accept and remove from schedule
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>

      <Modal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit staff"
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            value={editName}
            onChange={(e) => setEditName(e.currentTarget.value)}
          />
          <Select
            label="Usual area"
            data={[
              { value: "foh", label: "Front of house" },
              { value: "kitchen", label: "Kitchen" },
            ]}
            value={editDepartment}
            onChange={(value) => {
              if (value === "foh" || value === "kitchen") setEditDepartment(value);
            }}
          />
          <Switch
            label="Active on rota"
            description="Inactive staff are hidden from the weekly schedule"
            checked={editActive}
            onChange={(e) => setEditActive(e.currentTarget.checked)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} loading={update.isPending} disabled={!editName.trim()}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}