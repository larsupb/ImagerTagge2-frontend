"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { SearchReplacePreview } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SearchReplace() {
  const [search, setSearch] = useState("");
  const [replace, setReplace] = useState("");
  const [preview, setPreview] = useState<SearchReplacePreview | null>(null);
  const queryClient = useQueryClient();

  const handlePreview = async () => {
    if (!search.trim()) return;
    try {
      const result = await api.searchReplacePreview(search, replace);
      setPreview(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to preview search & replace");
    }
  };

  const handleApply = async () => {
    if (!search.trim()) return;
    try {
      await api.searchReplaceApply(search, replace);
      toast.success("Search & replace applied successfully");
      setPreview(null);
      setSearch("");
      setReplace("");
      queryClient.invalidateQueries({ queryKey: ["tagCloud"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to apply search & replace");
    }
  };

  return (
    <div className="bg-surface rounded-lg border border-border p-4 flex flex-col gap-3">
      <h3 className="text-sm font-medium text-text">Search & Replace</h3>
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="flex-1 text-sm"
        />
        <Input
          value={replace}
          onChange={(e) => setReplace(e.target.value)}
          placeholder="Replace with..."
          className="flex-1 text-sm"
        />
        <Button variant="outline" size="sm" onClick={handlePreview} disabled={!search.trim()}>
          Preview
        </Button>
        <Button variant="default" size="sm" onClick={handleApply} disabled={!preview}>
          Apply
        </Button>
      </div>

      {preview && (
        <ScrollArea className="h-48 rounded border border-border bg-surface-raised">
          <div className="p-3">
            <p className="text-text-muted text-xs mb-2">{preview.total_matches} matches</p>
            {preview.matches.slice(0, 20).map((m) => (
              <div key={m.index} className="mb-2 text-xs">
                <span className="text-text-muted">{m.filename}: </span>
                <span className="text-danger line-through">{m.before.substring(0, 80)}</span>
                {" → "}
                <span className="text-success">{m.after.substring(0, 80)}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
