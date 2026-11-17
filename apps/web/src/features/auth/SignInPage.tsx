import { authClient } from "@app/auth/client";
import { Button, Paper, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { BrandMark } from "../../shared/ui/BrandMark";

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
      setError(
        signInError.message ??
          (signInError.status
            ? `Sign-in failed (${signInError.status})`
            : "Sign-in failed"),
      );
      setLoading(false);
    }
  }

  return (
    <div className="sign-in-page">
      <Paper withBorder p="xl" className="sign-in-panel">
        <Stack gap="md" align="center">
          <BrandMark logoHeight={48} />
          <Text ta="center" size="sm" c="dimmed">
            Staff roster and hours. Sign in with Google.
          </Text>
          <Button
            loading={loading}
            onClick={signInWithGoogle}
            size="md"
            fullWidth
          >
            Continue with Google
          </Button>
          {error ? (
            <Text size="sm" c="red" ta="center">
              {error}
            </Text>
          ) : null}
        </Stack>
      </Paper>
    </div>
  );
}