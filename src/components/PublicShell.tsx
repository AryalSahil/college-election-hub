import type { ReactNode } from "react";
import { Brand } from "@/components/Brand";

/**
 * The frame for the single public `/` route. Deliberately has no navigation:
 * students see exactly one screen, controlled by the admin panel.
 */
export function PublicShell({
  children,
  eyebrow,
}: {
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-5">
          <Brand />
          {eyebrow ? (
            <span className="hidden text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:block">
              {eyebrow}
            </span>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16 pt-10 sm:pt-14">
        {children}
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-1 px-5 py-6 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <span>Pragjyotish College</span>
          <span>Estd. 1954</span>
        </div>
      </footer>
    </div>
  );
}

export default PublicShell;
