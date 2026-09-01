import { useCallback, useEffect, useRef, useState } from "react";
import {
  getContainerLogs,
  getDockerStatus,
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
      const data = await listContainers();
      setContainers(data.containers);
      if (data.containers.length > 0 && !selectedId) {
        setSelectedId(data.containers[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load containers");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

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
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Containers
          </span>
          <button
            onClick={loadContainers}
            className="p-1 rounded hover:bg-surface-overlay text-text-muted hover:text-text transition-colors"
            title="Refresh"
          >
            <RefreshIcon />
          </button>
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
            <button
              key={container.id}
              onClick={() => setSelectedId(container.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-border-subtle transition-colors ${
                selectedId === container.id
                  ? "bg-accent/15"
                  : "hover:bg-surface-overlay"
              }`}
            >
              <div className="flex items-center gap-2">
                <StatusDot state={container.state} />
                <span className="text-sm font-medium truncate">{container.name}</span>
              </div>
              <p className="mt-1 text-[11px] text-text-muted truncate pl-4">
                {container.image}
              </p>
              <p className="text-[10px] text-text-muted pl-4">{container.ports}</p>
            </button>
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
