import { useCallback, useEffect, useState } from "react";
import {
  copyFile,
  createDirectory,
  createFile,
  deleteItem,
  listFiles,
  renameItem,
  type FileEntry,
} from "../lib/api";
import { formatBytes } from "../lib/utils";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { PromptDialog } from "./PromptDialog";

interface FileExplorerProps {
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  onFileRemoved?: (path: string) => void;
  onFileRenamed?: (oldPath: string, newPath: string) => void;
}

type ContextTarget =
  | { kind: "entry"; entry: FileEntry }
  | { kind: "background" };

type PromptState =
  | { type: "rename"; entry: FileEntry }
  | { type: "newFile"; dirPath: string }
  | { type: "newFolder"; dirPath: string };

export function FileExplorer({
  selectedPath,
  onSelectFile,
  onFileRemoved,
  onFileRenamed,
}: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set([""]));
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target: ContextTarget;
  } | null>(null);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const joinPath = (dir: string, name: string) =>
    dir ? `${dir}/${name}` : name;

  const handleDelete = async (entry: FileEntry) => {
    const label = entry.type === "directory" ? "folder" : "file";
    if (!confirm(`Delete ${label} "${entry.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      setActionError(null);
      await deleteItem(entry.path);
      if (selectedPath === entry.path || selectedPath?.startsWith(entry.path + "/")) {
        onFileRemoved?.(entry.path);
      }
      await loadDir(currentPath);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleRename = async (entry: FileEntry, newName: string) => {
    try {
      setActionError(null);
      const result = await renameItem(entry.path, newName);
      onFileRenamed?.(entry.path, result.path);
      await loadDir(currentPath);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Rename failed");
    }
  };

  const handleDuplicate = async (entry: FileEntry) => {
    try {
      setActionError(null);
      await copyFile(entry.path);
      await loadDir(currentPath);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Copy failed");
    }
  };

  const handleCopyPath = (entryPath: string) => {
    navigator.clipboard.writeText("/" + entryPath);
  };

  const handleCreateFile = async (dirPath: string, name: string) => {
    try {
      setActionError(null);
      const filePath = joinPath(dirPath, name);
      await createFile(filePath);
      await loadDir(currentPath);
      onSelectFile(filePath);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Create failed");
    }
  };

  const handleCreateFolder = async (dirPath: string, name: string) => {
    try {
      setActionError(null);
      await createDirectory(joinPath(dirPath, name));
      await loadDir(currentPath);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Create failed");
    }
  };

  const getContextMenuItems = (target: ContextTarget): ContextMenuItem[] => {
    if (target.kind === "background") {
      return [
        {
          label: "New File",
          onClick: () => setPrompt({ type: "newFile", dirPath: currentPath }),
        },
        {
          label: "New Folder",
          onClick: () => setPrompt({ type: "newFolder", dirPath: currentPath }),
        },
        { label: "", onClick: () => {}, separator: true },
        { label: "Refresh", onClick: () => loadDir(currentPath) },
      ];
    }

    const { entry } = target;
    const isDir = entry.type === "directory";
    const items: ContextMenuItem[] = [
      {
        label: "Open",
        onClick: () => {
          if (isDir) {
            loadDir(entry.path);
            toggleDir(entry.path);
          } else {
            onSelectFile(entry.path);
          }
        },
      },
      {
        label: "Rename",
        onClick: () => setPrompt({ type: "rename", entry }),
      },
    ];

    if (!isDir) {
      items.push({ label: "Duplicate", onClick: () => handleDuplicate(entry) });
    }

    items.push({ label: "Copy Path", onClick: () => handleCopyPath(entry.path) });

    if (isDir) {
      items.push(
        { label: "", onClick: () => {}, separator: true },
        {
          label: "New File",
          onClick: () => setPrompt({ type: "newFile", dirPath: entry.path }),
        },
        {
          label: "New Folder",
          onClick: () => setPrompt({ type: "newFolder", dirPath: entry.path }),
        },
      );
    }

    items.push(
      { label: "", onClick: () => {}, separator: true },
      { label: "Delete", onClick: () => handleDelete(entry), danger: true },
    );

    return items;
  };

  const openContextMenu = (e: React.MouseEvent, target: ContextTarget) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, target });
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

      <div
        className="flex-1 overflow-y-auto py-1"
        onContextMenu={(e) => openContextMenu(e, { kind: "background" })}
      >
        {loading && entries.length === 0 && (
          <p className="px-3 py-2 text-xs text-text-muted">Loading...</p>
        )}
        {error && (
          <p className="px-3 py-2 text-xs text-danger">{error}</p>
        )}
        {actionError && (
          <p className="px-3 py-2 text-xs text-danger">{actionError}</p>
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
            onContextMenu={(e) => openContextMenu(e, { kind: "entry", entry })}
          />
        ))}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.target)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {prompt?.type === "rename" && (
        <PromptDialog
          title={`Rename ${prompt.entry.type}`}
          defaultValue={prompt.entry.name}
          confirmLabel="Rename"
          onConfirm={(name) => {
            handleRename(prompt.entry, name);
            setPrompt(null);
          }}
          onCancel={() => setPrompt(null)}
        />
      )}

      {prompt?.type === "newFile" && (
        <PromptDialog
          title="New File"
          placeholder="filename.txt"
          confirmLabel="Create"
          onConfirm={(name) => {
            handleCreateFile(prompt.dirPath, name);
            setPrompt(null);
          }}
          onCancel={() => setPrompt(null)}
        />
      )}

      {prompt?.type === "newFolder" && (
        <PromptDialog
          title="New Folder"
          placeholder="folder-name"
          confirmLabel="Create"
          onConfirm={(name) => {
            handleCreateFolder(prompt.dirPath, name);
            setPrompt(null);
          }}
          onCancel={() => setPrompt(null)}
        />
      )}
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
  onContextMenu,
}: {
  entry: FileEntry;
  depth: number;
  selectedPath: string | null;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
  onSelectFile: (path: string) => void;
  onNavigateDir: (path: string) => void;
  onContextMenu: (e: React.MouseEvent) => void;
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
      onContextMenu={onContextMenu}
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
