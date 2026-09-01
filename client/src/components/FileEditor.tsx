import { useCallback, useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { readFile, writeFile } from "../lib/api";
import { formatBytes, formatDate, getLanguageExtension } from "../lib/utils";

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
      <div className="flex items-center justify-center h-full text-text-muted">
        <div className="text-center">
          <EmptyIcon />
          <p className="mt-3 text-sm">Select a file to edit</p>
          <p className="mt-1 text-xs">Browse the file tree on the left</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-surface-raised shrink-0">
        <span className="text-sm font-mono truncate flex-1">{filePath}</span>
        {meta && (
          <span className="text-[11px] text-text-muted shrink-0 hidden sm:inline">
            {formatBytes(meta.size)} · {formatDate(meta.modified)}
          </span>
        )}
        {isDirty && (
          <span className="text-[11px] text-warning shrink-0">Modified</span>
        )}
        {saveMessage && (
          <span className="text-[11px] text-success shrink-0">{saveMessage}</span>
        )}
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="px-3 py-1 text-xs font-medium rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-danger bg-danger/10 border-b border-danger/20">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            Loading...
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}

function EmptyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto opacity-30">
      <path
        d="M10 8h18l10 10v24a2 2 0 01-2 2H10a2 2 0 01-2-2V10a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M28 8v10h10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 28h16M16 34h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
