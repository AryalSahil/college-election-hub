import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { Award, ChevronLeft, History } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Seal } from "@/components/Seal";
import { CenteredLoader } from "@/components/Loader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Bearer = {
  id: string;
  name: string;
  position: string;
  photoUrl: string | null;
  department?: string;
  semester?: string;
  className?: string;
  electionYear?: string;
  termStart?: string;
  termEnd?: string;
  description?: string;
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function metaLine(bearer: Bearer): string {
  return [bearer.department, bearer.semester, bearer.className]
    .filter(Boolean)
    .join(" • ");
}

function termLine(bearer: Bearer): string | null {
  if (bearer.termStart && bearer.termEnd) {
    return `${bearer.termStart} – ${bearer.termEnd}`;
  }
  return bearer.termStart ?? bearer.termEnd ?? null;
}

/** Winner card — photo, name, position, meta, year, term, serving status. */
function WinnerCard({
  bearer,
  onOpen,
  serving,
}: {
  bearer: Bearer;
  onOpen: (bearer: Bearer) => void;
  serving?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(bearer)}
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-border bg-muted">
        {bearer.photoUrl ? (
          <img
            src={bearer.photoUrl}
            alt={bearer.name}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <span className="flex size-full items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-full border border-border bg-background text-lg font-semibold text-primary">
              {initialsOf(bearer.name)}
            </span>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {bearer.position}
        </p>
        <p className="text-base font-semibold tracking-tight">{bearer.name}</p>
        {metaLine(bearer) && (
          <p className="text-xs text-muted-foreground">{metaLine(bearer)}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {bearer.electionYear ? `Elected: ${bearer.electionYear}` : ""}
          {bearer.electionYear && termLine(bearer) ? " · " : ""}
          {termLine(bearer)}
        </p>
        {serving !== undefined && (
          <span
            className={[
              "mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
              serving
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                : "border-border bg-muted text-muted-foreground",
            ].join(" ")}
          >
            <span
              className={[
                "size-1.5 rounded-full",
                serving ? "bg-emerald-500" : "bg-muted-foreground/50",
              ].join(" ")}
            />
            {serving ? "Currently Serving" : "Past Winner"}
          </span>
        )}
      </div>
    </button>
  );
}

/**
 * `/winners` — Current Office Bearers + Past Election Winners. Public by
 * design, independent of the voting page: access is gated only by the
 * admin's "Show Current Office Bearers Page" setting.
 */
export default function Winners() {
  const data = useQuery(api.officeBearers.publicWinners);

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [detail, setDetail] = useState<Bearer | null>(null);

  const activeYear = useMemo(() => {
    if (!data) return null;
    const years = data.years.map((entry) => entry.year);
    if (selectedYear && years.includes(selectedYear)) return selectedYear;
    return years[0] ?? null;
  }, [data, selectedYear]);

  if (data === undefined) {
    return <CenteredLoader label="Loading office bearers" />;
  }

  if (!data.enabled) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center text-foreground">
        <Seal className="size-12 text-primary" />
        <h1 className="mt-4 text-lg font-semibold tracking-tight">
          Page unavailable
        </h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          The Office Bearers page is not currently published. Please check back
          later.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ChevronLeft className="size-4" />
          Back to the election portal
        </Link>
      </div>
    );
  }

  const collegeName = data.branding.collegeName || "Pragjyotish College";
  const activeEntry = data.years.find((entry) => entry.year === activeYear);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Header — college logo + page title */}
      <header className="border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-5 py-8 text-center sm:py-10">
          {data.branding.logoUrl ? (
            <img
              src={data.branding.logoUrl}
              alt={`${collegeName} logo`}
              className="size-16 object-contain sm:size-20"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <Seal className="size-14 text-primary sm:size-16" />
          )}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-muted-foreground">
              {collegeName}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Current Office Bearers
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {collegeName} — Elected Representatives
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" />
            Election portal
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16 pt-10">
        {/* ---------------------------------------------------------- */}
        {/* Currently Serving                                          */}
        {/* ---------------------------------------------------------- */}
        <section>
          <div className="flex items-center gap-2.5">
            <Award className="size-4 text-emerald-600" />
            <h2 className="text-lg font-semibold tracking-tight">
              Currently Serving
            </h2>
          </div>
          {data.current.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 px-5 py-8 text-center text-sm text-muted-foreground">
              Current office bearers will be published here after the election
              results are confirmed.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.current.map((bearer) => (
                <WinnerCard
                  key={bearer.id}
                  bearer={bearer}
                  serving
                  onOpen={setDetail}
                />
              ))}
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Election History                                           */}
        {/* ---------------------------------------------------------- */}
        {data.years.length > 0 && (
          <section className="mt-14">
            <div className="flex items-center gap-2.5">
              <History className="size-4 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight">
                Past Election Winners
              </h2>
            </div>

            {/* Year selector: scrollable chips on mobile, same on desktop */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {data.years.map((entry) => (
                <button
                  key={entry.year}
                  type="button"
                  onClick={() => setSelectedYear(entry.year)}
                  className={[
                    "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                    entry.year === activeYear
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {entry.year}
                </button>
              ))}
            </div>

            {activeEntry ? (
              <div className="mt-6 space-y-5">
                <h3 className="text-xl font-bold tracking-tight">
                  {activeEntry.year}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeEntry.bearers.map((bearer) => (
                    <WinnerCard
                      key={bearer.id}
                      bearer={bearer}
                      serving={bearer.current ? true : undefined}
                      onOpen={setDetail}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 px-5 py-8 text-center text-sm text-muted-foreground">
                No election history has been published yet.
              </p>
            )}
          </section>
        )}
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto w-full max-w-5xl px-5 py-6 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {collegeName}
        </div>
      </footer>

      {/* ---------------------------------------------------------- */}
      {/* Winner detail modal                                        */}
      {/* ---------------------------------------------------------- */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-left tracking-tight">
                  {detail.position}
                </DialogTitle>
                <DialogDescription className="text-left">
                  {detail.electionYear
                    ? `Elected in ${detail.electionYear}`
                    : "Elected representative"}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="size-28 overflow-hidden rounded-full border border-border bg-muted">
                  {detail.photoUrl ? (
                    <img
                      src={detail.photoUrl}
                      alt={detail.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-2xl font-semibold text-primary">
                      {initialsOf(detail.name)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-tight">
                    {detail.name}
                  </p>
                  {metaLine(detail) && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {metaLine(detail)}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {detail.electionYear ? `Elected: ${detail.electionYear}` : ""}
                    {detail.electionYear && termLine(detail) ? " · " : ""}
                    {termLine(detail)}
                  </p>
                </div>
                {detail.description && (
                  <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                    {detail.description}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
