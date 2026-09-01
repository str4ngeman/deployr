import { useState } from "react";
import { FileExplorer } from "./FileExplorer";
import { FileEditor } from "./FileEditor";

export function EditorPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <div className="flex h-full">
      <div className="w-72 shrink-0">
        <FileExplorer
          selectedPath={selectedFile}
          onSelectFile={setSelectedFile}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <FileEditor filePath={selectedFile} />
      </div>
    </div>
  );
}
