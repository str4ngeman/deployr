import { useEffect, useState } from "react";
import { KeyRound, Save, Eye, EyeOff } from "lucide-react";
import { findEnvFiles, readEnvFile, writeEnvFile, type EnvVar } from "../lib/api";
import { Button, Card, PageHeader, EmptyState, Alert, ListSkeleton } from "./ui";

export function EnvPage() {
  const [files, setFiles] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<{ text: string; type: "success" | "danger" } | null>(null);

  useEffect(() => {
    findEnvFiles()
      .then((r) => {
        setFiles(r.files);
        if (r.files.length > 0) setSelected(r.files[0]);
      })
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    readEnvFile(selected)
      .then((r) => setVars(r.vars))
      .catch(() => setVars([]))
      .finally(() => setLoading(false));
  }, [selected]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await writeEnvFile(selected, vars);
      setMessage({ text: "Saved successfully", type: "success" });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Save failed", type: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const updateVar = (index: number, field: "key" | "value", value: string) => {
    setVars((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const addVar = () => setVars((prev) => [...prev, { key: "", value: "" }]);

  const removeVar = (index: number) => setVars((prev) => prev.filter((_, i) => i !== index));

  const toggleHidden = (index: number) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-4xl mx-auto animate-fade-in">
        <PageHeader
          title="Environment"
          description="Edit .env files safely"
          icon={<KeyRound size={20} />}
          actions={
            selected && (
              <Button variant="primary" loading={saving} onClick={handleSave} icon={<Save size={14} />}>
                Save
              </Button>
            )
          }
        />

        {message && (
          <Alert variant={message.type} className="mb-4" onDismiss={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {files.length === 0 && !loading ? (
          <EmptyState
            icon={<KeyRound size={24} />}
            title="No .env files found"
            description="Add .env files under your file root"
          />
        ) : (
          <>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full mb-4 bg-surface-overlay border border-border rounded-lg px-3 py-2 text-sm font-mono"
            >
              {files.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            {loading ? (
              <ListSkeleton count={5} />
            ) : (
              <Card className="divide-y divide-border-subtle">
                {vars.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 p-3">
                    <input
                      value={v.key}
                      onChange={(e) => updateVar(i, "key", e.target.value)}
                      className="w-1/3 bg-transparent border border-border rounded px-2 py-1 text-xs font-mono"
                      placeholder="KEY"
                    />
                    <input
                      type={hidden.has(i) ? "password" : "text"}
                      value={v.value}
                      onChange={(e) => updateVar(i, "value", e.target.value)}
                      className="flex-1 bg-transparent border border-border rounded px-2 py-1 text-xs font-mono"
                      placeholder="value"
                    />
                    <Button size="sm" variant="ghost" onClick={() => toggleHidden(i)}>
                      {hidden.has(i) ? <Eye size={13} /> : <EyeOff size={13} />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeVar(i)}>✕</Button>
                  </div>
                ))}
                <div className="p-3">
                  <Button size="sm" variant="ghost" onClick={addVar}>+ Add variable</Button>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
