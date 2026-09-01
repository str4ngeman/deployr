import { useCallback, useEffect, useState } from "react";
import {
  getHiddenContainers,
  getSettings,
  unhideContainer,
  updateSettings,
  type HiddenContainer,
  type SettingItem,
} from "../lib/api";

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [hidden, setHidden] = useState<HiddenContainer[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsData, hiddenData] = await Promise.all([
        getSettings(),
        getHiddenContainers(),
      ]);
      setSettings(settingsData.settings);
      setHidden(hiddenData.containers);
      const initial: Record<string, string> = {};
      for (const s of settingsData.settings) {
        initial[s.key] = s.value;
      }
      setDraft(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await updateSettings(draft);
      setSettings(result.settings);
      const next: Record<string, string> = {};
      for (const s of result.settings) {
        next[s.key] = s.value;
      }
      setDraft(next);
      setMessage("Settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
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
      setError(err instanceof Error ? err.message : "Failed to unhide container");
    }
  };

  const groups = [...new Set(settings.map((s) => s.group))];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-sm">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
            <p className="mt-1 text-text-muted text-sm">
              Configure Deployr behavior and integrations.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-xs font-medium rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
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

        <div className="mt-8 space-y-8">
          {groups.map((group) => (
            <section key={group}>
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
                {group}
              </h3>
              <div className="space-y-4">
                {settings
                  .filter((s) => s.group === group)
                  .map((setting) => (
                    <SettingField
                      key={setting.key}
                      setting={setting}
                      value={draft[setting.key] ?? setting.value}
                      onChange={(value) =>
                        setDraft((prev) => ({ ...prev, [setting.key]: value }))
                      }
                    />
                  ))}
              </div>
            </section>
          ))}

          <section>
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
              Hidden Containers
            </h3>
            {hidden.length === 0 ? (
              <p className="text-sm text-text-muted">
                No hidden containers. Use the eye icon on the Logs page to hide containers.
              </p>
            ) : (
              <div className="space-y-2">
                {hidden.map((container) => (
                  <div
                    key={container.container_id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{container.container_name}</p>
                      <p className="text-[11px] text-text-muted font-mono truncate">
                        {container.container_id.slice(0, 12)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnhide(container.container_id)}
                      className="px-3 py-1 text-xs font-medium rounded-md border border-border hover:bg-surface-overlay"
                    >
                      Unhide
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SettingField({
  setting,
  value,
  onChange,
}: {
  setting: SettingItem;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-4">
      <label className="block text-sm font-medium">{setting.label}</label>
      <p className="mt-0.5 text-xs text-text-muted">{setting.description}</p>
      <div className="mt-3">
        {setting.type === "boolean" ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value === "true"}
              onChange={(e) => onChange(e.target.checked ? "true" : "false")}
              className="rounded border-border"
            />
            <span className="text-text-muted">Enabled</span>
          </label>
        ) : (
          <input
            type={setting.type === "secret" ? "password" : setting.type === "number" ? "number" : "text"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={setting.type === "secret" && setting.masked ? "Leave blank to keep current" : undefined}
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text"
          />
        )}
      </div>
    </div>
  );
}
