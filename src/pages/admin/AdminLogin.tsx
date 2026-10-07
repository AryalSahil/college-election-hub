import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Brand } from "@/components/Brand";
import { CenteredLoader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/errors";
import { setAdminToken, useAdminToken } from "@/lib/adminSession";

/**
 * `/admin/login` — the only authenticated entry point. The single admin
 * password is verified server-side; nothing secret ever ships to the client.
 * On first run it offers to create the password.
 */
export default function AdminLogin() {
  const token = useAdminToken();
  const status = useQuery(api.adminAuth.status);
  const session = useQuery(
    api.adminAuth.session,
    token ? { token } : "skip",
  );
  const setup = useMutation(api.adminAuth.setup);
  const login = useMutation(api.adminAuth.login);
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (session === true) navigate("/admin", { replace: true });
  }, [session, navigate]);

  if (status === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <CenteredLoader label="Loading" />
      </main>
    );
  }

  const isSetup = status.passwordSet === false;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");

    if (isSetup && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = isSetup
        ? await setup({ password })
        : await login({ password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAdminToken(result.token);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Brand subtitle="Admin Panel" markClassName="size-10" />
        </div>

        <div className="mt-8 rounded-lg border border-border bg-card">
          <div className="border-b border-border px-6 py-5 text-center">
            <h1 className="text-lg font-semibold tracking-tight">
              {isSetup ? "Create admin password" : "Admin sign in"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSetup
                ? "This password controls the entire election portal. You'll use it to sign in."
                : "Enter your password to manage the election."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={
                    isSetup ? "new-password" : "current-password"
                  }
                  placeholder={isSetup ? "At least 8 characters" : "••••••••"}
                  required
                  minLength={isSetup ? 8 : 1}
                  disabled={busy}
                  autoFocus
                />
              </div>

              {isSetup && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat the password"
                    required
                    minLength={8}
                    disabled={busy}
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                  />
                </div>
              )}

              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Please wait…
                  </>
                ) : (
                  <>
                    {isSetup ? "Create password & continue" : "Sign in"}
                    <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link
            to="/"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            View the public election page
          </Link>
        </p>
      </div>
    </main>
  );
}
