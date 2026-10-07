import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import {
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
  StatusPill,
} from "@/components/admin/Panel";
import { InlineLoader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/errors";
import { useAdminToken } from "@/lib/adminSession";
import { ELECTION_STATUS_LABELS, type ElectionStatusKey } from "@/lib/labels";

/** Admin → Election: edit the election's identity and lifecycle status. */
export default function AdminElection() {
  const token = useAdminToken() ?? "";
  const data = useQuery(api.settings.get, { token });
  const updateElection = useMutation(api.election.update);

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<ElectionStatusKey | null>(null);

  if (data === undefined) return <InlineLoader label="Loading election" />;
  if (data === null) return null;

  const election = data.election;
  const currentStatus: ElectionStatusKey = (status ??
    election?.status ??
    "draft") as ElectionStatusKey;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await updateElection({
        token,
        name: String(formData.get("name") ?? ""),
        year: String(formData.get("year") ?? ""),
        status: currentStatus,
        description: String(formData.get("description") ?? ""),
      });
      toast.success("Election updated.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Election"
        description="The name and year shown at the top of every public page."
        actions={
          <StatusPill
            label={
              election
                ? ELECTION_STATUS_LABELS[
                    election.status as keyof typeof ELECTION_STATUS_LABELS
                  ]
                : "Not created"
            }
            color={
              election?.status === "active"
                ? "green"
                : election?.status === "completed"
                  ? "gray"
                  : "amber"
            }
          />
        }
      />

      <Panel>
        <PanelHeader
          title="Election details"
          description="Saved values are used on the voting page, results, and notifications."
        />
        <form onSubmit={handleSubmit}>
          <PanelBody className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Election name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={election?.name ?? "Pragjyotish College Election"}
                  placeholder="Pragjyotish College Election"
                  required
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  name="year"
                  defaultValue={
                    election?.year ?? String(new Date().getFullYear())
                  }
                  placeholder="2026"
                  required
                  maxLength={20}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={currentStatus}
                  onValueChange={(value) =>
                    setStatus(value as ElectionStatusKey)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(ELECTION_STATUS_LABELS) as [
                        ElectionStatusKey,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Shown on the dashboard; use Voting status to open or close
                  submissions.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={election?.description ?? ""}
                placeholder="Short note about this election"
                rows={3}
              />
            </div>
          </PanelBody>
          <div className="flex justify-end border-t border-border px-5 py-4">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
