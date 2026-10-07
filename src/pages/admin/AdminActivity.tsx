import { useQuery } from "convex/react";
import { ScrollText } from "lucide-react";
import { api } from "@/convex/_generated/api";
import {
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
} from "@/components/admin/Panel";
import { InlineLoader } from "@/components/Loader";
import { useAdminToken } from "@/lib/adminSession";

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Admin → Activity Logs: an audit trail of important operations. */
export default function AdminActivity() {
  const token = useAdminToken() ?? "";
  const data = useQuery(api.activity.list, { token });

  if (data === undefined) return <InlineLoader label="Loading activity" />;
  if (data === null) return null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Activity Logs"
        description="Every important admin operation, newest first."
      />

      <Panel>
        <PanelHeader
          title={`Recent activity (${data.logs.length})`}
          description="The latest 150 events are kept here."
        />
        {data.logs.length === 0 ? (
          <PanelBody className="py-14 text-center">
            <ScrollText className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No activity recorded yet.
            </p>
          </PanelBody>
        ) : (
          <div className="divide-y divide-border/70">
            {data.logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:gap-4"
              >
                <span className="w-44 shrink-0 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  {formatTime(log.createdAt)}
                </span>
                <span className="w-40 shrink-0 rounded border border-border bg-muted/60 px-2 py-0.5 text-center font-mono text-[11px]">
                  {log.action}
                </span>
                <span className="min-w-0 text-sm">{log.detail}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
