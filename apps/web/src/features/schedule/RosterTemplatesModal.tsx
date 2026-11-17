import { trpc } from "../../trpc";
import {
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { DAY_LABELS, formatShortDate } from "../../shared/lib/week";

export type RosterTemplateModalMode = "save" | "apply" | "manage";

export const TEMPLATE_MENU_LABELS: Record<RosterTemplateModalMode, string> = {
  save: "Save work template",
  apply: "Apply work template",
  manage: "Manage work templates",
};

const MODAL_TITLES: Record<RosterTemplateModalMode, string> = {
  save: "Save work template",
  apply: "Apply work template",
  manage: "Manage work templates",
};

export function RosterTemplatesModal({
  mode,
  onClose,
  weekStart,
}: {
  mode: RosterTemplateModalMode | null;
  onClose: () => void;
  weekStart: string;
}) {
  const utils = trpc.useUtils();
  const listQuery = trpc.templates.list.useQuery(undefined, {
    enabled: mode === "apply" || mode === "manage",
  });

  const createFromWeek = trpc.templates.createFromWeek.useMutation({
    onSuccess: async () => {
      await utils.templates.list.invalidate();
      setSaveName("");
      notifications.show({
        color: "teal",
        title: "Template saved",
        message: "This week’s roster pattern was saved.",
      });
      onClose();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Could not save template",
        message: error.message,
      });
    },
  });

  const applyTemplate = trpc.templates.applyToWeek.useMutation({
    onSuccess: async (result) => {
      await utils.schedule.week.invalidate();
      const needsCover = result.skipped.filter((row) => row.needsCover).length;
      if (result.skipped.length === 0) {
        notifications.show({
          color: "teal",
          title: "Template applied",
          message: `${result.applied} shift blocks added to week of ${formatShortDate(result.targetWeekStart)}.`,
        });
      } else {
        const coverNote =
          needsCover > 0
            ? ` ${needsCover} need cover on the roster (staff off).`
            : "";
        notifications.show({
          color: "orange",
          title: "Template partly applied",
          message: `${result.applied} blocks added · ${result.skipped.length} skipped.${coverNote}`,
        });
      }
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Could not apply template",
        message: error.message,
      });
    },
  });

  const removeTemplate = trpc.templates.remove.useMutation({
    onSuccess: async () => {
      await utils.templates.list.invalidate();
      if (selectedTemplateId) {
        const stillThere = listQuery.data?.some(
          (row) => row.id === selectedTemplateId,
        );
        if (!stillThere) setSelectedTemplateId(null);
      }
    },
  });

  const [saveName, setSaveName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [lastApplySkipped, setLastApplySkipped] = useState<
    | {
        dayOfWeek: number;
        staffName: string;
        reason: string;
        needsCover: boolean;
      }[]
    | null
  >(null);

  const templates = listQuery.data ?? [];

  useEffect(() => {
    if (mode !== "apply") return;
    setLastApplySkipped(null);
    if (templates.length === 0) {
      setSelectedTemplateId(null);
      return;
    }
    setSelectedTemplateId(templates[0].id);
  }, [mode, templates]);

  function handleApply() {
    if (!selectedTemplateId) return;
    setLastApplySkipped(null);
    applyTemplate.mutate(
      {
        templateId: selectedTemplateId,
        targetWeekStart: weekStart,
        replaceExisting,
      },
      {
        onSuccess: (result) => {
          if (result.skipped.length > 0) {
            setLastApplySkipped(result.skipped);
          } else {
            onClose();
          }
          if (result.coverageGaps > 0) {
            void utils.schedule.week.invalidate();
          }
        },
      },
    );
  }

  return (
    <Modal
      opened={mode !== null}
      onClose={onClose}
      title={mode ? MODAL_TITLES[mode] : ""}
      size={mode === "manage" ? "lg" : "md"}
    >
      {mode === "save" ? (
        <Stack gap="sm">
          <Text size="xs" c="dimmed">
            Stores Mon–Sun shift patterns (who works when) from the week of{" "}
            {formatShortDate(weekStart)}. Apply them to any future week.
          </Text>
          <Group align="flex-end">
            <TextInput
              label="Template name"
              placeholder="e.g. Standard week"
              value={saveName}
              onChange={(event) => setSaveName(event.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button
              loading={createFromWeek.isPending}
              disabled={!saveName.trim()}
              onClick={() =>
                createFromWeek.mutate({
                  name: saveName.trim(),
                  weekStart,
                })
              }
            >
              Save week
            </Button>
          </Group>
        </Stack>
      ) : null}

      {mode === "apply" ? (
        <Stack gap="sm">
          <Text size="xs" c="dimmed">
            Copy a saved pattern onto the week of {formatShortDate(weekStart)}.
          </Text>
          <Select
            label="Template"
            placeholder={templates.length ? "Choose template" : "No templates yet"}
            data={templates.map((row) => ({
              value: row.id,
              label: `${row.name} (${row.blockCount} blocks)`,
            }))}
            value={selectedTemplateId}
            onChange={setSelectedTemplateId}
          />
          <Checkbox
            label="Replace existing shifts this week before applying"
            checked={replaceExisting}
            onChange={(event) =>
              setReplaceExisting(event.currentTarget.checked)
            }
          />
          <Button
            loading={applyTemplate.isPending}
            disabled={!selectedTemplateId}
            onClick={handleApply}
          >
            Apply template
          </Button>

          {lastApplySkipped && lastApplySkipped.length > 0 ? (
            <Stack gap="xs">
              <Text size="sm" fw={600} c="orange">
                Skipped blocks
              </Text>
              <Table withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Day</Table.Th>
                    <Table.Th>Staff</Table.Th>
                    <Table.Th>Reason</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {lastApplySkipped.map((row, index) => (
                    <Table.Tr key={`${row.staffName}-${row.dayOfWeek}-${index}`}>
                      <Table.Td>{DAY_LABELS[row.dayOfWeek]}</Table.Td>
                      <Table.Td>{row.staffName}</Table.Td>
                      <Table.Td>
                        {row.reason}
                        {row.needsCover ? (
                          <Text span size="sm" c="orange" inherit>
                            {" "}
                            · Add another team member on the roster
                          </Text>
                        ) : null}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          ) : null}
        </Stack>
      ) : null}

      {mode === "manage" ? (
        <Stack gap="sm">
          {templates.length === 0 ? (
            <Text size="sm" c="dimmed">
              No templates yet. Use Save to store the current week.
            </Text>
          ) : (
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Blocks</Table.Th>
                  <Table.Th w={72} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {templates.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{row.name}</Table.Td>
                    <Table.Td>{row.blockCount}</Table.Td>
                    <Table.Td>
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        color="red"
                        loading={removeTemplate.isPending}
                        onClick={() => removeTemplate.mutate({ id: row.id })}
                      >
                        Delete
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      ) : null}
    </Modal>
  );
}