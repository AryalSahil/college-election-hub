import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { DynamicFavicon } from "./components/DynamicFavicon";
import "./index.css";

// Lazy load route components for better code splitting
const Home = lazy(() => import("./pages/Home.tsx"));
const Winners = lazy(() => import("./pages/Winners.tsx"));
const Display = lazy(() => import("./pages/Display.tsx"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.tsx"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminElection = lazy(() => import("./pages/admin/AdminElection.tsx"));
const AdminPosts = lazy(() => import("./pages/admin/AdminPosts.tsx"));
const AdminCandidates = lazy(() => import("./pages/admin/AdminCandidates.tsx"));
const AdminVoting = lazy(() => import("./pages/admin/AdminVoting.tsx"));
const AdminResults = lazy(() => import("./pages/admin/AdminResults.tsx"));
const AdminNotifications = lazy(
  () => import("./pages/admin/AdminNotifications.tsx"),
);
const AdminPageControl = lazy(
  () => import("./pages/admin/AdminPageControl.tsx"),
);
const AdminActivity = lazy(() => import("./pages/admin/AdminActivity.tsx"));
const AdminOfficeBearers = lazy(
  () => import("./pages/admin/AdminOfficeBearers.tsx"),
);
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in the browser runtime). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(error: Error) {
    console.error("[Preview] Root crash:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="text-xs text-muted-foreground break-words mt-1">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 break-all max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <DynamicFavicon />
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              {/* The single public route — content controlled by Page Control */}
              <Route path="/" element={<Home />} />

              {/* Current Office Bearers + election history */}
              <Route path="/winners" element={<Winners />} />

              {/* Full-screen election/results display for projectors */}
              <Route path="/display" element={<Display />} />

              {/* Secure admin panel */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <RequireAdmin>
                    <AdminLayout />
                  </RequireAdmin>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="election" element={<AdminElection />} />
                <Route path="posts" element={<AdminPosts />} />
                <Route path="candidates" element={<AdminCandidates />} />
                <Route path="voting" element={<AdminVoting />} />
                <Route path="results" element={<AdminResults />} />
                <Route path="office-bearers" element={<AdminOfficeBearers />} />
                <Route
                  path="notifications"
                  element={<AdminNotifications />}
                />
                <Route path="page-control" element={<AdminPageControl />} />
                <Route path="activity" element={<AdminActivity />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
