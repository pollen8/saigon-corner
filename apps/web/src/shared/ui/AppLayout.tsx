import { authClient } from "@app/auth/client";
import { Box, Burger, Button, Drawer, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { APP_NAV, AppNavLinks, type AppNavRoute } from "./AppNavLinks";
import { BrandMark } from "./BrandMark";
import { ColorSchemeSwitcher } from "./ColorSchemeSwitcher";

export function AppLayout() {
  const { data: session } = authClient.useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpened, { toggle: toggleMenu, close: closeMenu }] =
    useDisclosure(false);

  const active =
    APP_NAV.find((item) => location.pathname.startsWith(item.to))?.to ??
    "/schedule";

  useEffect(() => {
    closeMenu();
  }, [location.pathname, closeMenu]);

  function goTo(to: AppNavRoute) {
    navigate(to);
    closeMenu();
  }

  function signOut() {
    closeMenu();
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => navigate("/sign-in"),
      },
    });
  }

  return (
    <div className="app-frame">
      <header className="brand-header">
        <div className="brand-header-inner">
          <Group gap="sm" wrap="nowrap" className="brand-header-brand">
            <BrandMark logoHeight={36} />
          </Group>
          <nav className="brand-nav" aria-label="Main" data-visible-from="sm">
            <AppNavLinks
              active={active}
              variant="bar"
              onSelect={(to) => navigate(to)}
            />
          </nav>
          <Group gap="sm" wrap="nowrap" className="brand-header-actions">
            {session?.user?.email ? (
              <Text size="xs" c="dimmed" visibleFrom="md">
                {session.user.email}
              </Text>
            ) : null}
            <Box visibleFrom="sm">
              <ColorSchemeSwitcher />
            </Box>
            <Button
              variant="default"
              size="compact-sm"
              onClick={signOut}
              visibleFrom="sm"
            >
              Sign out
            </Button>
            <Burger
              opened={menuOpened}
              onClick={toggleMenu}
              hiddenFrom="sm"
              size="sm"
              aria-label={menuOpened ? "Close menu" : "Open menu"}
            />
          </Group>
        </div>
      </header>

      <Drawer
        opened={menuOpened}
        onClose={closeMenu}
        title="Menu"
        position="right"
        size="min(100%, 20rem)"
        hiddenFrom="sm"
        padding="md"
      >
        <Stack gap="lg">
          {session?.user?.email ? (
            <Text size="sm" c="dimmed">
              {session.user.email}
            </Text>
          ) : null}
          <nav className="brand-nav brand-nav--drawer" aria-label="Main mobile">
            <AppNavLinks active={active} variant="drawer" onSelect={goTo} />
          </nav>
          <ColorSchemeSwitcher variant="drawer" />
          <Button variant="default" fullWidth onClick={signOut}>
            Sign out
          </Button>
        </Stack>
      </Drawer>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}