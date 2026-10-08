import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Eye,
  History,
  Loader2,
  Pencil,
  Plus,
  PowerOff,
  Trash2,
  Trophy,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
  StatusPill,
} from "@/components/admin/Panel";
import { ImageUploader, type ImageDraft } from "@/components/ImageUploader";
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
import { errorMessage } from "@/lib/errors";
import { useAdminToken } from "@/lib/adminSession";

type Bearer = {
  id: Id<"officeBearers">;
  name: string;
  position: string;
  electionYear: string;
  department?: string;
  semester?: string;
  className?: string;
  photoUrl: string | null;
  photoStorageId: Id<"_storage"> | null;
  termStart?: string;
  termEnd?: string;
  description?: string;
  current: boolean;
};

type FormState = {
  name: string;
  position: string;
  electionYear: string;
  department: string;
  semester: string;
  className: string;
  termStart: string;
  termEnd: string;
  description: string;
  current: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  position: "",
  electionYear: String(new Date().getFullYear()),
  department: "",
  semester: "",
  className: "",
  termStart: "",
  termEnd: "",
  description: "",
  current: true,
};

type DialogMode =
  | { kind: "closed" }
  | { kind: "add"; current: boolean }
  | { kind: "edit"; bearer: Bearer }
  | { kind: "view"; bearer: Bearer }
  | { kind: "delete"; bearer: Bearer };

/**
 * Admin → Office Bearers: manage who is *currently* holding each position
 * (Current Office Bearers) and curate past election results by year
 * (Election History). Winning an election never auto-promotes anyone here;
 * the admin decides who is currently serving.
 */
