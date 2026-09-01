import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  RefreshCw,
  ChevronRight,
  Package,
} from "lucide-react";
import {
  getSettings,
  listContainers,
  pullContainerImage,
  recreateContainer,
  restartContainer,
  startContainer,
  stopContainer,
  type ContainerInfo,
} from "../lib/api";
import { ContainerDetailPanel } from "./ContainerDetailPanel";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  ListSkeleton,
  PageHeader,
  SearchInput,
  StatusBadge,
  Toggle,
  cn,
} from "./ui";

type ActionType = "restart" | "stop" | "start" | "pull" | "recreate";

export function AppsPage() {
  const navigate = useNavigate();
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningOnly, setRunningOnly] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ContainerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadContainers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listContainers({ all: !runningOnly });
      setContainers(data.containers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load containers");
    } finally {
      setLoading(false);
    }
  }, [runningOnly]);

  useEffect(() => {
    getSettings()
      .then((data) => {
        const showStopped = data.settings.find((s) => s.key === "apps.show_stopped");
        if (showStopped) setRunningOnly(showStopped.value !== "true");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadContainers();
  }, [loadContainers]);

  const filtered = useMemo(() => {
    if (!search.trim()) return containers;
    const q = search.toLowerCase();
    return containers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.image.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  }, [containers, search]);

  const runAction = async (container: ContainerInfo, action: ActionType) => {
    setActionId(`${container.id}:${action}`);
    setError(null);
    setMessage(null);
    try {
      let result: { message?: string } = {};
      switch (action) {
        case "restart":
          await restartContainer(container.id);
          result = { message: `${container.name} restarted successfully` };
          break;
        case "stop":
          await stopContainer(container.id);
          result = { message: `${container.name} stopped` };
          break;
        case "start":
          await startContainer(container.id);
          result = { message: `${container.name} started` };
          break;
        case "pull":
          result = await pullContainerImage(container.id);
          break;
        case "recreate":
          result = await recreateContainer(container.id);
          break;
      }
      setMessage(result.message || "Done");
      await loadContainers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-border shrink-0">
          <PageHeader
            title="Apps Manager"
            description="Manage Docker containers and deployments"
            icon={<Container size={20} />}
            actions={
              <>
                <Toggle checked={runningOnly} onChange={setRunningOnly} label="Running only" />
                <Button icon={<RefreshCw size={14} />} onClick={loadContainers} loading={loading}>
                  Refresh
                </Button>
              </>
            }
          />
          <div className="max-w-sm">
            <SearchInput value={search} onChange={setSearch} placeholder="Search containers..." />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {message && (
            <Alert variant="success" onDismiss={() => setMessage(null)} className="mb-4">
              {message}
            </Alert>
          )}
          {error && (
            <Alert variant="danger" onDismiss={() => setError(null)} className="mb-4">
              {error}
            </Alert>
          )}

          {loading ? (
            <ListSkeleton count={4} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Package size={24} />}
              title={search ? "No matches" : "No containers"}
              description={search ? "Try a different search term" : runningOnly ? "No running containers found" : "No containers on this host"}
              action={!search && <Button onClick={loadContainers} icon={<RefreshCw size={14} />}>Refresh</Button>}
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((container) => (
                <button
                  key={container.id}
                  onClick={() => setSelected(container)}
                  className={cn(
                    "w-full text-left rounded-xl border p-4 transition-all duration-150 group",
                    selected?.id === container.id
                      ? "border-accent/40 bg-accent-muted"
                      : "border-border bg-surface-raised hover:border-border hover:bg-surface-overlay",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-overlay border border-border flex items-center justify-center text-text-muted group-hover:text-accent transition-colors shrink-0">
                      <Container size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">{container.name}</span>
                        <StatusBadge state={container.state} />
                        {container.isGhcr && <Badge variant="accent">GHCR</Badge>}
                      </div>
                      <p className="text-xs text-text-muted font-mono truncate mt-0.5">{container.image}</p>
                      <p className="text-[11px] text-text-faint mt-0.5">{container.status}</p>
                    </div>
                    {container.ports !== "—" && (
                      <div className="hidden sm:block text-right shrink-0">
                        <p className="text-[10px] text-text-faint uppercase tracking-wider">Ports</p>
                        <p className="text-xs font-mono text-text-muted mt-0.5">{container.ports}</p>
                      </div>
                    )}
                    <ChevronRight size={16} className="text-text-faint group-hover:text-accent transition-colors shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <ContainerDetailPanel
          container={selected}
          onClose={() => setSelected(null)}
          onAction={runAction}
          actionId={actionId}
          onViewLogs={(c) => navigate(`/logs?container=${c.id}`)}
        />
      )}
    </div>
  );
}
