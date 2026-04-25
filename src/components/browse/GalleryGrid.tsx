"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, AlertTriangle, Pencil, Plus, Tag, ChevronRight } from "lucide-react";
import { api, getThumbnailUrl } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import { useProjectStore } from "@/stores/projectStore";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { GalleryItem } from "@/lib/types";

const NONE = "__none__";
const NEW = "__new__";

function getIssues(item: GalleryItem): string[] {
  const issues: string[] = [];
  if (!item.has_caption) issues.push("No caption");
  if (item.width && item.height && item.width * item.height < 1_000_000) {
    issues.push(`Too small (${item.width}×${item.height}, <1 MP)`);
  }
  return issues;
}

function GalleryThumbnail({
  item,
  isSelected,
  onToggleSelect,
  onEdit,
}: {
  item: GalleryItem;
  isSelected: boolean;
  onToggleSelect: (index: number) => void;
  onEdit: (item: GalleryItem) => void;
}) {
  const issues = getIssues(item);
  const hasIssues = issues.length > 0;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(item);
  };

  return (
    <Tooltip>
      <TooltipTrigger>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onToggleSelect(item.index)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onToggleSelect(item.index);
          }}
          className={`group relative aspect-square rounded-lg overflow-hidden hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 bg-surface-raised cursor-pointer select-none ${
            isSelected
              ? "ring-3 ring-blue-500 border-2 border-blue-500"
              : hasIssues
              ? "border border-danger"
              : "border border-border"
          }`}
        >
          <img
            src={getThumbnailUrl(item.index)}
            alt={item.filename}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {isSelected && (
            <div className="absolute inset-0 bg-blue-500/40 pointer-events-none" />
          )}

          {hasIssues && (
            <span className="absolute top-1.5 left-1.5 text-danger">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          )}
          {item.is_bookmarked && (
            <span className="absolute top-1.5 right-1.5 text-yellow-400">
              <Star className="w-3.5 h-3.5 fill-current" />
            </span>
          )}

          <div
            className="absolute bottom-0 inset-x-0 bg-black/70 px-2 py-1.5 flex items-center justify-center gap-1.5 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={handleEditClick}
          >
            <Pencil className="w-3 h-3" />
            Edit
          </div>
        </div>
      </TooltipTrigger>
      {hasIssues && (
        <TooltipContent>
          <ul className="text-xs">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </TooltipContent>
      )}
    </Tooltip>
  );
}

