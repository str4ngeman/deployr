import { useEffect, useState } from "react";
import { Archive, Plus, Trash2, RefreshCw, Download, RotateCcw } from "lucide-react";
import {
  listBackups,
  listBackupPaths,
  createBackup,
  deleteBackup,
  downloadBackup,
  restoreBackup,
  formatBytes,
  type BackupEntry,
} from "../lib/api";
import { Button, Card, PageHeader, EmptyState, Alert, ListSkeleton } from "./ui";

export function BackupsPage() {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [paths, setPaths] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "danger" } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [b, p] = await Promise.all([listBackups(), listBackupPaths()]);
      setBackups(b.backups);
      setPaths(p.paths);
      if (!selectedPath && p.paths.length > 0) setSelectedPath(p.paths[0]);
    } catch {
      setBackups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!selectedPath) return;
    setCreating(true);
    setMessage(null);
    try {
      await createBackup(selectedPath);
      setMessage({ text: "Backup created successfully", type: "success" });
      await load();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Backup failed", type: "danger" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteBackup(id);
      setBackups((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Delete failed", type: "danger" });
    }
  };

  const handleDownload = async (backup: BackupEntry) => {
    setActionId(backup.id);
    try {
      await downloadBackup(backup.id, backup.filename);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Download failed", type: "danger" });
    } finally {
      setActionId(null);
    }
  };

  const handleRestore = async (backup: BackupEntry) => {
    if (!confirm(`Restore "${backup.source_path}" from this backup? Current files will be overwritten.`)) {
      return;
    }
    setActionId(backup.id);
    try {
      await restoreBackup(backup.id);
      setMessage({ text: `Restored ${backup.source_path}`, type: "success" });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Restore failed", type: "danger" });
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-5xl mx-auto animate-fade-in">
        <PageHeader
          title="Backups"
          description="Create tar.gz snapshots of directories — download or restore anytime"
          icon={<Archive size={20} />}
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

        <Card className="p-4 mb-6">
          <h2 className="text-sm font-semibold mb-1">Create backup</h2>
          <p className="text-xs text-text-muted mb-3">
            Archives a directory under your file root as a compressed .tar.gz file stored on the server.
          </p>
          <div className="flex gap-2">
            <select
              value={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
              className="flex-1 bg-surface-overlay border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
            >
              {paths.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <Button
              variant="primary"
              loading={creating}
              onClick={handleCreate}
              icon={<Plus size={14} />}
              disabled={!selectedPath}
            >
              Backup
            </Button>
          </div>
        </Card>

        {loading ? (
          <ListSkeleton count={4} />
        ) : backups.length === 0 ? (
          <EmptyState
            icon={<Archive size={24} />}
            title="No backups yet"
            description="Create your first backup from a directory above"
          />
        ) : (
          <div className="space-y-2">
            {backups.map((b) => (
              <Card key={b.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{b.name}</h3>
                  <p className="text-xs text-text-faint font-mono mt-0.5">{b.source_path}</p>
                  <p className="text-[10px] text-text-muted mt-1">
                    {formatBytes(b.size)} · {new Date(b.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={actionId === b.id}
                    onClick={() => handleDownload(b)}
                    icon={<Download size={13} />}
                  >
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={actionId === b.id}
                    onClick={() => handleRestore(b)}
                    icon={<RotateCcw size={13} />}
                  >
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(b.id)}
                    icon={<Trash2 size={13} />}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
