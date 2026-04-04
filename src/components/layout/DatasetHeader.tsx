"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";

export default function DatasetHeader() {
  const [path, setPath] = useState("");
  const [masksPath, setMasksPath] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [subdirs, setSubdirs] = useState(false);

  const { setDatasetInfo, setLoading, setError, datasetInfo } = useSessionStore();

  const handleLoad = async () => {
    if (!path.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const info = await api.loadDataset(path, masksPath || undefined, onlyMissing, subdirs);
      setDatasetInfo(info);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dataset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 border-b border-zinc-700 bg-zinc-800">
      <input
        type="text"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="Dataset folder path..."
        className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
      />
      <input
        type="text"
        value={masksPath}
        onChange={(e) => setMasksPath(e.target.value)}
        placeholder="Masks folder (optional)"
        className="w-56 px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
      />
      <label className="flex items-center gap-1 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={onlyMissing}
          onChange={(e) => setOnlyMissing(e.target.checked)}
          className="rounded"
        />
        Missing only
      </label>
      <label className="flex items-center gap-1 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={subdirs}
          onChange={(e) => setSubdirs(e.target.checked)}
          className="rounded"
        />
        Subdirs
      </label>
      <button
        onClick={handleLoad}
        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium transition-colors"
      >
        Open
      </button>
      {datasetInfo && (
        <span className="text-xs text-zinc-400">
          {datasetInfo.total_items} items
        </span>
      )}
    </div>
  );
}