function CategorySection({
  name,
  items,
  showHeader,
  selectedIndices,
  onToggleSelect,
  onEdit,
}: {
  name: string | null;
  items: GalleryItem[];
  showHeader: boolean;
  selectedIndices: Set<number>;
  onToggleSelect: (index: number) => void;
  onEdit: (item: GalleryItem) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      {showHeader && (
        <button
          className="flex items-center gap-2 mb-3 w-full text-left group/header"
          onClick={() => setCollapsed((c) => !c)}
        >
          <ChevronRight
            className={`w-3.5 h-3.5 text-text-secondary transition-transform duration-150 ${
              collapsed ? "" : "rotate-90"
            }`}
          />
          <h2 className="text-sm font-semibold text-text group-hover/header:text-text-secondary transition-colors">
            {name ?? "Uncategorized"}
          </h2>
          <span className="text-xs text-text-secondary">{items.length}</span>
          <div className="flex-1 h-px bg-border" />
        </button>
      )}
      {!collapsed && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {items.map((item) => (
            <GalleryThumbnail
              key={item.index}
              item={item}
              isSelected={selectedIndices.has(item.index)}
              onToggleSelect={onToggleSelect}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BatchCategoryAssign({
  selectedIndices,
  onDone,
}: {
  selectedIndices: Set<number>;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [newInput, setNewInput] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
  });

  const assign = async (category: string | null) => {
    try {
      const indices = Array.from(selectedIndices);
      await api.setBulkCategory(indices, category);
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(
        category
          ? `Assigned ${indices.length} image${indices.length > 1 ? "s" : ""} to "${category}"`
          : `Removed category from ${indices.length} image${indices.length > 1 ? "s" : ""}`
      );
      setPopoverOpen(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign category");
    }
  };

  const handleSelect = (value: string | null) => {
    if (!value) return;
    if (value === NEW) {
      setNewInput("");
      setNewOpen(true);
      return;
    }
    assign(value === NONE ? null : value);
  };

  const handleCreate = async () => {
    const name = newInput.trim();
    if (!name) return;
    setNewOpen(false);
    setNewInput("");
    await assign(name);
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Tag className="w-3.5 h-3.5" />
          Assign category
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        {newOpen ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-text-secondary px-1">New category name</p>
            <Input
              placeholder="Category name..."
              value={newInput}
              onChange={(e) => setNewInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} className="flex-1">
                Create & assign
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setNewOpen(false)}>
                Back
              </Button>
            </div>
          </div>
        ) : (
          <Select onValueChange={handleSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>
                <span className="text-text-muted">No category</span>
              </SelectItem>
              {categories.length > 0 && <SelectSeparator />}
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value={NEW}>
                <div className="flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  New category...
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function GalleryGrid() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const session = useSessionStore((s) =>
    activeProjectId ? s.getProjectSession(activeProjectId) : null
  );
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const dragCounter = useRef(0);

  const total = session?.datasetInfo?.total_items ?? 0;

  const { data, isLoading } = useQuery({
    queryKey: ["gallery", "all", total],
    queryFn: () => api.getGallery(0, total || 1),
    enabled: !!session?.datasetInfo && total > 0,
  });

  const grouped = useMemo<[string | null, GalleryItem[]][]>(() => {
    if (!data?.items) return [];
    const map = new Map<string | null, GalleryItem[]>();
    for (const item of data.items) {
      const key = item.category ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === null && b !== null) return 1;
      if (b === null && a !== null) return -1;
      if (a === null || b === null) return 0;
      return a.localeCompare(b);
    });
  }, [data?.items]);

  const hasCategories = grouped.some(([cat]) => cat !== null);

  const allIndices = useMemo(
    () => data?.items.map((i) => i.index) ?? [],
    [data?.items]
  );

  const toggleSelect = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIndices(new Set());
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIndices((prev) =>
      prev.size === allIndices.length ? new Set() : new Set(allIndices)
    );
  }, [allIndices]);

  const handleEdit = (item: GalleryItem) => {
    if (activeProjectId) {
      useSessionStore.getState().setCurrentIndex(activeProjectId, item.index);
    }
    router.push("/edit");
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
      );
      if (files.length === 0) return;

      setIsUploading(true);
      try {
        const result = await api.uploadImages(files);
        if (result.added.length === 0) {
          toast.warning("No supported image files were found in the drop");
          return;
        }
        if (activeProjectId) {
          useSessionStore.getState().setDatasetInfo(activeProjectId, {
            ...session!.datasetInfo!,
            total_items: result.total_items,
          });
        }
        await queryClient.invalidateQueries({ queryKey: ["gallery"] });
        toast.success(
          `Added ${result.added.length} image${result.added.length > 1 ? "s" : ""}`
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [activeProjectId, session, queryClient]
  );

  if (!session?.datasetInfo) {
    return null;
  }

  const selectionCount = selectedIndices.size;
  const allSelected = allIndices.length > 0 && selectionCount === allIndices.length;

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative"
    >
      {(isDragOver || isUploading) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10 backdrop-blur-sm pointer-events-none">
          <p className="text-primary font-medium text-lg">
            {isUploading ? "Uploading..." : "Drop images to add to dataset"}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">{total} images</span>
          {selectionCount > 0 && (
            <>
              <span className="text-text-muted text-sm">·</span>
              <span className="text-sm font-medium">{selectionCount} selected</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={clearSelection}
              >
                Deselect all
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectionCount > 0 && (
            <BatchCategoryAssign
              selectedIndices={selectedIndices}
              onDone={clearSelection}
            />
          )}
          {total > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={toggleSelectAll}
            >
              {allSelected ? "Deselect all" : "Select all"}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-3 w-3/4 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.map(([category, items]) => (
            <CategorySection
              key={category ?? "__uncategorized__"}
              name={category}
              items={items}
              showHeader={hasCategories}
              selectedIndices={selectedIndices}
              onToggleSelect={toggleSelect}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
