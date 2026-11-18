const NAV = [
  { to: "/schedule", label: "Rota" },
  { to: "/staff", label: "Staff" },
  { to: "/hours", label: "Opening hours" },
  { to: "/time-logs", label: "Time logs" },
] as const;

export type AppNavRoute = (typeof NAV)[number]["to"];

export function AppNavLinks({
  active,
  onSelect,
  variant,
}: {
  active: AppNavRoute | string;
  onSelect: (to: AppNavRoute) => void;
  variant: "bar" | "drawer";
}) {
  return (
    <>
      {NAV.map((item) => (
        <button
          key={item.to}
          type="button"
          className={
            variant === "drawer"
              ? "brand-nav-link brand-nav-link--drawer"
              : "brand-nav-link"
          }
          data-active={active === item.to}
          onClick={() => onSelect(item.to)}
        >
          {item.label}
        </button>
      ))}
    </>
  );
}

export { NAV as APP_NAV };