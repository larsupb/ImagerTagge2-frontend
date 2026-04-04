"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";

export default function ToolsPage() {
  const { datasetInfo } = useSessionStore();
  const [targetDir, setTargetDir] = useState("");
  const [option, setOption] = useState("all");
  const [status, setStatus] = useState<string | null>(null);

  if (!datasetInfo) {
    return <div className="text-zinc-500 text-center py-12">Load a dataset first</div>;
  }

  const handleCopy = async () => {
    if (!targetDir.trim()) return;
    const result = await api.copyImages(targetDir, option);
    setStatus(`Copied ${(result as { copied: number }).copied} images to ${targetDir}`);
  };

  return (
    <div className="max-w-lg flex flex-col gap-4">
      <h2 className="text-lg font-medium">Copy Images</h2>

      <input
        value={targetDir}
        onChange={(e) => setTargetDir(e.target.value)}
        placeholder="Target directory..."
        className="px-3 py-2 bg-zinc-900 border border-zinc-600 rounded text-sm text-white"
      />

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" value="all" checked={option === "all"} onChange={() => setOption("all")} />
          All images
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" value="bookmarks" checked={option === "bookmarks"} onChange={() => setOption("bookmarks")} />
          Bookmarked only
        </label>
      </div>

      <button onClick={handleCopy} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium w-fit">
        Copy
      </button>

      {status && <div className="text-xs text-green-400">{status}</div>}
    </div>
  );
}
