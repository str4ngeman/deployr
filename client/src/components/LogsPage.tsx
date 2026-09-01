import { useCallback, useEffect, useRef, useState } from "react";
import {
  getContainerLogs,
  getDockerStatus,
  getSettings,
  hideContainer,
  listContainers,
  streamContainerLogs,
  type ContainerInfo,
} from "../lib/api";

const TAIL_OPTIONS = [50, 100, 200, 500] as const;

export function LogsPage() {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [following, setFollowing] = useState(true);
  const [tail, setTail] = useState<number>(100);
  const [showHidden, setShowHidden] = useState(false);
  const [runningOnly, setRunningOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dockerConnected, setDockerConnected] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);

  const scrollToBottom = useCallback(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadContainers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await getDockerStatus();
      setDockerConnected(status.connected);
      if (!status.connected) {
        setError("Cannot connect to Docker. Is docker.sock mounted?");
        return;
      }
      const data = await listContainers({
        includeHidden: showHidden,
        all: !runningOnly,
      });
      setContainers(data.containers);
      if (data.containers.length > 0 && !selectedId) {
        setSelectedId(data.containers[0].id);
      } else if (selectedId && !data.containers.find((c) => c.id === selectedId)) {
        setSelectedId(data.containers[0]?.id ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load containers");
    } finally {
      setLoading(false);
    }
  }, [selectedId, showHidden, runningOnly]);

  const handleHide = async (container: ContainerInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await hideContainer(container.id, container.name);
      if (selectedId === container.id) {
        setSelectedId(null);
        setLogs("");
      }
      await loadContainers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to hide container");
    }
  };

  const loadLogs = useCallback(
    async (containerId: string, tailLines: number) => {
      setLogsLoading(true);
      setError(null);
      try {
        const data = await getContainerLogs(containerId, tailLines);
        setLogs(data.logs || "(no logs)");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load logs");
      } finally {
        setLogsLoading(false);
      }
    },
    [],
  );

  const startFollowing = useCallback(
    (containerId: string, tailLines: number) => {
      stopStreamRef.current?.();
      setLogs("");
      setLogsLoading(true);
      setError(null);

      const stop = streamContainerLogs(
        containerId,
        tailLines,
        (text) => {
          setLogsLoading(false);
          setLogs((prev) => {
            const next = prev + text;
            const lines = next.split("\n");
            if (lines.length > tailLines + 50) {
              return lines.slice(-tailLines).join("\n");
            }
            return next;
          });
        },
        (message) => setError(message),
      );

      stopStreamRef.current = stop;
    },
    [],
  );

  useEffect(() => {
    getSettings()
      .then((data) => {
        const tailSetting = data.settings.find((s) => s.key === "logs.default_tail");
        if (tailSetting) setTail(Number(tailSetting.value) || 100);
        const showHiddenSetting = data.settings.find((s) => s.key === "logs.show_hidden");
        if (showHiddenSetting) setShowHidden(showHiddenSetting.value === "true");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadContainers();
  }, [loadContainers]);

  useEffect(() => {
    if (!selectedId) return;

    stopStreamRef.current?.();
    stopStreamRef.current = null;

    if (following) {
      startFollowing(selectedId, tail);
    } else {
      loadLogs(selectedId, tail);
    }

    return () => {
      stopStreamRef.current?.();
      stopStreamRef.current = null;
    };
  }, [selectedId, following, tail, loadLogs, startFollowing]);

  useEffect(() => {
    if (following) scrollToBottom();
  }, [logs, following, scrollToBottom]);

  const selected = containers.find((c) => c.id === selectedId);

  const handleRefresh = () => {
    if (!selectedId) return;
    if (following) {
      startFollowing(selectedId, tail);
    } else {
      loadLogs(selectedId, tail);
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-80 shrink-0 border-r border-border bg-surface-raised flex flex-col">
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Containers
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRunningOnly((prev) => !prev)}
              className={`p-1 rounded transition-colors ${
                runningOnly
                  ? "text-success bg-success/15"
                  : "text-text-muted hover:text-text hover:bg-surface-overlay"
              }`}
              title={runningOnly ? "Showing running only" : "Showing all containers"}
            >
              <RunningIcon active={runningOnly} />
            </button>
            <button
              onClick={() => setShowHidden((prev) => !prev)}
              className={`p-1 rounded transition-colors ${
                showHidden
                  ? "text-accent bg-accent/15"
                  : "text-text-muted hover:text-text hover:bg-surface-overlay"
              }`}
              title={showHidden ? "Hide hidden containers" : "Show hidden containers"}
            >
              <EyeIcon open={showHidden} />
            </button>
            <button
              onClick={loadContainers}
              className="p-1 rounded hover:bg-surface-overlay text-text-muted hover:text-text transition-colors"
              title="Refresh"
            >
              <RefreshIcon />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {loading && (
            <p className="px-3 py-2 text-xs text-text-muted">Loading...</p>
          )}
          {error && !selectedId && (
            <p className="px-3 py-2 text-xs text-danger">{error}</p>
          )}
          {!loading && !error && containers.length === 0 && (
            <p className="px-3 py-2 text-xs text-text-muted">No running containers</p>
          )}
          {containers.map((container) => (
            <div
              key={container.id}
              className={`flex items-stretch border-b border-border-subtle ${
                selectedId === container.id ? "bg-accent/15" : "hover:bg-surface-overlay"
              }`}
            >
              <button
                onClick={() => setSelectedId(container.id)}
                className="flex-1 text-left px-3 py-2.5 min-w-0"
              >
                <div className="flex items-center gap-2">
                  <StatusDot state={container.state} />
                  <span className="text-sm font-medium truncate">{container.name}</span>
                  {container.hidden && (
                    <span className="text-[10px] text-text-muted">(hidden)</span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-text-muted truncate pl-4">
                  {container.image}
                </p>
                <p className="text-[10px] text-text-muted pl-4">{container.ports}</p>
              </button>
              {!container.hidden && (
                <button
                  onClick={(e) => handleHide(container, e)}
                  className="px-2 text-text-muted hover:text-text transition-colors"
                  title="Hide from logs list"
                >
                  <EyeOffIcon />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-surface-raised flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <span className="text-sm font-mono truncate block">
              {selected?.name || "Select a container"}
            </span>
            {selected && (
              <span className="text-[11px] text-text-muted">{selected.status}</span>
            )}
          </div>

          <label className="flex items-center gap-1.5 text-xs text-text-muted">
            <span>Tail</span>
            <select
              value={tail}
              onChange={(e) => setTail(Number(e.target.value))}
              className="bg-surface border border-border rounded px-2 py-1 text-text text-xs"
            >
              {TAIL_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={() => setFollowing((prev) => !prev)}
            className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${
              following
                ? "border-success/40 bg-success/15 text-success"
                : "border-border hover:bg-surface-overlay text-text-muted"
            }`}
          >
            {following ? "Following" : "Follow"}
          </button>

          <button
            onClick={handleRefresh}
            disabled={logsLoading}
            className="px-3 py-1 text-xs font-medium rounded-md border border-border hover:bg-surface-overlay disabled:opacity-40 transition-colors"
          >
            {logsLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error && selectedId && (
          <div className="px-4 py-2 text-xs text-danger bg-danger/10 border-b border-danger/20">
            {error}
          </div>
        )}

        <pre className="flex-1 overflow-auto p-4 text-xs font-mono leading-relaxed text-text-muted bg-surface whitespace-pre-wrap">
          {!dockerConnected
            ? "Docker not connected"
            : logsLoading && !logs
              ? "Loading logs..."
              : logs || "Select a container to view logs"}
          <div ref={logEndRef} />
        </pre>
      </div>
    </div>
  );
}

function StatusDot({ state }: { state: string }) {
  const color =
    state === "running"
      ? "bg-success"
      : state === "exited"
        ? "bg-text-muted"
        : "bg-warning";

  return <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />;
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M11.5 7A4.5 4.5 0 105.5 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M5.5 1v2h2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M2 2l10 10M5.5 5.8A2.5 2.5 0 007 9.5a2.5 2.5 0 002.5-2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M1 7s2-3 6-3c1 0 1.8.3 2.5.7M13 7s-2 3-6 3c-1 0-1.8-.3-2.5-.7"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RunningIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle
        cx="7"
        cy="7"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1.2"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.25 : 0}
      />
      {active && (
        <path
          d="M5.5 7l1.2 1.2L8.5 6"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
