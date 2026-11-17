import { Badge } from "@mantine/core";

export function AreaBadge({
  department,
  size = "xs",
}: {
  department: "foh" | "kitchen";
  size?: "xs" | "sm" | "md";
}) {
  const kitchen = department === "kitchen";
  return (
    <Badge
      size={size}
      variant={kitchen ? "filled" : "light"}
      color="saigonNavy"
      c={kitchen ? "white" : undefined}
    >
      {kitchen ? "Kitchen" : "FOH"}
    </Badge>
  );
}