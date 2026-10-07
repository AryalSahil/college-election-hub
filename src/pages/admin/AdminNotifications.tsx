import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Bell, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
} from "@/components/admin/Panel";
import { InlineLoader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/datetime";
import { errorMessage } from "@/lib/errors";
import { useAdminToken } from "@/lib/adminSession";

type NotificationRow = {
  id: Id<"notifications">;
  title: string;
  content: string;
  published: boolean;
  scheduledFor?: number;
  updatedAt: number;
};

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; notification: NotificationRow }
  | { mode: "delete"; notification: NotificationRow }
  | null;

function formatWhen(timestamp?: number, withTime = false) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Admin → Notifications: announcements shown on the public page. */
export default function AdminNotifications() {
  const token = useAdminToken() ?? "";
  const data = useQuery(api.notifications.list, { token });
  const createNotification = useMutation(api.notifications.create);
  const updateNotification = useMutation(api.notifications.update);
  const removeNotification = useMutation(api.notifications.remove);

  const [dialog, setDialog] = useState<DialogState>(null);
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(true);

  if (data === undefined) return <InlineLoader label="Loading notifications" />;
  if (data === null) return null;

  const editing =
    dialog?.mode === "edit" ? dialog.notification : undefined;

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      setDialog(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await run(
      () =>
        createNotification({
          token,
          title: String(formData.get("title") ?? ""),
          content: String(formData.get("content") ?? ""),
          published,
          scheduledFor: fromDateTimeLocal(
            String(formData.get("scheduledFor") ?? ""),
          ),
        }),
      "Notification created.",
    );
  }

  async function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    if (dialog?.mode !== "edit") return;
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await run(
      () =>
        updateNotification({
          token,
          notificationId: dialog.notification.id,
          title: String(formData.get("title") ?? ""),
          content: String(formData.get("content") ?? ""),
          published,
          scheduledFor: fromDateTimeLocal(
            String(formData.get("scheduledFor") ?? ""),
          ),
        }),
      "Notification updated.",
    );
  }

  async function handleDelete() {
    if (dialog?.mode !== "delete") return;
    await run(
      () => removeNotification({ token, notificationId: dialog.notification.id }),
      "Notification deleted.",
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notifications"
        description="Published announcements appear on the public page when Page Control is set to Notifications."
        actions={
          <Button
            onClick={() => {
              setPublished(true);
              setDialog({ mode: "create" });
            }}
          >
            <Plus className="size-4" />
            New notification
          </Button>
        }
      />

      <Panel>
        <PanelHeader
          title={`All notifications (${data.notifications.length})`}
          description="Unpublished drafts stay hidden from students."
        />
        {data.notifications.length === 0 ? (
          <PanelBody className="py-14 text-center">
            <Bell className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No notifications yet. Announce voting times, results releases,
              and more.
            </p>
          </PanelBody>
        ) : (
          <div className="divide-y divide-border/70">
            {data.notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        notification.published
                          ? "rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary"
                          : "rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground"
                      }
                    >
                      {notification.published ? "Published" : "Draft"}
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {formatWhen(
                        notification.scheduledFor ?? notification.updatedAt,
                        Boolean(notification.scheduledFor),
                      )}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold">
                    {notification.title}
                  </h3>
                  <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                    {notification.content}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Edit notification"
                    onClick={() => {
                      setPublished(notification.published);
                      setDialog({ mode: "edit", notification });
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Delete notification"
                    onClick={() =>
                      setDialog({ mode: "delete", notification })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Create / edit */}
      <Dialog
        open={dialog?.mode === "create" || dialog?.mode === "edit"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="tracking-tight">
              {dialog?.mode === "edit" ? "Edit notification" : "New notification"}
            </DialogTitle>
            <DialogDescription>
              Students see published notifications on the public page.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={dialog?.mode === "edit" ? handleEdit : handleCreate}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="notif-title">Title</Label>
              <Input
                id="notif-title"
                name="title"
                defaultValue={editing?.title}
                placeholder="e.g. Voting Starts Tomorrow"
                required
                maxLength={160}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-content">Description</Label>
              <Textarea
                id="notif-content"
                name="content"
                rows={4}
                defaultValue={editing?.content}
                placeholder="Voting will begin at 10:00 AM."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-when">Date / time (optional)</Label>
              <Input
                id="notif-when"
                name="scheduledFor"
                type="datetime-local"
                defaultValue={toDateTimeLocal(editing?.scheduledFor)}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Publish</p>
                <p className="text-xs text-muted-foreground">
                  Drafts are never shown to students.
                </p>
              </div>
              <Switch checked={published} onCheckedChange={setPublished} />
            </div>
            <DialogFooter className="gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialog(null)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                {dialog?.mode === "edit" ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={dialog?.mode === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="tracking-tight">
              Delete notification?
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">
                {dialog?.mode === "delete" ? dialog.notification.title : ""}
              </span>{" "}
              will be removed permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setDialog(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={busy}
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
