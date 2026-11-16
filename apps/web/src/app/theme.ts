import {
  createTheme,
  Input,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from "@mantine/core";
import { fieldStyles } from "../shared/ui/Field";

const terracotta: MantineColorsTuple = [
  "#fdf4f0",
  "#f9e6dc",
  "#f2cdb9",
  "#e8ae8f",
  "#dd8f6a",
  "#c76b3f",
  "#a85532",
  "#8a4228",
  "#6e3420",
  "#572819",
];

const inputFocus = { light: "#c76b3f", dark: "#e8ae8f" };

export const theme = createTheme({
  primaryColor: "terracotta",
  primaryShade: { light: 6, dark: 5 },
  colors: { terracotta },
  defaultRadius: "md",
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headings: { fontWeight: "600" },
  components: {
    Input: Input.extend({
      styles: (_theme, props) => {
        if (props.variant === "unstyled") return {};
        return {
          wrapper: {
            "--input-bd-focus":
              "light-dark(var(--app-input-focus-light), var(--app-input-focus-dark))",
          },
        };
      },
    }),
    InputWrapper: Input.Wrapper.extend({ styles: fieldStyles }),
    Button: {
      defaultProps: { radius: "md" },
      styles: { inner: { gap: 4 }, section: { margin: 0 } },
    },
    Paper: {
      defaultProps: { radius: 10 },
      styles: {
        root: {
          background: "var(--app-card-bg)",
          borderColor: "var(--app-card-border)",
          boxShadow: "var(--app-card-shadow)",
        },
      },
    },
  },
});

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    "--app-input-focus-light": inputFocus.light,
    "--app-input-focus-dark": inputFocus.dark,
  },
  light: {
    "--mantine-color-anchor": "var(--mantine-color-terracotta-7)",
    "--mantine-color-body": "#f5f0eb",
    "--app-card-bg": "#fffcf9",
    "--app-card-border": "rgba(40, 32, 28, 0.1)",
    "--app-card-shadow":
      "0 1px 2px rgba(40, 32, 28, 0.06), 0 8px 24px rgba(40, 32, 28, 0.06)",
  },
  dark: {
    "--mantine-color-anchor": "var(--mantine-color-terracotta-3)",
    "--mantine-color-body": "#12100f",
    "--mantine-color-default": "#1e1b19",
    "--app-card-bg": "#1e1b19",
    "--app-card-border": "rgba(255, 255, 255, 0.08)",
    "--app-card-shadow": "0 12px 32px rgba(0, 0, 0, 0.35)",
  },
});