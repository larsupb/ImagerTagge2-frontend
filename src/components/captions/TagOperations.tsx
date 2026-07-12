"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface TagOperationsProps {
  captionType: string;
  selectedTags: string[];
}

export default function TagOperations({ captionType, selectedTags }: TagOperationsProps) {
  const [appendTag, setAppendTag] = useState("");
  const [prependTag, setPrependTag] = useState("");
  const [subdirName, setSubdirName] = useState("");
  const [inverse, setInverse] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const queryClient = useQueryClient();

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
  });
  const allCategories = categoriesData ?? [];
  const categoryOptions = [...allCategories, "Uncategorized"];
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const categoriesInited = useRef(false);

  useEffect(() => {
    if (categoriesData && !categoriesInited.current) {
      setSelectedCategories(new Set([...categoriesData, "Uncategorized"]));
      categoriesInited.current = true;
    }
  }, [categoriesData]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // undefined = apply to all images (backend default); otherwise the selected subset
  const categoriesArg = (): string[] | undefined =>
    selectedCategories.size === categoryOptions.length ? undefined : Array.from(selectedCategories);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["tagCloud"] });
  };

  const handleRemove = async () => {
    if (selectedTags.length === 0) return;
    try {
      const result = await api.removeTags(selectedTags, captionType);
      toast.success(`Removed from ${(result as { modified: number }).modified} captions`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove tags");
    }
  };

  const handleCleanup = async () => {
    try {
      const result = await api.cleanupTags(captionType);
      toast.success(`Cleaned ${(result as { modified: number }).modified} captions`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cleanup tags");
    }
  };

  const handleReplaceUnderscores = async () => {
    try {
      const result = await api.replaceUnderscores(captionType);
      toast.success(`Updated ${(result as { modified: number }).modified} captions`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to replace underscores");
    }
  };

  const handleAppend = async () => {
    if (!appendTag.trim()) return;
    try {
      const result = await api.appendTag(appendTag.trim(), captionType, categoriesArg());
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
      const result = await api.prependTag(prependTag.trim(), captionType, categoriesArg());
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
      const result = await api.moveToSubdir(selectedTags, inverse, subdirName.trim(), captionType);
      toast.success(`Moved ${(result as { moved: number }).moved} images`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to move to subdirectory");
    }
  };

  const handleRenameType = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === captionType) return;
    try {
      const result = await api.renameCaptionType(captionType, trimmed);
      toast.success(`Renamed "${captionType}" to "${trimmed}" across ${result.updated} captions`);
      setRenameValue("");
      queryClient.invalidateQueries({ queryKey: ["captionTypes"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to rename caption type");
    }
  };

  const handleDeleteType = async () => {
    if (deleteConfirm !== captionType) return;
    try {
      const result = await api.deleteCaptionType(captionType);
      toast.success(`Removed type "${captionType}" from ${result.deleted} captions`);
      setDeleteConfirm("");
      queryClient.invalidateQueries({ queryKey: ["captionTypes"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove caption type");
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

      <div className="bg-surface rounded-lg border border-border p-4 flex flex-col gap-4">
        <h4 className="text-sm font-medium text-text">Add Tags by Category</h4>

        <div>
          <p className="text-xs text-text-muted mb-2">
            Categories — limit Append/Prepend to these (all selected = all images)
          </p>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((cat) => (
              <label key={cat} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <Checkbox
                  checked={selectedCategories.has(cat)}
                  onCheckedChange={() => toggleCategory(cat)}
                />
                {cat}
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCategories(new Set(categoryOptions))}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCategories(new Set())}
            >
              Deselect All
            </Button>
          </div>
        </div>

        <div className="border-t border-border pt-4 flex flex-col gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Append Tag</label>
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

          <div>
            <label className="block text-xs text-text-muted mb-1">Prepend Tag</label>
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

      <div className="bg-surface rounded-lg border border-border p-4">
        <h4 className="text-sm font-medium text-text mb-4">Housekeeping</h4>

        <p className="text-xs text-text-muted mb-2">Rename type</p>
        <div className="flex gap-2 items-center mb-4">
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="New type name..."
            className="w-[200px] text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRenameType}
            disabled={!renameValue.trim() || renameValue.trim() === captionType}
          >
            Rename
          </Button>
        </div>

        <p className="text-xs text-text-muted mb-2">
          Delete type — type <span className="font-medium text-text">{captionType}</span> to confirm
        </p>
        <div className="flex gap-2 items-center">
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={captionType}
            className="w-[200px] text-sm"
          />
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteType}
            disabled={deleteConfirm !== captionType}
          >
            Delete Type
          </Button>
        </div>
      </div>
    </div>
  );
}
