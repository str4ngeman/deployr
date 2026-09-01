import { useEffect, useState } from "react";
import { Layers, Play, Square, RotateCcw, Download, RefreshCw } from "lucide-react";
import {
  listComposeProjects,
  composePull,
  composeUp,
  composeDown,
  composeRestart,
  type ComposeProject,
} from "../lib/api";
import { Button, Card, PageHeader, EmptyState, Alert, Badge, ListSkeleton } from "./ui";

export function ComposePage() {
  const [projects, setProjects] = useState<ComposeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "danger" } | null>(null);

  const load = () => {
    setLoading(true);
    listComposeProjects()
      .then((r) => setProjects(r.projects))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (path: string, action: string, fn: (p: string) => Promise<unknown>) => {
    const key = `${path}:${action}`;
    setActionLoading(key);
    setMessage(null);
    try {
      const result = await fn(path) as { message?: string };
      setMessage({ text: result.message || `${action} complete`, type: "success" });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Action failed", type: "danger" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-5xl mx-auto animate-fade-in">
        <PageHeader
          title="Compose"
          description="Discover and manage docker-compose projects"
          icon={<Layers size={20} />}
          actions={
            <Button variant="ghost" size="sm" onClick={load} icon={<RefreshCw size={14} />}>
              Refresh
            </Button>
          }
        />

        {message && (
          <Alert variant={message.type} className="mb-4" onDismiss={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {loading ? (
          <ListSkeleton count={4} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<Layers size={24} />}
            title="No compose projects found"
            description="Add docker-compose.yml files under your file root"
          />
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <Card key={project.path} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold">{project.name}</h3>
                    <p className="text-xs text-text-faint font-mono mt-0.5">{project.composeFile}</p>
                    {project.services.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {project.services.map((s) => (
                          <Badge key={s} variant="muted">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={actionLoading === `${project.path}:pull`}
                      onClick={() => run(project.path, "pull", composePull)}
                      icon={<Download size={13} />}
                    >
                      Pull
                    </Button>
                    <Button
                      size="sm"
                      variant="success"
                      loading={actionLoading === `${project.path}:up`}
                      onClick={() => run(project.path, "up", composeUp)}
                      icon={<Play size={13} />}
                    >
                      Up
                    </Button>
                    <Button
                      size="sm"
                      loading={actionLoading === `${project.path}:restart`}
                      onClick={() => run(project.path, "restart", composeRestart)}
                      icon={<RotateCcw size={13} />}
                    >
                      Restart
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={actionLoading === `${project.path}:down`}
                      onClick={() => run(project.path, "down", composeDown)}
                      icon={<Square size={13} />}
                    >
                      Down
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
