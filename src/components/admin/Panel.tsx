import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** White panel with a hairline border — the admin panel's one container. */
export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card", className)}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PanelBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

/** Page heading shared by every admin screen. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Compact statistic tile for the dashboard grid. */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  children,
}: {
  label: string;
  value?: ReactNode;
  hint?: string;
  tone?: "neutral" | "live" | "muted" | "warn";
  children?: ReactNode;
}) {
  const toneClasses = {
    neutral: "text-foreground",
    live: "text-primary",
    muted: "text-muted-foreground",
    warn: "text-destructive",
  } as const;
  return (
    <div className="flex min-h-[104px] flex-col justify-between rounded-lg border border-border bg-card px-4 py-3.5">
      <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div>
        <div className={cn("mt-3 text-xl font-semibold tracking-tight", toneClasses[tone])}>
          {value ?? children}
        </div>
        {hint && (
          <div className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

/** Small status chip with a colored dot. */
export function StatusPill({
  label,
  color = "green",
}: {
  label: string;
  color?: "green" | "amber" | "red" | "gray" | "navy";
}) {
  const dotClasses = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    gray: "bg-muted-foreground/50",
    navy: "bg-primary",
  } as const;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium">
      <span className={cn("size-1.5 rounded-full", dotClasses[color])} />
      {label}
    </span>
  );
}
