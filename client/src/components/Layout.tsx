import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileCode2,
  Container,
  ScrollText,
  Settings,
  Hexagon,
  Circle,
} from "lucide-react";
import { getHealth } from "../lib/api";
import { cn } from "./ui";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/editor", label: "Files", icon: FileCode2, description: "Browse & edit" },
  { to: "/apps", label: "Apps", icon: Container, description: "Containers" },
  { to: "/logs", label: "Logs", icon: ScrollText, description: "Live streams" },
  { to: "/settings", label: "Settings", icon: Settings, description: "Configure" },
];

export function Layout() {
  const location = useLocation();
  const [dockerConnected, setDockerConnected] = useState<boolean | null>(null);

  useEffect(() => {
    getHealth()
      .then((h) => setDockerConnected(h.docker.connected))
      .catch(() => setDockerConnected(false));
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-surface">
      <aside className="w-60 shrink-0 border-r border-border bg-surface-raised flex flex-col">
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

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150",
                  isActive
                    ? "bg-accent-muted text-accent font-medium shadow-sm"
                    : "text-text-muted hover:text-text hover:bg-surface-overlay",
                )
              }
            >
              <item.icon size={18} strokeWidth={1.75} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="block">{item.label}</span>
                {item.description && (
                  <span className="block text-[10px] text-text-faint font-normal">{item.description}</span>
                )}
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-border">
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
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
