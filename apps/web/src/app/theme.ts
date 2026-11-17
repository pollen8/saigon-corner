import {
  createTheme,
  Input,
  SegmentedControl,
  Table,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from "@mantine/core";
import { fieldStyles } from "../shared/ui/Field";

const saigonRed: MantineColorsTuple = [
  "#ffe8e8",
  "#ffc9c9",
  "#ff9b9b",
  "#f56a6a",
  "#e83a3a",
  "#de1313",
  "#c11010",
  "#9e0d0d",
  "#7d0a0a",
  "#5c0707",
];

const saigonGold: MantineColorsTuple = [
  "#fff8d6",
  "#fff1b0",
  "#ffea8a",
  "#ffe366",
  "#ffdd55",
  "#f0c93a",
  "#d4ac22",
  "#b08c16",
  "#8c6e10",
  "#68500b",
];

const saigonNavy: MantineColorsTuple = [
  "#e8eef2",
  "#c9d6de",
  "#a3b7c4",
  "#7d98aa",
  "#5c7a90",
  "#446277",
  "#355264",
  "#2b4250",
  "#21323d",
  "#162229",
];

/** Replaces Mantine's neutral greys so dark-mode inputs, dropdowns and text stay navy. */
const dark: MantineColorsTuple = [
  "#d3dde3",
  "#b9c7d0",
  "#8a9eab",
  "#6b8292",
  "#3d5666",
  "#2b4250",
  "#22343f",
  "#1a2932",
  "#141f26",
  "#0e161b",
];

export const theme = createTheme({
  primaryColor: "saigonNavy",
  primaryShade: { light: 6, dark: 4 },
  colors: {
    dark,
    saigonRed,
    saigonGold,
    saigonNavy,
  },
  defaultRadius: "md",
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headings: {
    fontWeight: "600",
  },
  components: {
    Input: Input.extend({
      styles: (_theme, props) => {
        if (props.variant === "unstyled") return {};
        return {
          wrapper: {
            "--input-bd-focus": "var(--app-brand-navy)",
          },
        };
      },
    }),
    InputWrapper: Input.Wrapper.extend({ styles: fieldStyles }),
    Button: {
      defaultProps: { radius: "md" },
      styles: {
        inner: { gap: 4 },
        section: { margin: 0 },
      },
    },
    Paper: {
      defaultProps: { radius: "md" },
      styles: {
        root: {
          background: "var(--app-card-bg)",
          borderColor: "var(--app-card-border)",
          boxShadow: "var(--app-card-shadow)",
        },
      },
    },
    Table: Table.extend({
      styles: {
        table: {
          "--table-border-color": "var(--app-schedule-grid-line)",
          "--table-striped-color": "var(--app-table-stripe-bg)",
          "--table-hover-color": "var(--app-table-hover-bg)",
        },
      },
    }),
    SegmentedControl: SegmentedControl.extend({
      defaultProps: {
        color: "saigonNavy",
      },
      styles: {
        root: {
          backgroundColor: "var(--app-segmented-bg)",
          border: "1px solid var(--app-card-border)",
        },
        indicator: {
          backgroundColor: "var(--app-segmented-indicator)",
          boxShadow: "var(--app-segmented-indicator-shadow)",
        },
        label: {
          fontWeight: 600,
        },
      },
    }),
  },
});

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    "--app-brand-gold": "#ffdd55",
    "--app-brand-red": "#de1313",
    "--app-brand-navy": "#355264",
    "--app-brand-teal": "#355264",
    "--app-brand-cream": "#f7f0dd",
  },
  light: {
    "--mantine-color-anchor": "var(--app-brand-navy)",
    "--mantine-color-body": "#f6f4f0",
    "--app-card-bg": "#ffffff",
    "--app-card-border": "rgba(53, 82, 100, 0.12)",
    "--app-card-shadow": "0 1px 2px rgba(53, 82, 100, 0.06)",
    "--app-header-border": "rgba(53, 82, 100, 0.1)",
    "--app-table-header-bg": "rgba(53, 82, 100, 0.04)",
    "--app-table-stripe-bg": "rgba(53, 82, 100, 0.03)",
    "--app-table-hover-bg": "rgba(53, 82, 100, 0.07)",
    "--app-schedule-grid-line": "rgba(53, 82, 100, 0.18)",
    "--app-schedule-closed-band": "rgba(53, 82, 100, 0.06)",
    "--app-nav-active-fg": "#355264",
    "--app-nav-hover-fg": "#355264",
    "--app-segmented-bg": "rgba(53, 82, 100, 0.08)",
    "--app-segmented-indicator": "#355264",
    "--app-segmented-indicator-shadow": "0 1px 3px rgba(53, 82, 100, 0.35)",
    "--app-segmented-label": "rgba(53, 82, 100, 0.65)",
    "--app-segmented-label-active": "#ffffff",
    "--app-sign-in-panel-border": "rgba(53, 82, 100, 0.22)",
  },
  dark: {
    "--mantine-color-anchor": "#8eb0c2",
    "--mantine-color-body": "#162229",
    "--mantine-color-default": "#21323d",
    "--mantine-color-default-hover": "#2b4250",
    "--mantine-color-default-border": "rgba(255, 255, 255, 0.08)",
    "--app-card-bg": "#21323d",
    "--app-card-border": "rgba(255, 255, 255, 0.08)",
    "--app-card-shadow": "none",
    "--app-header-border": "rgba(255, 255, 255, 0.08)",
    "--app-table-header-bg": "rgba(255, 255, 255, 0.04)",
    "--app-table-stripe-bg": "rgba(92, 122, 144, 0.1)",
    "--app-table-hover-bg": "rgba(92, 122, 144, 0.18)",
    "--app-schedule-grid-line": "rgba(255, 255, 255, 0.1)",
    "--app-schedule-closed-band": "rgba(0, 0, 0, 0.22)",
    "--app-nav-active-fg": "#e8eef2",
    "--app-nav-hover-fg": "#c9d6de",
    "--app-segmented-bg": "#162229",
    "--app-segmented-indicator": "#5c7a90",
    "--app-segmented-indicator-shadow": "0 1px 3px rgba(0, 0, 0, 0.4)",
    "--app-segmented-label": "rgba(232, 238, 242, 0.55)",
    "--app-segmented-label-active": "#ffffff",
    "--app-sign-in-panel-border": "rgba(53, 82, 100, 0.45)",
  },
});