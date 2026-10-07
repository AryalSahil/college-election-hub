import { Loader2 } from "lucide-react";

/** Full-height loading state (project convention: Loader2, no skeletons). */
export function CenteredLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

/** Compact loading state for cards and panels. */
export function InlineLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      <span className="text-xs uppercase tracking-[0.25em]">{label}</span>
    </div>
  );
}
