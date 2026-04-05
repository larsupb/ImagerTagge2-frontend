"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface TagOperationsProps {
  selectedTags: string[];
}

export default function TagOperations({ selectedTags }: TagOperationsProps) {
  const [appendTag, setAppendTag] = useState("");
  const [prependTag, setPrependTag] = useState("");
  const [subdirName, setSubdirName] = useState("");
  const [inverse, setInverse] = useState(false);
  const queryClient = useQueryClient();

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["tagCloud"] });

  const handleRemove = async () => {
    if (selectedTags.length === 0) return;
    try {
      const result = await api.removeTags(selectedTags);
      toast.success(`Removed from ${(result as { modified: number }).modified} captions`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove tags");
    }
  };

  const handleCleanup = async () => {
    try {
      const result = await api.cleanupTags();
      toast.success(`Cleaned ${(result as { modified: number }).modified} captions`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cleanup tags");
    }
  };

  const handleReplaceUnderscores = async () => {
    try {
      const result = await api.replaceUnderscores();
      toast.success(`Updated ${(result as { modified: number }).modified} captions`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to replace underscores");
    }
  };

  const handleAppend = async () => {
    if (!appendTag.trim()) return;
    try {
      const result = await api.appendTag(appendTag.trim());
      toast.success(`Appended to ${(result as { modified: number }).modified} captions`);
      setAppendTag("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to append tag");
    }
  };

  const handlePrepend = async () => {
    if (!prependTag.trim()) return;
    try {
      const result = await api.prependTag(prependTag.trim());
      toast.success(`Prepended to ${(result as { modified: number }).modified} captions`);
      setPrependTag("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to prepend tag");
    }
  };

  const handleMoveToSubdir = async () => {
    if (selectedTags.length === 0 || !subdirName.trim()) return;
    try {
      const result = await api.moveToSubdir(selectedTags, inverse, subdirName.trim());
      toast.success(`Moved ${(result as { moved: number }).moved} images`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to move to subdirectory");
    }
  };

  const handleExport = async () => {
    try {
      const result = await api.exportJsonl();
      toast.success(`Exported ${result.count} captions to ${result.path}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to export");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-surface rounded-lg border border-border p-4">
        <h4 className="text-sm font-medium text-text mb-3">Batch Operations</h4>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRemove}
            disabled={selectedTags.length === 0}
          >
            Remove Selected Tags
          </Button>
          <Button variant="secondary" size="sm" onClick={handleCleanup}>
            Cleanup Tags
          </Button>
          <Button variant="outline" size="sm" onClick={handleReplaceUnderscores}>
            Replace Underscores
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            Export JSONL
          </Button>
        </div>
      </div>

      <div className="bg-surface rounded-lg border border-border p-4">
        <h4 className="text-sm font-medium text-text mb-3">Append Tag</h4>
        <div className="flex gap-2 items-center">
          <Input
            value={appendTag}
            onChange={(e) => setAppendTag(e.target.value)}
            placeholder="Tag to append..."
            className="flex-1 text-sm"
          />
          <Button variant="default" size="sm" onClick={handleAppend} disabled={!appendTag.trim()}>
            Append
          </Button>
        </div>
      </div>

      <div className="bg-surface rounded-lg border border-border p-4">
        <h4 className="text-sm font-medium text-text mb-3">Prepend Tag</h4>
        <div className="flex gap-2 items-center">
          <Input
            value={prependTag}
            onChange={(e) => setPrependTag(e.target.value)}
            placeholder="Tag to prepend..."
            className="flex-1 text-sm"
          />
          <Button variant="default" size="sm" onClick={handlePrepend} disabled={!prependTag.trim()}>
            Prepend
          </Button>
        </div>
      </div>

      <div className="bg-surface rounded-lg border border-border p-4">
        <h4 className="text-sm font-medium text-text mb-3">Move to Subdirectory</h4>
        <div className="flex gap-2 items-center">
          <Input
            value={subdirName}
            onChange={(e) => setSubdirName(e.target.value)}
            placeholder="Subdirectory name..."
            className="flex-1 text-sm"
          />
          <label className="flex items-center gap-1.5 text-sm text-text-secondary whitespace-nowrap">
            <Checkbox checked={inverse} onCheckedChange={(checked) => setInverse(!!checked)} />
            Inverse
          </label>
          <Button
            variant="default"
            size="sm"
            onClick={handleMoveToSubdir}
            disabled={selectedTags.length === 0 || !subdirName.trim()}
          >
            Move to Subdir
          </Button>
        </div>
        {selectedTags.length > 0 && (
          <p className="text-xs text-text-muted mt-2">
            Apply to {selectedTags.length} tags
          </p>
        )}
      </div>
    </div>
  );
}
