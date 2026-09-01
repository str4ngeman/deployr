import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ScrollText,
  RefreshCw,
  Radio,
  Eye,
  EyeOff,
  Filter,
  Terminal,
  Pause,
  Play,
  ChevronDown,
} from "lucide-react";
import {
  getContainerLogs,
  getDockerStatus,
  getSettings,
  hideContainer,
  listContainers,
  streamContainerLogs,
  type ContainerInfo,
} from "../lib/api";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  IconButton,
  ListSkeleton,
  StatusBadge,
  cn,
} from "./ui";

const TAIL_OPTIONS = [50, 100, 200, 500] as const;

export function LogsPage() {
  const [searchParams] = useSearchParams();
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [following, setFollowing] = useState(true);
  const [tail, setTail] = useState<number>(100);
  const [showHidden, setShowHidden] = useState(false);
  const [runningOnly, setRunningOnly] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dockerConnected, setDockerConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLPreElement>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);

  const scrollToBottom = useCallback(() => {
    if (autoScroll) logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [autoScroll]);

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
      const data = await listContainers({ includeHidden: showHidden, all: !runningOnly });
      setContainers(data.containers);

      const paramId = searchParams.get("container");
      if (paramId && data.containers.find((c) => c.id === paramId)) {
        setSelectedId(paramId);
      } else if (data.containers.length > 0 && !selectedId) {
        setSelectedId(data.containers[0].id);
      } else if (selectedId && !data.containers.find((c) => c.id === selectedId)) {
        setSelectedId(data.containers[0]?.id ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load containers");
    } finally {
      setLoading(false);
    }
  }, [selectedId, showHidden, runningOnly, searchParams]);

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

  const loadLogs = useCallback(async (containerId: string, tailLines: number) => {
    setLogsLoading(true);
    setError(null);
    try {
      const data = await getContainerLogs(containerId, tailLines);
      setLogs(data.logs || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const startFollowing = useCallback((containerId: string, tailLines: number) => {
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
          if (lines.length > tailLines + 50) return lines.slice(-tailLines).join("\n");
          return next;
        });
      },
      (message) => setError(message),
    );
    stopStreamRef.current = stop;
  }, []);

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

  useEffect(() => { loadContainers(); }, [loadContainers]);

  useEffect(() => {
    if (!selectedId) return;
    stopStreamRef.current?.();
    stopStreamRef.current = null;
    if (following) startFollowing(selectedId, tail);
    else loadLogs(selectedId, tail);
    return () => { stopStreamRef.current?.(); stopStreamRef.current = null; };
  }, [selectedId, following, tail, loadLogs, startFollowing]);

  useEffect(() => { scrollToBottom(); }, [logs, scrollToBottom]);

  const selected = containers.find((c) => c.id === selectedId);
  const filteredContainers = containers.filter((c) =>
    !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || c.image.toLowerCase().includes(search.toLowerCase()),
  );

  const handleRefresh = () => {
    if (!selectedId) return;
    if (following) startFollowing(selectedId, tail);
    else loadLogs(selectedId, tail);
  };

  const lineCount = logs ? logs.split("\n").length : 0;

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r border-border bg-surface-raised flex flex-col">
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText size={16} className="text-accent" />
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Containers</span>
            </div>
            <div className="flex items-center gap-0.5">
              <IconButton active={runningOnly} onClick={() => setRunningOnly((p) => !p)} title="Running only">
                <Filter size={14} />
              </IconButton>
              <IconButton active={showHidden} onClick={() => setShowHidden((p) => !p)} title="Show hidden">
                {showHidden ? <Eye size={14} /> : <EyeOff size={14} />}
              </IconButton>
              <IconButton onClick={loadContainers} title="Refresh">
                <RefreshCw size={14} className={loading ? "animate-spin-slow" : ""} />
              </IconButton>
            </div>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter..."
            className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text placeholder:text-text-faint focus:outline-none focus:border-accent/50"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <ListSkeleton count={5} />
          ) : filteredContainers.length === 0 ? (
            <EmptyState
              icon={<Terminal size={20} />}
              title="No containers"
              description={runningOnly ? "No running containers" : "No containers match filter"}
            />
          ) : (
            filteredContainers.map((container) => (
              <div
                key={container.id}
                className={cn(
                  "flex items-stretch border-b border-border-subtle transition-colors",
                  selectedId === container.id ? "bg-accent-muted" : "hover:bg-surface-overlay",
                )}
              >
                <button onClick={() => setSelectedId(container.id)} className="flex-1 text-left px-3 py-3 min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge state={container.state} />
                    {container.hidden && <Badge variant="muted">hidden</Badge>}
                  </div>
                  <p className="text-sm font-medium truncate mt-1">{container.name}</p>
                  <p className="text-[10px] text-text-faint font-mono truncate mt-0.5">{container.image}</p>
                </button>
                {!container.hidden && (
                  <button onClick={(e) => handleHide(container, e)} className="px-2.5 text-text-faint hover:text-text transition-colors" title="Hide">
                    <EyeOff size={13} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Log viewer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface-raised flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            {selected ? (
              <>
                <p className="text-sm font-semibold truncate">{selected.name}</p>
                <p className="text-[11px] text-text-faint">{selected.status}</p>
              </>
            ) : (
              <p className="text-sm text-text-muted">Select a container</p>
            )}
          </div>

          <div className="flex items-center gap-1 text-[10px] text-text-faint">
            {lineCount > 0 && <span>{lineCount} lines</span>}
            {following && <Badge variant="success"><Radio size={10} /> Live</Badge>}
          </div>

          <div className="relative">
            <select
              value={tail}
              onChange={(e) => setTail(Number(e.target.value))}
              className="appearance-none bg-surface-overlay border border-border rounded-lg pl-3 pr-7 py-1.5 text-xs text-text focus:outline-none focus:border-accent/50"
            >
              {TAIL_OPTIONS.map((n) => <option key={n} value={n}>Tail {n}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
          </div>

          <Button
            size="sm"
            variant={following ? "success" : "secondary"}
            icon={following ? <Pause size={13} /> : <Play size={13} />}
            onClick={() => setFollowing((p) => !p)}
          >
            {following ? "Live" : "Paused"}
          </Button>

          <IconButton active={autoScroll} onClick={() => setAutoScroll((p) => !p)} title="Auto-scroll">
            <ChevronDown size={14} />
          </IconButton>

          <Button size="sm" icon={<RefreshCw size={13} />} onClick={handleRefresh} loading={logsLoading}>
            Refresh
          </Button>
        </div>

        {error && (
          <Alert variant="danger" onDismiss={() => setError(null)} className="m-3 mb-0">
            {error}
          </Alert>
        )}

        <div className="flex-1 relative overflow-hidden">
          <pre
            ref={logContainerRef}
            className="h-full overflow-auto p-4 text-[11px] font-mono leading-relaxed text-emerald-400/90 bg-[#0a0a0c] whitespace-pre-wrap"
          >
            {!dockerConnected ? (
              <span className="text-text-faint">Docker not connected</span>
            ) : logsLoading && !logs ? (
              <span className="text-text-faint animate-pulse-soft">Connecting to log stream...</span>
            ) : logs ? (
              logs
            ) : (
              <span className="text-text-faint">Select a container to view logs</span>
            )}
            <div ref={logEndRef} />
          </pre>
          {logsLoading && logs && (
            <div className="absolute top-3 right-3">
              <Badge variant="accent"><Radio size={10} className="animate-pulse-soft" /> Streaming</Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
