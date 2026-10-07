import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  ListOrdered,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
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
import { errorMessage } from "@/lib/errors";
import { useAdminToken } from "@/lib/adminSession";

type PostRow = {
  _id: Id<"posts">;
  name: string;
  description?: string;
  displayOrder: number;
  active: boolean;
  candidateCount: number;
};

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; post: PostRow }
  | { mode: "delete"; post: PostRow }
  | null;

/** Admin → Posts: add, edit, reorder, enable/disable, and delete posts. */
export default function AdminPosts() {
  const token = useAdminToken() ?? "";
  const data = useQuery(api.posts.list, { token });
  const createPost = useMutation(api.posts.create);
  const updatePost = useMutation(api.posts.update);
  const removePost = useMutation(api.posts.remove);
  const movePost = useMutation(api.posts.move);

  const [dialog, setDialog] = useState<DialogState>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(true);

  if (data === undefined) return <InlineLoader label="Loading posts" />;
  if (data === null) return null;

  const posts = data.posts;

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
        createPost({
          token,
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? ""),
        }),
      "Post added.",
    );
  }

  async function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    if (dialog?.mode !== "edit") return;
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await run(
      () =>
        updatePost({
          token,
          postId: dialog.post._id,
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? ""),
          active,
        }),
      "Post updated.",
    );
  }

  async function handleDelete() {
    if (dialog?.mode !== "delete") return;
    await run(
      () => removePost({ token, postId: dialog.post._id }),
      "Post deleted.",
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Posts"
        description="Each post is one position on the ballot. NOTA is added to every post automatically."
        actions={
          <Button onClick={() => setDialog({ mode: "create" })}>
            <Plus className="size-4" />
            Add post
          </Button>
        }
      />

      <Panel>
        <PanelHeader
          title={`Posts (${posts.length})`}
          description="Use the arrows to control the order students see."
        />
        {posts.length === 0 ? (
          <PanelBody className="py-14 text-center">
            <ListOrdered className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No posts yet. Add your first post to start building the ballot.
            </p>
          </PanelBody>
        ) : (
          <div className="divide-y divide-border/70">
            {posts.map((post, index) => (
              <div
                key={post._id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <span className="mt-0.5 w-6 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{post.name}</span>
                      <span
                        className={
                          post.active
                            ? "rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground"
                            : "rounded-full border border-destructive/30 bg-destructive/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-destructive"
                        }
                      >
                        {post.active ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {post.description || "No description"} ·{" "}
                      {post.candidateCount} candidate
                      {post.candidateCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Move up"
                    disabled={index === 0 || busy}
                    onClick={() =>
                      run(
                        () =>
                          movePost({
                            token,
                            postId: post._id,
                            direction: "up",
                          }),
                        "Order updated.",
                      )
                    }
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Move down"
                    disabled={index === posts.length - 1 || busy}
                    onClick={() =>
                      run(
                        () =>
                          movePost({
                            token,
                            postId: post._id,
                            direction: "down",
                          }),
                        "Order updated.",
                      )
                    }
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  <div className="mx-1 h-6 w-px bg-border" />
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Edit post"
                    onClick={() => {
                      setActive(post.active);
                      setDialog({ mode: "edit", post });
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Delete post"
                    onClick={() => setDialog({ mode: "delete", post })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Create */}
      <Dialog
        open={dialog?.mode === "create"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="tracking-tight">Add post</DialogTitle>
            <DialogDescription>
              Students will choose one option for this post.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="post-name">Post name</Label>
              <Input
                id="post-name"
                name="name"
                placeholder="e.g. General Secretary"
                required
                maxLength={120}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-description">
                Description (optional)
              </Label>
              <Textarea
                id="post-description"
                name="description"
                rows={3}
                placeholder="What does this position do?"
              />
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
                Add post
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog
        open={dialog?.mode === "edit"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="tracking-tight">Edit post</DialogTitle>
            <DialogDescription>
              Rename the post, edit its description, or disable it from the
              ballot.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Post name</Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={dialog?.mode === "edit" ? dialog.post.name : ""}
                required
                maxLength={120}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">
                Description (optional)
              </Label>
              <Textarea
                id="edit-description"
                name="description"
                rows={3}
                defaultValue={
                  dialog?.mode === "edit" ? dialog.post.description ?? "" : ""
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  Disabled posts do not appear on the ballot.
                </p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
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
                Save changes
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
            <DialogTitle className="tracking-tight">Delete post?</DialogTitle>
            <DialogDescription>
              This removes{" "}
              <span className="font-medium text-foreground">
                {dialog?.mode === "delete" ? dialog.post.name : ""}
              </span>{" "}
              and its candidates. Posts with votes cannot be deleted.
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
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
