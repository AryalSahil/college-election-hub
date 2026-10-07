import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FadeIn } from "@/components/FadeIn";
import { CenteredLoader } from "@/components/Loader";

function formatWhen(timestamp: number | undefined, withTime: boolean) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/**
 * State 3 — the notifications page. Only announcements the admin has
 * published are returned, and only while `/` is set to Notifications.
 */
export function NotificationsView() {
  const data = useQuery(api.notifications.publicList);

  if (data === undefined) return <CenteredLoader label="Loading updates" />;
  if (data === null) return null;

  return (
    <FadeIn>
      <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-muted-foreground">
        Announcements
      </p>
      <h1 className="mt-3 text-2xl font-bold uppercase leading-tight tracking-[0.06em] sm:text-3xl">
        {data.election
          ? `${data.election.name} ${data.election.year}`
          : "Election Notifications"}
      </h1>
      <div className="mt-5 h-px w-full bg-border" />
      <h2 className="mt-6 text-lg font-semibold tracking-tight">
        Notifications
      </h2>

      {data.notifications.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border px-6 py-14 text-center">
          <p className="text-sm text-muted-foreground">
            There are no notifications right now. Please check again later.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          {data.notifications.map((notification) => {
            const when = notification.scheduledFor
              ? formatWhen(notification.scheduledFor, true)
              : formatWhen(notification.updatedAt, false);
            return (
              <article
                key={notification.id}
                className="border-b border-border/70 py-6 first:border-t first:border-border/70"
              >
                {when && (
                  <time className="block text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    {when}
                  </time>
                )}
                <h3 className="mt-2 text-base font-semibold tracking-tight sm:text-lg">
                  {notification.title}
                </h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {notification.content}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </FadeIn>
  );
}

export default NotificationsView;
