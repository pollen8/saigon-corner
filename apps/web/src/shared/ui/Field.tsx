import { Input, type InputWrapperProps } from "@mantine/core";

export const FIELD_GAP = "0.25rem";

export const fieldStyles = {
  root: {
    display: "flex",
    flexDirection: "column" as const,
    gap: FIELD_GAP,
  },
  label: {
    marginBottom: 0,
  },
};

export function Field(props: InputWrapperProps) {
  return <Input.Wrapper {...props} />;
}