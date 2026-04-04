"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface TagOperationsProps {
  selectedTags: string[];
}

export default function TagOperations({ selectedTags }: TagOperationsProps) {
  const [appendTag, setAppendTag] = useState("");
  const [prependTag, setPrependTag] = useState("");
  const [subdirName, setSubdirName] = useState("");
  const [inverse, setInverse] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["tagCloud"] });

  const handleRemove = async () => {
    if (selectedTags.length === 0) return;
    const result = await api.removeTags(selectedTags);
    setStatus(`Removed from ${(result as { modified: number }).modified} captions`);
    refresh();
  };

  const handleCleanup = async () => {
    const result = await api.cleanupTags();
    setStatus(`Cleaned ${(result as { modified: number }).modified} captions`);
    refresh();
  };

  const handleReplaceUnderscores = async () => {
    const result = await api.replaceUnderscores();
    setStatus(`Updated ${(result as { modified: number }).modified} captions`);
    refresh();
  };

  const handleAppend = async () => {
    if (!appendTag.trim()) return;
    const result = await api.appendTag(appendTag.trim());
    setStatus(`Appended to ${(result as { modified: number }).modified} captions`);
    setAppendTag("");
    refresh();
  };

  const handlePrepend = async () => {
    if (!prependTag.trim()) return;
    const result = await api.prependTag(prependTag.trim());
    setStatus(`Prepended to ${(result as { modified: number }).modified} captions`);
    setPrependTag("");
    refresh();
  };

  const handleMoveToSubdir = async () => {
    if (selectedTags.length === 0 || !subdirName.trim()) return;
    const result = await api.moveToSubdir(selectedTags, inverse, subdirName.trim());
    setStatus(`Moved ${(result as { moved: number }).moved} images`);
    refresh();
  };

  const handleExport = async () => {
    const result = await api.exportJsonl();
    setStatus(`Exported ${result.count} captions to ${result.path}`);
  };

  return (
    <div className="flex flex-col gap-3">
      {status && (
        <div className="text-xs text-green-400 bg-green-900/20 px-3 py-1.5 rounded">
          {status}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={handleRemove} disabled={selectedTags.length === 0}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-xs disabled:opacity-50">
          Remove Selected Tags
        </button>
        <button onClick={handleCleanup}
          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 rounded text-xs">
          Cleanup Tags
        </button>
        <button onClick={handleReplaceUnderscores}
          className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">
          Replace Underscores
        </button>
        <button onClick={handleExport}
          className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">
          Export JSONL
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={appendTag}
          onChange={(e) => setAppendTag(e.target.value)}
          placeholder="Tag to append..."
          className="flex-1 px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-xs text-white"
        />
        <button onClick={handleAppend} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs">
          Append
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={prependTag}
          onChange={(e) => setPrependTag(e.target.value)}
          placeholder="Tag to prepend..."
          className="flex-1 px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-xs text-white"
        />
        <button onClick={handlePrepend} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs">
          Prepend
        </button>
      </div>

      <div className="flex gap-2 items-center">
        <input
          value={subdirName}
          onChange={(e) => setSubdirName(e.target.value)}
          placeholder="Subdirectory name..."
          className="flex-1 px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-xs text-white"
        />
        <label className="flex items-center gap-1 text-xs text-zinc-400">
          <input type="checkbox" checked={inverse} onChange={(e) => setInverse(e.target.checked)} />
          Inverse
        </label>
        <button onClick={handleMoveToSubdir} disabled={selectedTags.length === 0}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs disabled:opacity-50">
          Move to Subdir
        </button>
      </div>
    </div>
  );
}
