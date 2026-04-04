"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { SearchReplacePreview } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";

export default function SearchReplace() {
  const [search, setSearch] = useState("");
  const [replace, setReplace] = useState("");
  const [preview, setPreview] = useState<SearchReplacePreview | null>(null);
  const queryClient = useQueryClient();

  const handlePreview = async () => {
    if (!search.trim()) return;
    const result = await api.searchReplacePreview(search, replace);
    setPreview(result);
  };

  const handleApply = async () => {
    if (!search.trim()) return;
    await api.searchReplaceApply(search, replace);
    setPreview(null);
    setSearch("");
    setReplace("");
    queryClient.invalidateQueries({ queryKey: ["tagCloud"] });
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Search & Replace</h3>
      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="flex-1 px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-xs text-white"
        />
        <input
          value={replace}
          onChange={(e) => setReplace(e.target.value)}
          placeholder="Replace with..."
          className="flex-1 px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-xs text-white"
        />
        <button onClick={handlePreview} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">
          Preview
        </button>
        <button onClick={handleApply} disabled={!preview} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs disabled:opacity-50">
          Apply
        </button>
      </div>

      {preview && (
        <div className="max-h-48 overflow-y-auto bg-zinc-900 rounded border border-zinc-700 p-2 text-xs">
          <p className="text-zinc-400 mb-1">{preview.total_matches} matches</p>
          {preview.matches.slice(0, 20).map((m) => (
            <div key={m.index} className="mb-1">
              <span className="text-zinc-500">{m.filename}:</span>{" "}
              <span className="text-red-400 line-through">{m.before.substring(0, 80)}</span>{" "}
              → <span className="text-green-400">{m.after.substring(0, 80)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
