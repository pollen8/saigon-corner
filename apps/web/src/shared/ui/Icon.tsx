import type { IconProps, TablerIcon } from "@tabler/icons-react";

export const iconProps = { size: 16, stroke: 1.75 } as const;

type AppIconProps = IconProps & {
  icon: TablerIcon;
};

export function Icon({ icon: TablerIconComponent, ...props }: AppIconProps) {
  return <TablerIconComponent {...iconProps} {...props} />;
}