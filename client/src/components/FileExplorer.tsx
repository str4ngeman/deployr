import { useCallback, useEffect, useState } from "react";
import { listFiles, type FileEntry } from "../lib/api";
import { formatBytes } from "../lib/utils";

interface FileExplorerProps {
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

export function FileExplorer({ selectedPath, onSelectFile }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set([""]));

  const loadDir = useCallback(async (dirPath: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listFiles(dirPath);
      setEntries(data.entries);
      setCurrentPath(dirPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDir("");
  }, [loadDir]);

  const navigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split("/");
    parts.pop();
    loadDir(parts.join("/"));
  };

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full border-r border-border bg-surface-raised">
      <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
        <button
          onClick={navigateUp}
          disabled={!currentPath}
          className="p-1 rounded hover:bg-surface-overlay disabled:opacity-30 disabled:cursor-not-allowed text-text-muted hover:text-text transition-colors"
          title="Go up"
        >
          <UpIcon />
        </button>
        <button
          onClick={() => loadDir(currentPath)}
          className="p-1 rounded hover:bg-surface-overlay text-text-muted hover:text-text transition-colors"
          title="Refresh"
        >
          <RefreshIcon />
        </button>
        <span className="text-xs text-text-muted font-mono truncate flex-1">
          /{currentPath || ""}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {loading && entries.length === 0 && (
          <p className="px-3 py-2 text-xs text-text-muted">Loading...</p>
        )}
        {error && (
          <p className="px-3 py-2 text-xs text-danger">{error}</p>
        )}
        {entries.map((entry) => (
          <ExplorerItem
            key={entry.path}
            entry={entry}
            depth={0}
            selectedPath={selectedPath}
            expandedDirs={expandedDirs}
            onToggleDir={toggleDir}
            onSelectFile={onSelectFile}
            onNavigateDir={loadDir}
          />
        ))}
      </div>
    </div>
  );
}

function ExplorerItem({
  entry,
  depth,
  selectedPath,
  expandedDirs,
  onToggleDir,
  onSelectFile,
  onNavigateDir,
}: {
  entry: FileEntry;
  depth: number;
  selectedPath: string | null;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
  onSelectFile: (path: string) => void;
  onNavigateDir: (path: string) => void;
}) {
  const isDir = entry.type === "directory";
  const isSelected = selectedPath === entry.path;
  const isExpanded = expandedDirs.has(entry.path);

  const handleClick = () => {
    if (isDir) {
      onNavigateDir(entry.path);
      onToggleDir(entry.path);
    } else {
      onSelectFile(entry.path);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center gap-1.5 px-2 py-1 text-left text-sm transition-colors ${
        isSelected
          ? "bg-accent/15 text-accent"
          : "text-text-muted hover:bg-surface-overlay hover:text-text"
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      {isDir ? (
        <FolderIcon open={isExpanded} />
      ) : (
        <FileIcon />
      )}
      <span className="truncate flex-1">{entry.name}</span>
      {!isDir && entry.size !== undefined && (
        <span className="text-[10px] text-text-muted shrink-0 mr-1">
          {formatBytes(entry.size)}
        </span>
      )}
    </button>
  );
}

function UpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 10V4M4 7l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M11.5 7A4.5 4.5 0 105.5 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M5.5 1v2h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-warning">
      {open ? (
        <path
          d="M1.5 4.5h4l1.5 1.5H12.5V11a1 1 0 01-1 1H2.5a1 1 0 01-1-1V4.5z"
          fill="currentColor"
          fillOpacity="0.2"
          stroke="currentColor"
          strokeWidth="1"
        />
      ) : (
        <path
          d="M1.5 4h4l1.5 1.5H12a1 1 0 011 1v5.5a1 1 0 01-1 1H2a1 1 0 01-1-1V4z"
          fill="currentColor"
          fillOpacity="0.2"
          stroke="currentColor"
          strokeWidth="1"
        />
      )}
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <path
        d="M2.5 1.5h5l3 3v7.5a.5.5 0 01-.5.5H2.5a.5.5 0 01-.5-.5V2a.5.5 0 01.5-.5z"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}
