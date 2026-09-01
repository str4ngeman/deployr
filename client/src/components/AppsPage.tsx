import { useCallback, useEffect, useState } from "react";
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

type ActionType = "restart" | "stop" | "start" | "pull" | "recreate";

export function AppsPage() {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningOnly, setRunningOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  const runAction = async (container: ContainerInfo, action: ActionType) => {
    setActionId(`${container.id}:${action}`);
    setError(null);
    setMessage(null);
    try {
      let result: { message?: string } = {};
      switch (action) {
        case "restart":
          await restartContainer(container.id);
          result = { message: `${container.name} restarted` };
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
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Apps Manager</h2>
            <p className="mt-1 text-text-muted text-sm">
              Manage Docker containers — restart, pull GHCR images, and more.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRunningOnly((prev) => !prev)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                runningOnly
                  ? "border-success/40 bg-success/15 text-success"
                  : "border-border hover:bg-surface-overlay text-text-muted"
              }`}
            >
              {runningOnly ? "Running only" : "All containers"}
            </button>
            <button
              onClick={loadContainers}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-surface-overlay disabled:opacity-40"
            >
              Refresh
            </button>
          </div>
        </div>

        {message && (
          <div className="mt-4 px-4 py-2 text-xs text-success bg-success/10 border border-success/20 rounded-lg">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 px-4 py-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-3">
          {loading && <p className="text-sm text-text-muted">Loading containers...</p>}
          {!loading && containers.length === 0 && (
            <p className="text-sm text-text-muted">No containers found.</p>
          )}
          {containers.map((container) => (
            <ContainerCard
              key={container.id}
              container={container}
              actionId={actionId}
              onAction={runAction}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContainerCard({
  container,
  actionId,
  onAction,
}: {
  container: ContainerInfo;
  actionId: string | null;
  onAction: (container: ContainerInfo, action: ActionType) => void;
}) {
  const isRunning = container.state === "running";
  const busy = actionId?.startsWith(container.id) ?? false;

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusDot state={container.state} />
            <h3 className="text-sm font-semibold truncate">{container.name}</h3>
            {container.isGhcr && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-accent bg-accent/15 px-1.5 py-0.5 rounded">
                GHCR
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-text-muted font-mono truncate">{container.image}</p>
          <p className="mt-1 text-[11px] text-text-muted">{container.status}</p>
          {container.ports !== "—" && (
            <p className="mt-0.5 text-[11px] text-text-muted">Ports: {container.ports}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-end shrink-0">
          {isRunning ? (
            <>
              <ActionButton
                label="Restart"
                busy={busy && actionId === `${container.id}:restart`}
                onClick={() => onAction(container, "restart")}
              />
              <ActionButton
                label="Stop"
                variant="danger"
                busy={busy && actionId === `${container.id}:stop`}
                onClick={() => onAction(container, "stop")}
              />
            </>
          ) : (
            <ActionButton
              label="Start"
              busy={busy && actionId === `${container.id}:start`}
              onClick={() => onAction(container, "start")}
            />
          )}
          {container.isGhcr && (
            <>
              <ActionButton
                label="Pull"
                busy={busy && actionId === `${container.id}:pull`}
                onClick={() => onAction(container, "pull")}
              />
              <ActionButton
                label="Pull & Recreate"
                busy={busy && actionId === `${container.id}:recreate`}
                onClick={() => onAction(container, "recreate")}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  busy,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  busy: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors disabled:opacity-40 ${
        variant === "danger"
          ? "border-danger/40 text-danger hover:bg-danger/10"
          : "border-border hover:bg-surface-overlay"
      }`}
    >
      {busy ? "..." : label}
    </button>
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
