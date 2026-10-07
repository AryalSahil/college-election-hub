import { useState, type ReactNode } from "react";
import { Outlet, useNavigate } from "react-router";
import { useMutation } from "convex/react";
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Maximize,
  Menu,
  Minimize,
  Monitor,
  MonitorUp,
  ScrollText,
  Settings as SettingsIcon,
  Users,
  Vote,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Brand } from "@/components/Brand";
import { NavLink } from "@/components/admin/NavLink";
import { Button } from "@/components/ui/button";
import { useFullscreen } from "@/hooks/use-fullscreen";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { setAdminToken, useAdminToken } from "@/lib/adminSession";

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      {
        to: "/admin",
        label: "Dashboard",
        icon: <LayoutDashboard className="size-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Election",
    items: [
      {
        to: "/admin/election",
        label: "Election",
        icon: <Vote className="size-4" />,
      },
      {
        to: "/admin/posts",
        label: "Posts",
        icon: <ListOrdered className="size-4" />,
      },
      {
        to: "/admin/candidates",
        label: "Candidates",
        icon: <Users className="size-4" />,
      },
      {
        to: "/admin/voting",
        label: "Voting",
        icon: <Monitor className="size-4" />,
      },
      {
        to: "/admin/results",
        label: "Results",
        icon: <BarChart3 className="size-4" />,
      },
      {
        to: "/admin/notifications",
        label: "Notifications",
        icon: <Bell className="size-4" />,
      },
    ],
  },
  {
    label: "Control",
    items: [
      {
        to: "/admin/page-control",
        label: "Page Control",
        icon: <ScrollText className="size-4" />,
      },
      {
        to: "/admin/activity",
        label: "Activity Logs",
        icon: <ListOrdered className="size-4" />,
      },
      {
        to: "/admin/settings",
        label: "Settings",
        icon: <SettingsIcon className="size-4" />,
      },
    ],
  },
];

/**
 * The authenticated admin shell: fixed sidebar on desktop, sheet menu on
 * mobile, and an <Outlet /> for the ten admin screens.
 */
export default function AdminLayout() {
  const token = useAdminToken();
  const logout = useMutation(api.adminAuth.logout);
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { active: fullscreen, toggle: toggleFullscreen } = useFullscreen();

  function openDisplay() {
    window.open("/display", "_blank", "noopener");
  }

  async function signOut() {
    try {
      if (token) await logout({ token });
    } catch {
      // Session may already be invalid server-side; sign out locally anyway.
    }
    setAdminToken(null);
    navigate("/admin/login", { replace: true });
  }

  const navGroups = NAV_GROUPS;

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border bg-background md:flex">
        <div className="border-b border-border px-5 py-4">
          <Brand subtitle="Admin Panel" markClassName="size-8" />
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink key={item.to} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="space-y-2 border-t border-border px-3 py-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => void toggleFullscreen()}
            title="Toggle browser fullscreen"
          >
            {fullscreen ? (
              <Minimize className="size-4" />
            ) : (
              <Maximize className="size-4" />
            )}
            {fullscreen ? "Exit fullscreen" : "Fullscreen"}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={openDisplay}
            title="Open the full-screen election display"
          >
            <MonitorUp className="size-4" />
            Display Election
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={signOut}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
          <Brand subtitle="Admin Panel" markClassName="size-7" />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              onClick={() => void toggleFullscreen()}
            >
              {fullscreen ? (
                <Minimize className="size-4" />
              ) : (
                <Maximize className="size-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Open display mode"
              title="Display Election"
              onClick={openDisplay}
            >
              <MonitorUp className="size-4" />
            </Button>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    <Brand subtitle="Admin Panel" markClassName="size-7" />
                  </SheetTitle>
                </SheetHeader>
                <nav className="space-y-6 overflow-y-auto px-4 pb-6">
                  {navGroups.map((group) => (
                    <div key={group.label}>
                      <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
                        {group.label}
                      </p>
                      <div className="space-y-1">
                        {group.items.map((item) => (
                          <NavLink
                            key={item.to}
                            {...item}
                            onNavigate={() => setSheetOpen(false)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={signOut}
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
