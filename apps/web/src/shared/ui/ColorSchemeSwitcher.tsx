import { ActionIcon, Group, Menu, Stack, Text, useMantineColorScheme } from "@mantine/core";
import {
  IconCheck,
  IconDeviceDesktop,
  IconMoon,
  IconSun,
  type TablerIcon,
} from "@tabler/icons-react";
import { Icon } from "./Icon";

const OPTIONS: {
  value: "light" | "dark" | "auto";
  label: string;
  icon: TablerIcon;
}[] = [
  { value: "light", label: "Light", icon: IconSun },
  { value: "dark", label: "Dark", icon: IconMoon },
  { value: "auto", label: "System", icon: IconDeviceDesktop },
];

export function ColorSchemeSwitcher({
  variant = "menu",
}: {
  variant?: "menu" | "drawer";
}) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const current =
    OPTIONS.find((option) => option.value === colorScheme) ?? OPTIONS[0];

  if (variant === "drawer") {
    return (
      <Stack gap="xs" w="100%">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts="0.04em">
          Theme
        </Text>
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className="brand-nav-link brand-nav-link--drawer"
            data-active={colorScheme === option.value}
            onClick={() => setColorScheme(option.value)}
          >
            <Group gap="sm" wrap="nowrap">
              <Icon icon={option.icon} size={18} />
              <span>{option.label}</span>
            </Group>
          </button>
        ))}
      </Stack>
    );
  }

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" size="md" aria-label="Theme">
          <Icon icon={current.icon} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {OPTIONS.map((option) => {
          const isActive = option.value === colorScheme;
          return (
            <Menu.Item
              key={option.value}
              leftSection={<Icon icon={option.icon} />}
              rightSection={
                isActive ? <Icon icon={IconCheck} size={14} stroke={2} /> : undefined
              }
              fw={isActive ? 600 : 400}
              onClick={() => setColorScheme(option.value)}
            >
              {option.label}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}