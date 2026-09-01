import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileCode2,
  Container,
  ScrollText,
  Settings,
  Server,
  HardDrive,
  Activity,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { getHealth, listContainers } from "../lib/api";
import { Card, PageHeader, StatCard, Badge, cn } from "./ui";

export function Dashboard() {
  const [health, setHealth] = useState<{
    fileRoot: string;
    port: number;
    docker: { enabled: boolean; connected: boolean };
  } | null>(null);
  const [containerStats, setContainerStats] = useState({ total: 0, running: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getHealth(),
      listContainers({ all: true }).catch(() => ({ containers: [] })),
    ])
      .then(([h, c]) => {
        setHealth(h);
        setContainerStats({
          total: c.containers.length,
          running: c.containers.filter((x) => x.state === "running").length,
        });
      })
      .catch(() => setHealth(null))
      .finally(() => setLoading(false));
  }, []);

  const tools = [
    {
      to: "/editor",
      title: "File Editor",
      description: "Browse, create, and edit files on your VPS",
      icon: FileCode2,
      color: "text-blue-400",
      bg: "bg-blue-400/10 border-blue-400/20",
    },
    {
      to: "/apps",
      title: "Apps Manager",
      description: "Control Docker containers and GHCR deployments",
      icon: Container,
      color: "text-violet-400",
      bg: "bg-violet-400/10 border-violet-400/20",
    },
    {
      to: "/logs",
      title: "Logs Viewer",
      description: "Stream and tail container logs in real time",
      icon: ScrollText,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10 border-emerald-400/20",
    },
    {
      to: "/settings",
      title: "Settings",
      description: "GHCR credentials, defaults, and preferences",
      icon: Settings,
      color: "text-amber-400",
      bg: "bg-amber-400/10 border-amber-400/20",
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-5xl mx-auto animate-fade-in">
        <PageHeader
          title="Dashboard"
          description="Overview of your VPS and running services"
          icon={<Activity size={20} />}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Running containers"
            value={containerStats.running}
            loading={loading}
            icon={<Container size={16} />}
            trend={`${containerStats.total} total`}
          />
          <StatCard
            label="Server port"
            value={health?.port ?? "—"}
            loading={loading}
            icon={<Server size={16} />}
          />
          <StatCard
            label="Docker"
            value={health?.docker.connected ? "Online" : "Offline"}
            loading={loading}
            icon={health?.docker.connected ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          />
          <StatCard
            label="File root"
            value={health ? health.fileRoot.split("/").pop() || "/" : "—"}
            loading={loading}
            icon={<HardDrive size={16} />}
            trend={health?.fileRoot}
          />
        </div>

        {health && (
          <Card className="p-4 mb-8 glass">
            <div className="flex flex-wrap gap-6 text-xs">
              <div>
                <span className="text-text-faint">File root</span>
                <p className="font-mono text-text mt-0.5">{health.fileRoot}</p>
              </div>
              <div>
                <span className="text-text-faint">Docker</span>
                <p className="mt-0.5">
                  <Badge variant={health.docker.connected ? "success" : "danger"}>
                    {health.docker.enabled ? (health.docker.connected ? "Connected" : "Disconnected") : "Disabled"}
                  </Badge>
                </p>
              </div>
            </div>
          </Card>
        )}

        <h2 className="text-sm font-semibold text-text-muted mb-4">Quick access</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {tools.map((tool) => (
            <Link key={tool.to} to={tool.to}>
              <Card hover className="p-5 group h-full">
                <div className="flex items-start gap-4">
                  <div className={cn("w-11 h-11 rounded-xl border flex items-center justify-center shrink-0", tool.bg, tool.color)}>
                    <tool.icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{tool.title}</h3>
                      <ArrowRight size={14} className="text-text-faint group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="mt-1 text-xs text-text-muted leading-relaxed">{tool.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
