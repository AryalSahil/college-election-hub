import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminToken } from "@/lib/adminSession";
import { CenteredLoader } from "@/components/Loader";

/**
 * Guards every `/admin/*` route. The session is validated server-side on
 * every render; an invalid or missing token bounces to /admin/login, and the
 * server independently re-validates the token on every admin mutation.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const token = useAdminToken();
  const session = useQuery(
    api.adminAuth.session,
    token ? { token } : "skip",
  );

  if (!token) return <Navigate to="/admin/login" replace />;
  if (session === undefined) {
    return <CenteredLoader label="Verifying session" />;
  }
  if (!session) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export default RequireAdmin;
