import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { KeyRound, Loader2, LogOut } from "lucide-react";
import { api } from "@/convex/_generated/api";
import {
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
} from "@/components/admin/Panel";
import { InlineLoader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/errors";
import { setAdminToken, useAdminToken } from "@/lib/adminSession";

/** Admin → Settings: password management and session controls. */
export default function AdminSettings() {
  const token = useAdminToken() ?? "";
  const status = useQuery(api.adminAuth.status);
  const changePassword = useMutation(api.adminAuth.changePassword);
  const logout = useMutation(api.adminAuth.logout);
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === undefined) return <InlineLoader label="Loading settings" />;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    const form = event.currentTarget;
    setBusy(true);
    setError(null);
    try {
      const result = await changePassword({
        token,
        currentPassword,
        newPassword,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Password change invalidates old sessions; keep this browser signed in.
      setAdminToken(result.token);
      toast.success("Password changed. Other sessions were signed out.");
      form.reset();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      if (token) await logout({ token });
    } catch {
      // Session may already be invalid server-side.
    }
    setAdminToken(null);
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Secure the admin panel and manage this session."
      />

      <Panel>
        <PanelHeader
          title="Change admin password"
          description={
            status.passwordSet
              ? "Changing the password signs out every other session."
              : "No password has been created yet."
          }
        />
        <form onSubmit={handleSubmit}>
          <PanelBody className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </PanelBody>
          <div className="flex justify-end border-t border-border px-5 py-4">
            <Button type="submit" disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 size-4" />
              )}
              Change password
            </Button>
          </div>
        </form>
      </Panel>

      <Panel>
        <PanelHeader
          title="This session"
          description="Sessions expire automatically after 7 days."
        />
        <PanelBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            You are signed in on this device. Signing out here ends the
            session immediately.
          </p>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="About" />
        <PanelBody className="text-sm leading-relaxed text-muted-foreground">
          College Election Portal — version 1. A single administrator controls
          the public page; students need no account and vote without signing
          in. Activity logs record every important change.
        </PanelBody>
      </Panel>
    </div>
  );
}
