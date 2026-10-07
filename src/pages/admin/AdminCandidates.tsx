import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2, UserRound } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/errors";
import { useAdminToken } from "@/lib/adminSession";

type CandidateRow = {
  _id: Id<"candidates">;
  postId: Id<"posts">;
  name: string;
  photoUrl?: string;
  department?: string;
  semester?: string;
  class?: string;
  symbol?: string;
  description?: string;
  active: boolean;
  postName: string;
};

type PostOption = { _id: Id<"posts">; name: string; active: boolean };

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; candidate: CandidateRow }
  | { mode: "delete"; candidate: CandidateRow }
  | null;

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Admin → Candidates: manage who appears under each post. */
export default function AdminCandidates() {
  const token = useAdminToken() ?? "";
  const data = useQuery(api.candidates.list, { token });
  const postData = useQuery(api.posts.list, { token });
  const createCandidate = useMutation(api.candidates.create);
  const updateCandidate = useMutation(api.candidates.update);
  const removeCandidate = useMutation(api.candidates.remove);

  const [dialog, setDialog] = useState<DialogState>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(true);
  const [filterPost, setFilterPost] = useState<string>("all");
  const [selectedPost, setSelectedPost] = useState<string>("");

  if (data === undefined || postData === undefined) {
    return <InlineLoader label="Loading candidates" />;
  }
  if (data === null || postData === null) return null;

  const posts: PostOption[] = postData.posts;
  const candidates =
    filterPost === "all"
      ? data.candidates
      : data.candidates.filter((candidate) => candidate.postId === filterPost);

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
    if (!selectedPost) {
      toast.error("Choose a post for this candidate.");
      return;
    }
    await run(
      () =>
        createCandidate({
          token,
          postId: selectedPost as Id<"posts">,
          name: String(formData.get("name") ?? ""),
          photoUrl: String(formData.get("photoUrl") ?? ""),
          department: String(formData.get("department") ?? ""),
          semester: String(formData.get("semester") ?? ""),
          class: String(formData.get("class") ?? ""),
          symbol: String(formData.get("symbol") ?? ""),
          description: String(formData.get("description") ?? ""),
        }),
      "Candidate added.",
    );
  }

  async function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    if (dialog?.mode !== "edit") return;
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (!selectedPost) {
      toast.error("Choose a post for this candidate.");
      return;
    }
    await run(
      () =>
        updateCandidate({
          token,
          candidateId: dialog.candidate._id,
          postId: selectedPost as Id<"posts">,
          name: String(formData.get("name") ?? ""),
          photoUrl: String(formData.get("photoUrl") ?? ""),
          department: String(formData.get("department") ?? ""),
          semester: String(formData.get("semester") ?? ""),
          class: String(formData.get("class") ?? ""),
          symbol: String(formData.get("symbol") ?? ""),
          description: String(formData.get("description") ?? ""),
          active,
        }),
      "Candidate updated.",
    );
  }

  async function handleDelete() {
    if (dialog?.mode !== "delete") return;
    await run(
      () => removeCandidate({ token, candidateId: dialog.candidate._id }),
      "Candidate deleted.",
    );
  }

  const formDefaults =
    dialog?.mode === "edit" ? dialog.candidate : undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Candidates"
        description="Only active candidates appear on the voting page. NOTA stays available on every post automatically."
        actions={
          <Button
            onClick={() => {
              setSelectedPost(posts[0]?._id ?? "");
              setDialog({ mode: "create" });
            }}
            disabled={posts.length === 0}
          >
            <Plus className="size-4" />
            Add candidate
          </Button>
        }
      />

      {posts.length === 0 && (
        <div className="rounded-md border border-dashed border-border px-5 py-6 text-sm text-muted-foreground">
          Create a post first — candidates belong to posts.
        </div>
      )}

      {posts.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Filter by post
          </span>
          <Select value={filterPost} onValueChange={setFilterPost}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All posts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All posts</SelectItem>
              {posts.map((post) => (
                <SelectItem key={post._id} value={post._id}>
                  {post.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Panel>
        <PanelHeader
          title={`Candidates (${candidates.length})`}
          description="Deactivating a candidate hides them from new ballots without affecting past votes."
        />
        {candidates.length === 0 ? (
          <PanelBody className="py-14 text-center">
            <UserRound className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No candidates here yet.
            </p>
          </PanelBody>
        ) : (
          <div className="divide-y divide-border/70">
            {candidates.map((candidate) => (
              <div
                key={candidate._id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <span
                    className={
                      "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border text-[11px] font-semibold uppercase tracking-wide " +
                      (candidate.active
                        ? "border-border text-muted-foreground"
                        : "border-border/60 text-muted-foreground/60")
                    }
                  >
                    {candidate.photoUrl ? (
                      <img
                        src={candidate.photoUrl}
                        alt=""
                        className="size-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      initialsOf(candidate.name)
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {candidate.name}
                      </span>
                      <span
                        className={
                          candidate.active
                            ? "rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground"
                            : "rounded-full border border-destructive/30 bg-destructive/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-destructive"
                        }
                      >
                        {candidate.active ? "Active" : "Inactive"}
                      </span>
                      {candidate.symbol && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                          {candidate.symbol}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {candidate.postName}
                      {candidate.department && ` · ${candidate.department}`}
                      {candidate.semester && ` · ${candidate.semester}`}
                      {candidate.class && ` · ${candidate.class}`}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Edit candidate"
                    onClick={() => {
                      setActive(candidate.active);
                      setSelectedPost(candidate.postId);
                      setDialog({ mode: "edit", candidate });
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Delete candidate"
                    onClick={() => setDialog({ mode: "delete", candidate })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Create / edit share one form dialog */}
      <Dialog
        open={dialog?.mode === "create" || dialog?.mode === "edit"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="tracking-tight">
              {dialog?.mode === "edit" ? "Edit candidate" : "Add candidate"}
            </DialogTitle>
            <DialogDescription>
              NOTA is added automatically to every post — do not create it as a
              candidate.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={dialog?.mode === "edit" ? handleEdit : handleCreate}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="candidate-name">Name</Label>
                <Input
                  id="candidate-name"
                  name="name"
                  defaultValue={formDefaults?.name}
                  placeholder="Candidate name"
                  required
                  maxLength={120}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="candidate-post">Election post</Label>
                <Select
                  value={selectedPost}
                  onValueChange={setSelectedPost}
                >
                  <SelectTrigger id="candidate-post" className="w-full">
                    <SelectValue placeholder="Select a post" />
                  </SelectTrigger>
                  <SelectContent>
                    {posts.map((post) => (
                      <SelectItem key={post._id} value={post._id}>
                        {post.name}
                        {!post.active ? " (disabled)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="candidate-dept">Department</Label>
                <Input
                  id="candidate-dept"
                  name="department"
                  defaultValue={formDefaults?.department}
                  placeholder="e.g. Commerce"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="candidate-semester">Semester</Label>
                <Input
                  id="candidate-semester"
                  name="semester"
                  defaultValue={formDefaults?.semester}
                  placeholder="e.g. 3rd"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="candidate-class">Class</Label>
                <Input
                  id="candidate-class"
                  name="class"
                  defaultValue={formDefaults?.class}
                  placeholder="e.g. B"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="candidate-symbol">Symbol (optional)</Label>
                <Input
                  id="candidate-symbol"
                  name="symbol"
                  defaultValue={formDefaults?.symbol}
                  placeholder="e.g. ★"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="candidate-photo">Photo URL (optional)</Label>
                <Input
                  id="candidate-photo"
                  name="photoUrl"
                  type="url"
                  defaultValue={formDefaults?.photoUrl}
                  placeholder="https://…"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="candidate-description">
                Short description (optional)
              </Label>
              <Textarea
                id="candidate-description"
                name="description"
                rows={2}
                defaultValue={formDefaults?.description}
                placeholder="One line about the candidate"
              />
            </div>

            {dialog?.mode === "edit" && (
              <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">
                    Inactive candidates are hidden from the ballot.
                  </p>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>
            )}

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
                {dialog?.mode === "edit" ? "Save changes" : "Add candidate"}
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
              Delete candidate?
            </DialogTitle>
            <DialogDescription>
              This removes{" "}
              <span className="font-medium text-foreground">
                {dialog?.mode === "delete" ? dialog.candidate.name : ""}
              </span>{" "}
              from the ballot. Candidates with votes cannot be deleted.
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
              Delete candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
