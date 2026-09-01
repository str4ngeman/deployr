import { Link, NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/editor", label: "File Editor", icon: FileIcon },
  { to: "/apps", label: "Apps Manager", icon: AppsIcon },
  { to: "/logs", label: "Logs Viewer", icon: LogsIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Layout() {
  return (
    <div className="flex h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-surface-raised flex flex-col">
        <Link to="/" className="px-4 py-5 border-b border-border hover:bg-surface-overlay transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <DeployIcon />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">Deployr</h1>
              <p className="text-[11px] text-text-muted">VPS Manager</p>
            </div>
          </div>
        </Link>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-accent/15 text-accent font-medium"
                    : "text-text-muted hover:text-text hover:bg-surface-overlay"
                }`
              }
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

function DeployIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z"
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 6V10M6 7.5H10"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path
        d="M3 2h6l4 4v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function AppsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <rect x="2" y="5" width="12" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 5V3.5A1.5 1.5 0 016.5 2h3A1.5 1.5 0 0111 3.5V5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 8.5h12" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function LogsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path
        d="M2 4h12M2 8h8M2 12h10"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
