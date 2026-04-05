"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import { useProjectStore } from "@/stores/projectStore";
import type { TagCloudEntry } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TagCloudProps {
  onSelectedTagsChange: (tags: string[]) => void;
}

export default function TagCloud({ onSelectedTagsChange }: TagCloudProps) {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const session = activeProjectId
    ? useSessionStore((s) => s.getProjectSession(activeProjectId))
    : undefined;
  const [sortBy, setSortBy] = useState<"frequency" | "alpha">("frequency");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const { data: tags, isLoading, refetch } = useQuery({
    queryKey: ["tagCloud", sortBy, session?.datasetInfo?.total_items],
    queryFn: () => api.getTagCloud(sortBy),
    enabled: !!session?.datasetInfo,
  });

  const filteredTags = tags?.filter((t) =>
    t.tag.toLowerCase().includes(search.toLowerCase())
  );

  const toggleTag = (tag: string) => {
    const next = new Set(selected);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    setSelected(next);
    onSelectedTagsChange(Array.from(next));
  };

  const selectAll = () => {
    const all = new Set(filteredTags?.map((t) => t.tag) ?? []);
    setSelected(all);
    onSelectedTagsChange(Array.from(all));
  };

  const clearSelection = () => {
    setSelected(new Set());
    onSelectedTagsChange([]);
  };

  return (
    <div className="flex flex-col gap-3 bg-surface rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-sm font-medium text-text">Tag Cloud</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "frequency" | "alpha")}
          className="text-xs bg-surface border border-border rounded px-2 py-1 text-text"
        >
          <option value="frequency">By frequency</option>
          <option value="alpha">Alphabetical</option>
        </select>
        <Button variant="ghost" size="xs" onClick={selectAll}>
          Select all
        </Button>
        <Button variant="ghost" size="xs" onClick={clearSelection}>
          Clear
        </Button>
        <Button variant="ghost" size="xs" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter tags..."
        className="h-7 text-xs"
      />

      {isLoading ? (
        <div className="text-text-muted text-sm">Loading tags...</div>
      ) : (
        <ScrollArea className="h-64 rounded border border-border bg-surface-raised">
          <div className="flex flex-wrap gap-1 p-2">
            {filteredTags?.map((entry) => (
              <Badge
                key={entry.tag}
                variant={selected.has(entry.tag) ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                onClick={() => toggleTag(entry.tag)}
              >
                {entry.tag} ({entry.count})
              </Badge>
            ))}
            {filteredTags?.length === 0 && (
              <div className="text-text-muted text-sm p-2">No tags match filter</div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
