import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileCode2,
  Container,
  ScrollText,
  Settings,
  Hexagon,
  Circle,
  Layers,
  Activity,
  Archive,
  Clock,
  KeyRound,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { getHealth } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { cn } from "./ui";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/editor", label: "Files", icon: FileCode2 },
  { to: "/apps", label: "Apps", icon: Container },
  { to: "/logs", label: "Logs", icon: ScrollText },
  { to: "/compose", label: "Compose", icon: Layers },
  { to: "/monitor", label: "Monitor", icon: Activity },
  { to: "/backups", label: "Backups", icon: Archive },
  { to: "/scheduler", label: "Scheduler", icon: Clock },
  { to: "/env", label: "Env", icon: KeyRound },
  { to: "/settings", label: "Settings", icon: Settings },
];

const shortcuts: Record<string, string> = {
  "1": "/",
  "2": "/editor",
  "3": "/apps",
  "4": "/logs",
  "5": "/compose",
  "6": "/monitor",
};

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { enabled, logout } = useAuth();
  const [dockerConnected, setDockerConnected] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    getHealth()
      .then((h) => setDockerConnected(h.docker.connected))
      .catch(() => setDockerConnected(false));
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.altKey && shortcuts[e.key]) {
        e.preventDefault();
        navigate(shortcuts[e.key]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const sidebar = (
    <>
      <Link
        to="/"
        className="px-4 py-4 border-b border-border hover:bg-surface-overlay transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/25 group-hover:shadow-accent/40 transition-shadow">
            <Hexagon size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Deployr</h1>
            <p className="text-[10px] text-text-faint font-medium uppercase tracking-widest">VPS Manager</p>
          </div>
        </div>
      </Link>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150",
                isActive
                  ? "bg-accent-muted text-accent font-medium shadow-sm"
                  : "text-text-muted hover:text-text hover:bg-surface-overlay",
              )
            }
          >
            <item.icon size={17} strokeWidth={1.75} className="shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-border space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Circle
            size={8}
            className={cn(
              "fill-current",
              dockerConnected === null && "text-text-faint animate-pulse-soft",
              dockerConnected === true && "text-success",
              dockerConnected === false && "text-danger",
            )}
          />
          <span className="text-text-muted">
            Docker {dockerConnected === null ? "..." : dockerConnected ? "connected" : "offline"}
          </span>
        </div>
        {enabled && (
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 text-xs text-text-muted hover:text-danger transition-colors"
          >
            <LogOut size={12} />
            Sign out
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-surface">
      <aside className="hidden lg:flex w-56 shrink-0 border-r border-border bg-surface-raised flex-col">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-surface-raised border-r border-border flex flex-col animate-fade-in">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-text-muted"
            >
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="flex-1 overflow-hidden flex flex-col">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised">
          <button onClick={() => setMobileOpen(true)} className="text-text-muted">
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold">Deployr</span>
          <NotificationBell />
        </header>

        <div className="hidden lg:flex absolute top-4 right-6 z-10">
          <NotificationBell />
        </div>

        <Outlet />
      </main>
    </div>
  );
}
