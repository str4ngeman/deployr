import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHealth } from "../lib/api";

export function Dashboard() {
  const [health, setHealth] = useState<{
    fileRoot: string;
    port: number;
  } | null>(null);

  useEffect(() => {
    getHealth()
      .then((data) => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="mt-1 text-text-muted text-sm">
          Manage your VPS applications and configuration files.
        </p>

        {health && (
          <div className="mt-6 flex gap-4 text-xs text-text-muted">
            <span>
              Root: <code className="text-text font-mono">{health.fileRoot}</code>
            </span>
            <span>
              Port: <code className="text-text font-mono">{health.port}</code>
            </span>
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <ToolCard
            to="/editor"
            title="File Editor"
            description="Browse and edit files on your VPS. Explore /opt and manage configs, docker-compose files, and more."
            icon={<FileEditorIcon />}
            available
          />
          <ToolCard
            to="/apps"
            title="App Manager"
            description="View and manage Docker containers deployed from GHCR."
            icon={<ContainerIcon />}
            available
          />
          <ToolCard
            to="/logs"
            title="Logs Viewer"
            description="Stream logs from your running containers in real time."
            icon={<LogsIcon />}
            available
          />
          <ToolCard
            to="/settings"
            title="Settings"
            description="Configure logs, GHCR credentials, hidden containers, and more."
            icon={<SettingsIcon />}
            available
          />
        </div>
      </div>
    </div>
  );
}

function ToolCard({
  to,
  title,
  description,
  icon,
  available,
}: {
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
}) {
  const content = (
    <div
      className={`group relative rounded-xl border p-5 transition-colors ${
        available
          ? "border-border bg-surface-raised hover:border-accent/40 hover:bg-surface-overlay cursor-pointer"
          : "border-border-subtle bg-surface-raised/50 opacity-60 cursor-not-allowed"
      }`}
    >
      {!available && (
        <span className="absolute top-3 right-3 text-[10px] font-medium uppercase tracking-wider text-text-muted bg-surface-overlay px-2 py-0.5 rounded">
          Phase 2
        </span>
      )}
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
          available ? "bg-accent/15 text-accent" : "bg-surface-overlay text-text-muted"
        }`}
      >
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-xs text-text-muted leading-relaxed">{description}</p>
    </div>
  );

  if (available) {
    return <Link to={to}>{content}</Link>;
  }
  return content;
}

function FileEditorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M4 3h8l5 5v9a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 3v5h5M7 13h6M7 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ContainerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="6" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 6V4.5A1.5 1.5 0 018.5 3h3A1.5 1.5 0 0113 4.5V6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 10h14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function LogsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 5h12M4 10h8M4 15h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
