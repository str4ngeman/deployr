import { useCallback, useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { FileCode2, Save } from "lucide-react";
import { readFile, writeFile } from "../lib/api";
import { formatBytes, formatDate, getLanguageExtension } from "../lib/utils";
import { Badge, Button, EmptyState, LoadingOverlay } from "./ui";

interface FileEditorProps {
  filePath: string | null;
}

export function FileEditor({ filePath }: FileEditorProps) {
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [meta, setMeta] = useState<{ size: number; modified: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const isDirty = content !== originalContent;

  const loadFile = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    setSaveMessage(null);
    try {
      const data = await readFile(path);
      setContent(data.content);
      setOriginalContent(data.content);
      setMeta({ size: data.size, modified: data.modified });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
      setContent("");
      setOriginalContent("");
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (filePath) {
      loadFile(filePath);
    } else {
      setContent("");
      setOriginalContent("");
      setMeta(null);
      setError(null);
    }
  }, [filePath, loadFile]);

  const handleSave = async () => {
    if (!filePath || !isDirty) return;
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const result = await writeFile(filePath, content);
      setOriginalContent(content);
      setMeta({ size: result.size, modified: result.modified });
      setSaveMessage("Saved");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (!filePath) {
    return (
      <EmptyState
        icon={<FileCode2 size={24} />}
        title="No file selected"
        description="Choose a file from the explorer to start editing"
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-surface-raised shrink-0">
        <FileCode2 size={16} className="text-accent shrink-0" />
        <span className="text-sm font-mono truncate flex-1">{filePath}</span>
        {meta && (
          <span className="text-[11px] text-text-faint shrink-0 hidden sm:inline">
            {formatBytes(meta.size)} · {formatDate(meta.modified)}
          </span>
        )}
        {isDirty && <Badge variant="warning">Unsaved</Badge>}
        {saveMessage && <Badge variant="success">{saveMessage}</Badge>}
        <Button
          variant="primary"
          size="sm"
          icon={<Save size={13} />}
          onClick={handleSave}
          disabled={!isDirty}
          loading={saving}
        >
          Save
        </Button>
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-danger bg-danger-muted border-b border-danger/20">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        {loading && <LoadingOverlay message="Loading file..." />}
        <CodeMirror
            value={content}
            height="100%"
            theme={oneDark}
            extensions={getLanguageExtension(filePath)}
            onChange={(value) => setContent(value)}
            className="h-full text-sm [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
              bracketMatching: true,
            }}
          />
      </div>
    </div>
  );
}
