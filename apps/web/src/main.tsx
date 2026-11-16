import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { App } from "./app/App";
import { cssVariablesResolver, theme } from "./app/theme";
import { trpc, createTRPCClient } from "./trpc";

function Root() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(createTRPCClient);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ColorSchemeScript defaultColorScheme="auto" />
        <MantineProvider
          theme={theme}
          defaultColorScheme="auto"
          cssVariablesResolver={cssVariablesResolver}
        >
          <Notifications position="bottom-right" />
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MantineProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);