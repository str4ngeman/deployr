import { useState } from "react";
import { FileExplorer } from "./FileExplorer";
import { FileEditor } from "./FileEditor";

export function EditorPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleFileRemoved = (path: string) => {
    setSelectedFile((current) => {
      if (!current) return current;
      if (current === path || current.startsWith(path + "/")) return null;
      return current;
    });
  };

  const handleFileRenamed = (oldPath: string, newPath: string) => {
    setSelectedFile((current) => (current === oldPath ? newPath : current));
  };

  return (
    <div className="flex h-full">
      <div className="w-72 shrink-0">
        <FileExplorer
          selectedPath={selectedFile}
          onSelectFile={setSelectedFile}
          onFileRemoved={handleFileRemoved}
          onFileRenamed={handleFileRenamed}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <FileEditor filePath={selectedFile} />
      </div>
    </div>
  );
}
