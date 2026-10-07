import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Brand } from "@/components/Brand";

/**
 * The frame for the single public `/` route — also the full-screen voting
 * mode. Deliberately has no navigation: students see exactly one screen,
 * controlled by the admin panel, with the college logo and election title
 * pinned at the top.
 */
export function PublicShell({
  children,
  subtitle,
  eyebrow,
}: {
  children: ReactNode;
  /** Election title + year shown under the college name. */
  subtitle?: string;
  eyebrow?: string;
}) {
  const state = useQuery(api.settings.publicState);
  const collegeName = state?.branding?.collegeName ?? "Pragjyotish College";
  const year =
    state?.branding?.year ?? String(new Date().getFullYear());

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-5">
          <Brand subtitle={subtitle ?? "Election Portal"} />
          {eyebrow ? (
            <span className="hidden text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:block">
              {eyebrow}
            </span>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16 pt-8 sm:pt-12">
        {children}
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-1 px-5 py-6 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <span className="truncate">{collegeName}</span>
          <span>Academic Year {year}</span>
        </div>
      </footer>
    </div>
  );
}

export default PublicShell;
