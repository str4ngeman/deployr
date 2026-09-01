import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  HardDrive,
  HeartPulse,
  GitBranch,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  getContainerStats,
  getDiskUsage,
  getHealthChecks,
  runHealthChecks,
  getGitRepos,
  formatBytes,
  type ContainerStat,
  type DiskEntry,
  type HealthCheck,
  type GitRepo,
} from "../lib/api";
import { Button, Card, PageHeader, StatCard, Badge, ListSkeleton, cn } from "./ui";

export function MonitorPage() {
  const [stats, setStats] = useState<ContainerStat[]>([]);
  const [disk, setDisk] = useState<DiskEntry[]>([]);
  const [system, setSystem] = useState<{ total: number; used: number; available: number } | null>(null);
  const [health, setHealth] = useState<HealthCheck[]>([]);
  const [repos, setRepos] = useState<GitRepo[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const hasLoaded = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      if (!hasLoaded.current) setInitialLoading(true);
      else setRefreshing(true);
    }

    try {
      const [s, d, h, g] = await Promise.all([
        getContainerStats(),
        getDiskUsage(),
        getHealthChecks(),
        getGitRepos(),
      ]);
      setStats(s.stats);
      setDisk(d.entries);
      setSystem(d.system);
      setHealth(h.checks);
      setRepos(g.repos);
      hasLoaded.current = true;
    } catch {
      // partial failure ok
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const runHealth = async () => {
    setHealthLoading(true);
    try {
      const result = await runHealthChecks();
      setHealth(result.checks);
    } finally {
      setHealthLoading(false);
    }
  };

  const unhealthy = health.filter((c) => !c.healthy).length;
  const avgCpu = stats.length
    ? Math.round(stats.reduce((a, s) => a + s.cpuPercent, 0) / stats.length * 10) / 10
    : 0;

  const diskPercent =
    system && system.total > 0 ? Math.round((system.used / system.total) * 100) : null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-5xl mx-auto animate-fade-in">
        <PageHeader
          title="Monitor"
          description="Resource usage, health checks, and git status"
          icon={<Activity size={20} />}
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => load()}
              loading={refreshing}
              icon={<RefreshCw size={14} className={refreshing ? "animate-spin-slow" : ""} />}
            >
              Refresh
            </Button>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Avg CPU" value={`${avgCpu}%`} loading={initialLoading} icon={<Activity size={16} />} />
          <StatCard label="Containers" value={stats.length} loading={initialLoading} icon={<Activity size={16} />} />
          <StatCard
            label="Disk used"
            value={system && system.total > 0 ? formatBytes(system.used) : "—"}
            loading={initialLoading}
            icon={<HardDrive size={16} />}
            trend={
              diskPercent !== null
                ? `${diskPercent}% of ${formatBytes(system!.total)}`
                : undefined
            }
          />
          <StatCard
            label="Health"
            value={unhealthy > 0 ? `${unhealthy} issues` : "All OK"}
            loading={initialLoading}
            icon={<HeartPulse size={16} />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Activity size={16} className="text-accent" />
                Container stats
              </h2>
            </div>
            {initialLoading ? (
              <ListSkeleton count={3} />
            ) : stats.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">No running containers</p>
            ) : (
              <div className="space-y-2">
                {stats.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                    <span className="text-xs font-mono truncate flex-1">{s.name}</span>
                    <div className="flex gap-3 text-xs text-text-muted shrink-0">
                      <span>{s.cpuPercent}% CPU</span>
                      <span>{formatBytes(s.memoryUsage)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <HeartPulse size={16} className="text-accent" />
                Health checks
              </h2>
              <Button size="sm" variant="ghost" loading={healthLoading} onClick={runHealth}>
                Run now
              </Button>
            </div>
            {health.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">No health data yet</p>
            ) : (
              <div className="space-y-2">
                {health.map((c) => (
                  <div key={c.container_id} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                    <span className="text-xs truncate flex-1">{c.container_name}</span>
                    <Badge variant={c.healthy ? "success" : "danger"}>
                      {c.healthy ? "Healthy" : "Unhealthy"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <HardDrive size={16} className="text-accent" />
              Largest directories
            </h2>
            {initialLoading ? (
              <ListSkeleton count={3} />
            ) : disk.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">No data</p>
            ) : (
              <div className="space-y-2">
                {disk.map((d) => (
                  <div key={d.path} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                    <span className="text-xs font-mono truncate flex-1">{d.path}</span>
                    <span className="text-xs text-text-muted shrink-0">{formatBytes(d.size)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <GitBranch size={16} className="text-accent" />
              Git repositories
            </h2>
            {repos.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">No git repos found</p>
            ) : (
              <div className="space-y-2">
                {repos.map((r) => (
                  <div key={r.path} className="py-2 border-b border-border-subtle last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono truncate">{r.path}</span>
                      <div className="flex gap-1 shrink-0">
                        {r.pendingDeploy && (
                          <Badge variant="warning">Deploy pending</Badge>
                        )}
                        {r.dirty && (
                          <Badge variant="warning">
                            <AlertTriangle size={10} />
                            dirty
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className={cn("text-[10px] text-text-faint mt-0.5 font-mono")}>
                      {r.branch || "—"} @ {(r.commit || "—").slice(0, 7)}
                      {r.behindRemote ? ` · ${r.behindRemote} behind` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
