import { useCallback, useEffect, useState } from "react";
import {
  Settings,
  Save,
  ScrollText,
  Container,
  Key,
  Eye,
} from "lucide-react";
import {
  getHiddenContainers,
  getSettings,
  unhideContainer,
  updateSettings,
  type HiddenContainer,
  type SettingItem,
} from "../lib/api";
import { formatDate } from "../lib/utils";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  Toggle,
  cn,
} from "./ui";

const GROUP_ICONS: Record<string, React.ReactNode> = {
  Logs: <ScrollText size={16} />,
  Apps: <Container size={16} />,
  GHCR: <Key size={16} />,
};

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [hidden, setHidden] = useState<HiddenContainer[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsData, hiddenData] = await Promise.all([getSettings(), getHiddenContainers()]);
      setSettings(settingsData.settings);
      setHidden(hiddenData.containers);
      const initial: Record<string, string> = {};
      for (const s of settingsData.settings) initial[s.key] = s.value;
      setDraft(initial);
      const groups = [...new Set(settingsData.settings.map((s) => s.group))];
      setActiveGroup((prev) => prev || groups[0] || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await updateSettings(draft);
      setSettings(result.settings);
      const next: Record<string, string> = {};
      for (const s of result.settings) next[s.key] = s.value;
      setDraft(next);
      setMessage("Settings saved successfully");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleUnhide = async (containerId: string) => {
    try {
      await unhideContainer(containerId);
      setHidden((prev) => prev.filter((c) => c.container_id !== containerId));
      setMessage("Container unhidden");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unhide");
    }
  };

  const groups = [...new Set(settings.map((s) => s.group))];
  const groupSettings = settings.filter((s) => s.group === activeGroup);

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-4xl mx-auto animate-fade-in">
        <PageHeader
          title="Settings"
          description="Configure Deployr behavior and integrations"
          icon={<Settings size={20} />}
          actions={
            <Button variant="primary" icon={<Save size={14} />} onClick={handleSave} loading={saving}>
              Save changes
            </Button>
          }
        />

        {message && <Alert variant="success" onDismiss={() => setMessage(null)} className="mb-4">{message}</Alert>}
        {error && <Alert variant="danger" onDismiss={() => setError(null)} className="mb-4">{error}</Alert>}

        <div className="flex gap-6">
          <div className="w-44 shrink-0 space-y-1">
            {groups.map((group) => (
              <button
                key={group}
                onClick={() => setActiveGroup(group)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all",
                  activeGroup === group
                    ? "bg-accent-muted text-accent font-medium"
                    : "text-text-muted hover:text-text hover:bg-surface-overlay",
                )}
              >
                {GROUP_ICONS[group]}
                {group}
              </button>
            ))}
            <button
              onClick={() => setActiveGroup("_hidden")}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all",
                activeGroup === "_hidden"
                  ? "bg-accent-muted text-accent font-medium"
                  : "text-text-muted hover:text-text hover:bg-surface-overlay",
              )}
            >
              <Eye size={16} />
              Hidden
              {hidden.length > 0 && (
                <Badge variant="muted" className="ml-auto">{hidden.length}</Badge>
              )}
            </button>
          </div>

          <div className="flex-1 min-w-0">
            {activeGroup === "_hidden" ? (
              <section>
                <h3 className="text-sm font-semibold mb-4">Hidden containers</h3>
                {hidden.length === 0 ? (
                  <EmptyState
                    icon={<Eye size={20} />}
                    title="No hidden containers"
                    description="Use the eye icon on the Logs page to hide containers from the list"
                  />
                ) : (
                  <div className="space-y-2">
                    {hidden.map((container) => (
                      <Card key={container.container_id} className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">{container.container_name}</p>
                          <p className="text-[11px] text-text-faint font-mono mt-0.5">{container.container_id.slice(0, 12)}</p>
                          <p className="text-[10px] text-text-faint mt-0.5">Hidden {formatDate(container.hidden_at)}</p>
                        </div>
                        <Button size="sm" onClick={() => handleUnhide(container.container_id)}>Unhide</Button>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <section className="space-y-4">
                {groupSettings.map((setting) => (
                  <Card key={setting.key} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium">{setting.label}</label>
                        <p className="text-xs text-text-muted mt-0.5">{setting.description}</p>
                      </div>
                      {setting.type === "boolean" ? (
                        <Toggle
                          checked={draft[setting.key] === "true"}
                          onChange={(v) => setDraft((prev) => ({ ...prev, [setting.key]: v ? "true" : "false" }))}
                        />
                      ) : (
                        <div className="w-64 shrink-0">
                          <input
                            type={setting.type === "secret" ? "password" : setting.type === "number" ? "number" : "text"}
                            value={draft[setting.key] ?? ""}
                            onChange={(e) => setDraft((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                            placeholder={setting.type === "secret" && setting.masked ? "••••••••" : undefined}
                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
