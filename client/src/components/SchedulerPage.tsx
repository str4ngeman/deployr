import { useEffect, useState } from "react";
import { Clock, Plus, Trash2, RefreshCw } from "lucide-react";
import {
  getScheduledTasks,
  createScheduledTask,
  deleteScheduledTask,
  toggleScheduledTask,
  type ScheduledTask,
} from "../lib/api";
import { Button, Card, PageHeader, EmptyState, Alert, Toggle, ListSkeleton } from "./ui";

const ACTIONS = [
  { value: "compose-pull", label: "Compose pull" },
  { value: "compose-up", label: "Compose up" },
  { value: "health-check", label: "Health check" },
];

const CRON_PRESETS = [
  { value: "every:5m", label: "Every 5 minutes" },
  { value: "every:15m", label: "Every 15 minutes" },
  { value: "every:1h", label: "Every hour" },
  { value: "every:6h", label: "Every 6 hours" },
  { value: "every:24h", label: "Daily" },
];

export function SchedulerPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [cron, setCron] = useState("every:1h");
  const [action, setAction] = useState("compose-pull");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "danger" } | null>(null);

  const load = () => {
    setLoading(true);
    getScheduledTasks()
      .then((r) => setTasks(r.tasks))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !target) return;
    setSaving(true);
    setMessage(null);
    try {
      await createScheduledTask({ name, cron, action, target });
      setShowForm(false);
      setName("");
      setTarget("");
      load();
      setMessage({ text: "Task created", type: "success" });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Failed", type: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (task: ScheduledTask) => {
    await toggleScheduledTask(task.id, !task.enabled);
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, enabled: t.enabled ? 0 : 1 } : t)),
    );
  };

  const handleDelete = async (id: number) => {
    await deleteScheduledTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-5xl mx-auto animate-fade-in">
        <PageHeader
          title="Scheduler"
          description="Automate compose pulls, deployments, and health checks"
          icon={<Clock size={20} />}
          actions={
            <>
              <Button variant="ghost" size="sm" onClick={load} icon={<RefreshCw size={14} />}>
                Refresh
              </Button>
              <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)} icon={<Plus size={14} />}>
                New task
              </Button>
            </>
          }
        />

        {message && (
          <Alert variant={message.type} className="mb-4" onDismiss={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {showForm && (
          <Card className="p-4 mb-6">
            <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-text-muted mb-1">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-overlay border border-border rounded-lg px-3 py-2 text-sm"
                  placeholder="Nightly pull"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Schedule</label>
                <select
                  value={cron}
                  onChange={(e) => setCron(e.target.value)}
                  className="w-full bg-surface-overlay border border-border rounded-lg px-3 py-2 text-sm"
                >
                  {CRON_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Action</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full bg-surface-overlay border border-border rounded-lg px-3 py-2 text-sm"
                >
                  {ACTIONS.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Target path</label>
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full bg-surface-overlay border border-border rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="my-project"
                />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" variant="primary" loading={saving}>Create</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <ListSkeleton count={3} />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={<Clock size={24} />}
            title="No scheduled tasks"
            description="Create a task to automate deployments and health checks"
          />
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <Card key={task.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{task.name}</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {task.action} → <span className="font-mono">{task.target}</span>
                  </p>
                  <p className="text-[10px] text-text-faint mt-1">
                    {task.cron}
                    {task.last_run && ` · Last run ${new Date(task.last_run).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Toggle checked={!!task.enabled} onChange={() => handleToggle(task)} />
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(task.id)}
                    icon={<Trash2 size={13} />}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
