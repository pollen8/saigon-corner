import { authClient } from "@app/auth/client";
import {
  Button,
  Container,
  Group,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ColorSchemeSwitcher } from "./ColorSchemeSwitcher";

const NAV = [
  { to: "/schedule", label: "Weekly roster" },
  { to: "/staff", label: "Staff" },
  { to: "/hours", label: "Opening hours" },
  { to: "/time-logs", label: "Actual hours" },
] as const;

export function AppLayout() {
  const { data: session } = authClient.useSession();
  const location = useLocation();
  const navigate = useNavigate();

  const active =
    NAV.find((item) => location.pathname.startsWith(item.to))?.to ?? "/schedule";

  return (
    <Container size="xl" py="lg" px="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <Stack gap={4}>
            <Title order={1} size="h3">
              Saigon Corner
            </Title>
            <Text size="sm" c="dimmed">
              Staff scheduling & time
              {session?.user?.email ? ` · ${session.user.email}` : null}
            </Text>
          </Stack>
          <Group gap="sm">
            <ColorSchemeSwitcher />
            <Button
              variant="light"
              size="compact-sm"
              onClick={() =>
                authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => navigate("/sign-in"),
                  },
                })
              }
            >
              Sign out
            </Button>
          </Group>
        </Group>

        <Tabs
          value={active}
          onChange={(value) => value && navigate(value)}
        >
          <Tabs.List>
            {NAV.map((item) => (
              <Tabs.Tab key={item.to} value={item.to}>
                {item.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>

        <Outlet />
      </Stack>
    </Container>
  );
}