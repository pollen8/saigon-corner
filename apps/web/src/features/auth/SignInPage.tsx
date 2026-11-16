import { authClient } from "@app/auth/client";
import {
  Button,
  Container,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";

export function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const { error: signInError } = await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}/schedule`,
    });
    if (signInError) {
      setError(signInError.message ?? "Sign-in failed");
      setLoading(false);
    }
  }

  return (
    <Container size={420} py={80}>
      <Paper withBorder p="xl" radius="md">
        <Stack gap="md">
          <Stack gap={4}>
            <Title order={2}>Saigon Corner</Title>
            <Text c="dimmed" size="sm">
              Admin sign-in with Google. Only addresses listed in{" "}
              <code>ADMIN_EMAILS</code> can access this app.
            </Text>
          </Stack>
          <Button loading={loading} onClick={signInWithGoogle} size="md">
            Continue with Google
          </Button>
          {error ? (
            <Text size="sm" c="red">
              {error}
            </Text>
          ) : null}
        </Stack>
      </Paper>
    </Container>
  );
}