"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import type { TagCloudEntry } from "@/lib/types";

interface TagCloudProps {
  onSelectedTagsChange: (tags: string[]) => void;
}

export default function TagCloud({ onSelectedTagsChange }: TagCloudProps) {
  const { datasetInfo } = useSessionStore();
  const [sortBy, setSortBy] = useState<"frequency" | "alpha">("frequency");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: tags, isLoading, refetch } = useQuery({
    queryKey: ["tagCloud", sortBy, datasetInfo?.total_items],
    queryFn: () => api.getTagCloud(sortBy),
    enabled: !!datasetInfo,
  });

  const toggleTag = (tag: string) => {
    const next = new Set(selected);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    setSelected(next);
    onSelectedTagsChange(Array.from(next));
  };

  const selectAll = () => {
    const all = new Set(tags?.map((t) => t.tag) ?? []);
    setSelected(all);
    onSelectedTagsChange(Array.from(all));
  };

  const clearSelection = () => {
    setSelected(new Set());
    onSelectedTagsChange([]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">Tag Cloud</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "frequency" | "alpha")}
          className="text-xs bg-zinc-800 border border-zinc-600 rounded px-2 py-1"
        >
          <option value="frequency">By frequency</option>
          <option value="alpha">Alphabetical</option>
        </select>
        <button onClick={selectAll} className="text-xs text-blue-400 hover:text-blue-300">Select all</button>
        <button onClick={clearSelection} className="text-xs text-zinc-400 hover:text-zinc-300">Clear</button>
        <button onClick={() => refetch()} className="text-xs text-zinc-400 hover:text-zinc-300">Refresh</button>
      </div>

      {isLoading ? (
        <div className="text-zinc-500 text-sm">Loading tags...</div>
      ) : (
        <div className="flex flex-wrap gap-1 max-h-64 overflow-y-auto p-2 bg-zinc-900 rounded border border-zinc-700">
          {tags?.map((entry) => (
            <button
              key={entry.tag}
              onClick={() => toggleTag(entry.tag)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                selected.has(entry.tag)
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {entry.tag} ({entry.count})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
