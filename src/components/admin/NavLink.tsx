import type { ReactNode } from "react";
import { NavLink as RouterNavLink } from "react-router";
import { cn } from "@/lib/utils";

/** Sidebar / sheet navigation link with an active state. */
export function NavLink({
  to,
  label,
  icon,
  end = false,
  onNavigate,
}: {
  to: string;
  label: string;
  icon?: ReactNode;
  end?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <RouterNavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )
      }
    >
      {icon}
      <span>{label}</span>
    </RouterNavLink>
  );
}

export default NavLink;