export default function AdminOfficeBearers() {
  const token = useAdminToken() ?? "";
  const bearers = useQuery(api.officeBearers.list, { token });
  const addBearer = useMutation(api.officeBearers.add);
  const updateBearer = useMutation(api.officeBearers.update);
  const setServing = useMutation(api.officeBearers.setServing);
  const removeBearer = useMutation(api.officeBearers.remove);

  const [mode, setMode] = useState<DialogMode>({ kind: "closed" });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [photoDraft, setPhotoDraft] = useState<ImageDraft | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [busy, setBusy] = useState(false);

  const currentBearers = useMemo(
    () => (bearers ?? []).filter((bearer) => bearer.current),
    [bearers],
  );
  const historyBearers = useMemo(
    () => (bearers ?? []).filter((bearer) => !bearer.current),
    [bearers],
  );

  function openAdd(current: boolean) {
    setForm({ ...EMPTY_FORM, current });
    setPhotoDraft(null);
    setPhotoRemoved(false);
    setMode({ kind: "add", current });
  }

  function openEdit(bearer: Bearer) {
    setForm({
      name: bearer.name,
      position: bearer.position,
      electionYear: bearer.electionYear,
      department: bearer.department ?? "",
      semester: bearer.semester ?? "",
      className: bearer.className ?? "",
      termStart: bearer.termStart ?? "",
      termEnd: bearer.termEnd ?? "",
      description: bearer.description ?? "",
      current: bearer.current,
    });
    setPhotoDraft(null);
    setPhotoRemoved(false);
    setMode({ kind: "edit", bearer });
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        token,
        name: form.name,
        position: form.position,
        electionYear: form.electionYear.trim(),
        department: form.department || undefined,
        semester: form.semester || undefined,
        className: form.className || undefined,
        termStart: form.termStart || undefined,
        termEnd: form.termEnd || undefined,
        description: form.description || undefined,
        current: form.current,
        ...(photoDraft ? { photoStorageId: photoDraft.storageId } : {}),
        ...(!photoDraft && photoRemoved ? { photoRemoved: true } : {}),
      };
      if (mode.kind === "edit") {
        await updateBearer({ ...payload, id: mode.bearer.id });
        toast.success("Office bearer updated.");
      } else {
        await addBearer(payload);
        toast.success(
          form.current
            ? "Added to Current Office Bearers."
            : "Added to Election History.",
        );
      }
      setMode({ kind: "closed" });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleServing(bearer: Bearer) {
    try {
      await setServing({ token, id: bearer.id, current: !bearer.current });
      toast.success(
        bearer.current
          ? `${bearer.name} moved to Election History.`
          : `${bearer.name} marked as Currently Serving.`,
      );
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function handleDelete() {
    if (mode.kind !== "delete") return;
    setBusy(true);
    try {
      await removeBearer({ token, id: mode.bearer.id });
      toast.success("Entry deleted.");
      setMode({ kind: "closed" });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (bearers === undefined) {
    return <InlineLoader label="Loading office bearers" />;
  }

  const dialogOpen = mode.kind !== "closed";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Office Bearers"
        description="Manage who is currently serving and curate past election winners by year. Winning an election never changes this automatically — you decide who is currently serving."
        actions={
          <>
            <Button className="gap-2" onClick={() => openAdd(true)}>
              <Plus className="size-4" />
              Add Office Bearer
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => openAdd(false)}>
              <Plus className="size-4" />
              Add Past Winner
            </Button>
          </>
        }
      />

      {/* ---------------------------------------------------------- */}
      {/* Current Office Bearers                                     */}
      {/* ---------------------------------------------------------- */}
      <Panel>
        <PanelHeader
          title="Current Office Bearers"
          description="People currently holding elected positions — shown on the public /winners page."
          action={
            <StatusPill label={`${currentBearers.length} serving`} color="green" />
          }
        />
        <PanelBody className="p-0">
          {currentBearers.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No current office bearers. Add one, or move a past winner back
              into office.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {currentBearers.map((bearer) => (
                <li
                  key={bearer.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                >
                  <div className="size-11 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                    {bearer.photoUrl ? (
                      <img
                        src={bearer.photoUrl}
                        alt={bearer.name}
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {bearer.name}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {bearer.position}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        bearer.department,
                        bearer.semester,
                        bearer.className,
                        `Elected ${bearer.electionYear}`,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                  <StatusPill label="Currently Serving" color="green" />
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View"
                      onClick={() => setMode({ kind: "view", bearer })}
                    >
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit"
                      onClick={() => openEdit(bearer)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Remove from current office"
                      onClick={() => void toggleServing(bearer)}
                    >
                      <PowerOff className="size-4 text-amber-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      onClick={() => setMode({ kind: "delete", bearer })}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>

      {/* ---------------------------------------------------------- */}
      {/* Election History                                           */}
      {/* ---------------------------------------------------------- */}
      <Panel>
        <PanelHeader
          title="Election History"
          description="Past winners grouped by election year. Add unlimited years — they are never hard-coded."
          action={
            <StatusPill label={`${historyBearers.length} past`} color="navy" />
          }
        />
        <PanelBody className="p-0">
          {historyBearers.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              <History className="mx-auto mb-2 size-5 text-muted-foreground/60" />
              No past winners yet. Add one with “Add Past Winner”.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {historyBearers.map((bearer) => (
                <li
                  key={bearer.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                >
                  <div className="size-11 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                    {bearer.photoUrl ? (
                      <img
                        src={bearer.photoUrl}
                        alt={bearer.name}
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      <Trophy className="mr-1.5 inline size-3.5 text-primary" />
                      {bearer.name}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {bearer.position}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        bearer.department,
                        bearer.semester,
                        bearer.className,
                        `Elected ${bearer.electionYear}`,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                  <StatusPill label={bearer.electionYear} color="gray" />
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View"
                      onClick={() => setMode({ kind: "view", bearer })}
                    >
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit"
                      onClick={() => openEdit(bearer)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Mark as currently serving"
                      onClick={() => void toggleServing(bearer)}
                    >
                      <PowerOff className="size-4 text-emerald-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      onClick={() => setMode({ kind: "delete", bearer })}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>

      {/* ---------------------------------------------------------- */}
      {/* Add / Edit / View / Delete dialogs                         */}
      {/* ---------------------------------------------------------- */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setMode({ kind: "closed" })}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          {mode.kind === "view" ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-left tracking-tight">
                  {mode.bearer.position}
                </DialogTitle>
                <DialogDescription className="text-left">
                  Elected in {mode.bearer.electionYear}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="size-24 overflow-hidden rounded-full border border-border bg-muted">
                  {mode.bearer.photoUrl ? (
                    <img
                      src={mode.bearer.photoUrl}
                      alt={mode.bearer.name}
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                <div>
                  <p className="text-lg font-semibold">{mode.bearer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[
                      mode.bearer.department,
                      mode.bearer.semester,
                      mode.bearer.className,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[
                      mode.bearer.termStart && mode.bearer.termEnd
                        ? `Term: ${mode.bearer.termStart} – ${mode.bearer.termEnd}`
                        : mode.bearer.termStart || mode.bearer.termEnd
                          ? `Term: ${mode.bearer.termStart ?? mode.bearer.termEnd}`
                          : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                </div>
                {mode.bearer.description && (
                  <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                    {mode.bearer.description}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => openEdit(mode.bearer)}>
                  Edit
                </Button>
                <Button onClick={() => setMode({ kind: "closed" })}>Close</Button>
              </DialogFooter>
            </>
          ) : mode.kind === "delete" ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-left tracking-tight">
                  Delete this entry?
                </DialogTitle>
                <DialogDescription className="text-left">
                  {mode.bearer.name} — {mode.bearer.position} (
                  {mode.bearer.electionYear}) will be permanently removed
                  {mode.bearer.current
                    ? " from Current Office Bearers"
                    : " from Election History"}
                  . This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setMode({ kind: "closed" })}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => void handleDelete()}
                >
                  {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Delete
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle className="text-left tracking-tight">
                  {mode.kind === "edit" ? "Edit Office Bearer" : "Add Winner"}
                </DialogTitle>
                <DialogDescription className="text-left">
                  {mode.current
                    ? "Shown under Current Office Bearers on /winners."
                    : "Kept in Election History for the selected year."}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="ob-name">Full name</Label>
                  <Input
                    id="ob-name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    maxLength={80}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-position">Position</Label>
                  <Input
                    id="ob-position"
                    value={form.position}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        position: event.target.value,
                      }))
                    }
                    placeholder="e.g. General Secretary"
                    maxLength={80}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-year">Election year</Label>
                  <Input
                    id="ob-year"
                    value={form.electionYear}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        electionYear: event.target.value,
                      }))
                    }
                    placeholder="e.g. 2026"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-department">Department</Label>
                  <Input
                    id="ob-department"
                    value={form.department}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        department: event.target.value,
                      }))
                    }
                    placeholder="e.g. BCA"
                    maxLength={80}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-semester">Semester / Class</Label>
                  <Input
                    id="ob-semester"
                    value={form.semester}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        semester: event.target.value,
                      }))
                    }
                    placeholder="e.g. 3rd Semester"
                    maxLength={40}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-term-start">Term start</Label>
                  <Input
                    id="ob-term-start"
                    value={form.termStart}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        termStart: event.target.value,
                      }))
                    }
                    placeholder="e.g. 2026"
                    maxLength={40}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-term-end">Term end</Label>
                  <Input
                    id="ob-term-end"
                    value={form.termEnd}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        termEnd: event.target.value,
                      }))
                    }
                    placeholder="e.g. 2027"
                    maxLength={40}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="ob-description">Description</Label>
                  <Input
                    id="ob-description"
                    value={form.description}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Short description (optional)"
                    maxLength={600}
                  />
                </div>
                <div className="sm:col-span-2">
                  <ImageUploader
                    kind="winner"
                    label="Photo"
                    existingUrl={mode.kind === "edit" ? mode.bearer.photoUrl : null}
                    draft={photoDraft}
                    removed={photoRemoved}
                    onDraft={setPhotoDraft}
                    onRemoved={setPhotoRemoved}
                    aspect="square"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3 sm:col-span-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Current office bearer</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      ON shows them under Current Office Bearers; OFF keeps them
                      in Election History.
                    </p>
                  </div>
                  <Switch
                    checked={form.current}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, current: checked }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setMode({ kind: "closed" })}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {mode.kind === "edit" ? "Save changes" : "Add"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
