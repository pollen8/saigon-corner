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
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IconPencil, IconTrash } from "@tabler/icons-react";

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

  const [name, setName] = useState("");
  const [department, setDepartment] = useState<"foh" | "kitchen">("foh");
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editDepartment, setEditDepartment] = useState<"foh" | "kitchen">("foh");
  const [editActive, setEditActive] = useState(true);

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

  return (
    <Stack gap="md">
      <Title order={2} size="h4">
        Staff list
      </Title>
      <Text size="sm" c="dimmed">
        Front of house and kitchen. Inactive staff are hidden from the weekly roster.
      </Text>

      <Group align="flex-end" wrap="wrap">
        <TextInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          style={{ flex: "1 1 200px" }}
        />
        <Select
          label="Area"
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
            <Table.Th>Area</Table.Th>
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
                <Badge color={member.active ? "teal" : "gray"} variant="light">
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
            label="Area"
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
            label="Active on roster"
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