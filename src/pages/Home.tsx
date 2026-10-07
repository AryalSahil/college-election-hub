import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CenteredLoader } from "@/components/Loader";
import { FadeIn } from "@/components/FadeIn";
import { PublicShell } from "@/components/PublicShell";
import { Seal } from "@/components/Seal";
import { VotingView } from "./home/VotingView";
import { ResultsView } from "./home/ResultsView";
import { NotificationsView } from "./home/NotificationsView";

/**
 * The single public route `/`.
 *
 * Which of the five states renders is decided on the server (see
 * `settings.publicState`), following the admin's Page Control priority:
 *   Maintenance > Voting > Results > Notifications > No Page Available.
 */
export default function Home() {
  const state = useQuery(api.settings.publicState);

  const branding = state?.branding;

  return (
    <PublicShell
      subtitle={
        branding
          ? `${branding.electionTitle} ${branding.year}`
          : "Election Portal"
      }
    >
      {state === undefined ? (
        <CenteredLoader label="Loading election" />
      ) : state.page === "maintenance" ? (
        <MaintenanceScreen />
      ) : state.page === "voting" ? (
        <VotingView />
      ) : state.page === "results" ? (
        <ResultsView />
      ) : state.page === "notifications" ? (
        <NotificationsView />
      ) : (
        <NoPageScreen />
      )}
    </PublicShell>
  );
}

function ScreenMark() {
  return (
    <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-border">
      <Seal className="size-10 text-primary" />
    </div>
  );
}

/** State 4 — nothing is enabled. */
function NoPageScreen() {
  return (
    <FadeIn className="flex flex-col items-center py-14 text-center sm:py-20">
      <ScreenMark />
      <p className="mt-6 text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
        Pragjyotish College
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        No Page Available
      </h1>
      <div className="mt-5 h-px w-14 bg-border" />
      <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
        There is currently no active election page.
      </p>
      <p className="mt-1 max-w-md text-base leading-relaxed text-muted-foreground">
        Please contact the election administrator for more information.
      </p>
    </FadeIn>
  );
}

/** State 5 — maintenance overrides every other state. */
function MaintenanceScreen() {
  return (
    <FadeIn className="flex flex-col items-center py-14 text-center sm:py-20">
      <ScreenMark />
      <p className="mt-6 text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
        Temporarily unavailable
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        Under Maintenance
      </h1>
      <div className="mt-5 h-px w-14 bg-border" />
      <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
        The election portal is temporarily unavailable.
      </p>
      <p className="mt-1 max-w-md text-base leading-relaxed text-muted-foreground">
        Please check again later.
      </p>
    </FadeIn>
  );
}
