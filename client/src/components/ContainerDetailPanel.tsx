import { useEffect, useState } from "react";
import {
  X,
  Copy,
  Check,
  Container,
  Image,
  Calendar,
  HardDrive,
  Tag,
  Network,
  RefreshCw,
  Play,
  Square,
  RotateCcw,
  Download,
  ExternalLink,
} from "lucide-react";
import {
  getContainerDetails,
  type ContainerDetails,
  type ContainerInfo,
} from "../lib/api";
import { formatDate } from "../lib/utils";
import {
  Badge,
  Button,
  DetailRow,
  LoadingOverlay,
  StatusBadge,
} from "./ui";

type ActionType = "restart" | "stop" | "start" | "pull" | "recreate";

interface ContainerDetailPanelProps {
  container: ContainerInfo | null;
  onClose: () => void;
  onAction: (container: ContainerInfo, action: ActionType) => Promise<void>;
  actionId: string | null;
  onViewLogs?: (container: ContainerInfo) => void;
}

export function ContainerDetailPanel({
  container,
  onClose,
  onAction,
  actionId,
  onViewLogs,
}: ContainerDetailPanelProps) {
  const [details, setDetails] = useState<ContainerDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!container) {
      setDetails(null);
      return;
    }
    setLoading(true);
    getContainerDetails(container.id)
      .then(setDetails)
      .catch(() => setDetails(null))
      .finally(() => setLoading(false));
  }, [container]);

  if (!container) return null;

  const busy = actionId?.startsWith(container.id) ?? false;
  const currentAction = actionId?.split(":")[1];
  const isRunning = container.state === "running";

  const copyId = () => {
    navigator.clipboard.writeText(container.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-96 shrink-0 border-l border-border bg-surface-raised flex flex-col animate-slide-in-right">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-accent-muted border border-accent/20 flex items-center justify-center text-accent shrink-0">
            <Container size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">{container.name}</h3>
            <StatusBadge state={container.state} />
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-overlay">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        {loading && <LoadingOverlay message="Loading details..." />}

        <div className="p-4 space-y-5">
          <section>
            <h4 className="text-[10px] font-semibold text-text-faint uppercase tracking-wider mb-2">Actions</h4>
            <div className="flex flex-wrap gap-2">
              {isRunning ? (
                <>
                  <Button size="sm" icon={<RotateCcw size={13} />} loading={busy && currentAction === "restart"} onClick={() => onAction(container, "restart")}>Restart</Button>
                  <Button size="sm" variant="danger" icon={<Square size={13} />} loading={busy && currentAction === "stop"} onClick={() => onAction(container, "stop")}>Stop</Button>
                </>
              ) : (
                <Button size="sm" variant="success" icon={<Play size={13} />} loading={busy && currentAction === "start"} onClick={() => onAction(container, "start")}>Start</Button>
              )}
              {container.isGhcr && (
                <>
                  <Button size="sm" icon={<Download size={13} />} loading={busy && currentAction === "pull"} onClick={() => onAction(container, "pull")}>Pull</Button>
                  <Button size="sm" icon={<RefreshCw size={13} />} loading={busy && currentAction === "recreate"} onClick={() => onAction(container, "recreate")}>Recreate</Button>
                </>
              )}
              {onViewLogs && (
                <Button size="sm" variant="ghost" icon={<ExternalLink size={13} />} onClick={() => onViewLogs(container)}>Logs</Button>
              )}
            </div>
          </section>

          <section>
            <h4 className="text-[10px] font-semibold text-text-faint uppercase tracking-wider mb-2">Overview</h4>
            <div className="rounded-xl border border-border bg-surface p-3">
              <DetailRow label="Container ID" value={
                <button onClick={copyId} className="inline-flex items-center gap-1 font-mono hover:text-accent transition-colors">
                  {container.id.slice(0, 12)}
                  {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                </button>
              } />
              <DetailRow label="Image" value={container.image} mono />
              <DetailRow label="Status" value={container.status} />
              {container.ports !== "—" && <DetailRow label="Ports" value={container.ports} mono />}
              {container.isGhcr && <DetailRow label="Registry" value={<Badge variant="accent">GHCR</Badge>} />}
            </div>
          </section>

          {details && (
            <>
              <section>
                <h4 className="text-[10px] font-semibold text-text-faint uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar size={11} /> Timeline
                </h4>
                <div className="rounded-xl border border-border bg-surface p-3">
                  <DetailRow label="Created" value={formatDate(details.created)} />
                  {details.startedAt && details.startedAt !== "0001-01-01T00:00:00Z" && (
                    <DetailRow label="Started" value={formatDate(details.startedAt)} />
                  )}
                  <DetailRow label="Restart count" value={details.restartCount} />
                  <DetailRow label="Platform" value={details.platform} />
                </div>
              </section>

              {details.ports.length > 0 && (
                <section>
                  <h4 className="text-[10px] font-semibold text-text-faint uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Network size={11} /> Port mappings
                  </h4>
                  <div className="rounded-xl border border-border bg-surface divide-y divide-border-subtle">
                    {details.ports.map((p: { host: string; container: string }, i: number) => (
                      <div key={i} className="px-3 py-2 flex justify-between text-xs font-mono">
                        <span className="text-text-muted">{p.container}</span>
                        <span className="text-text">→ {p.host}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {details.mounts.length > 0 && (
                <section>
                  <h4 className="text-[10px] font-semibold text-text-faint uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <HardDrive size={11} /> Mounts
                  </h4>
                  <div className="space-y-2">
                    {details.mounts.map((m: { source: string; destination: string; mode: string }, i: number) => (
                      <div key={i} className="rounded-lg border border-border bg-surface p-3 text-xs">
                        <p className="font-mono text-text truncate">{m.destination}</p>
                        <p className="text-text-faint truncate mt-0.5">{m.source}</p>
                        <Badge variant="muted" className="mt-1.5">{m.mode}</Badge>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {Object.keys(details.labels).length > 0 && (
                <section>
                  <h4 className="text-[10px] font-semibold text-text-faint uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Tag size={11} /> Labels
                  </h4>
                  <div className="rounded-xl border border-border bg-surface p-3 space-y-1.5">
                    {Object.entries(details.labels).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-xs">
                        <span className="text-text-muted shrink-0">{k}</span>
                        <span className="text-text font-mono truncate">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h4 className="text-[10px] font-semibold text-text-faint uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Image size={11} /> Runtime
                </h4>
                <div className="rounded-xl border border-border bg-surface p-3">
                  <DetailRow label="Environment vars" value={details.envCount} />
                </div>
              </section>
            </>
          )}

          {!details && !loading && (
            <p className="text-xs text-text-muted text-center py-4">Could not load full details</p>
          )}
        </div>
      </div>
    </div>
  );
}
