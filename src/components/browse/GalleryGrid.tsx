"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, AlertTriangle, Pencil, Plus, Tag, ChevronRight, Upload, Trash2 } from "lucide-react";
import { api, getThumbnailUrl, getMediaUrl } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import { useProjectStore } from "@/stores/projectStore";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
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
import type { GalleryItem, GalleryResponse } from "@/lib/types";

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
  thumbVersion,
  onToggleSelect,
  onPreview,
  onEdit,
  onDelete,
}: {
  item: GalleryItem;
  isSelected: boolean;
  thumbVersion: number;
  onToggleSelect: (index: number, shiftKey: boolean) => void;
  onPreview: (item: GalleryItem, x: number, y: number) => void;
  onEdit: (item: GalleryItem) => void;
  onDelete: (item: GalleryItem) => void;
}) {
  const issues = getIssues(item);
  const hasIssues = issues.length > 0;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(item);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/gallery-item", String(item.index));
  };

  return (
    <Tooltip>
      <TooltipTrigger>
        <div
          role="button"
          tabIndex={0}
          draggable
          onDragStart={handleDragStart}
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey) {
              onToggleSelect(item.index, e.shiftKey);
            } else {
              onPreview(item, e.clientX, e.clientY);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onToggleSelect(item.index, false);
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
            src={`${getThumbnailUrl(item.index)}${thumbVersion > 0 ? `&v=${thumbVersion}` : ""}`}
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
            <span className="absolute top-1.5 right-1.5 text-yellow-400 group-hover:opacity-0 transition-opacity pointer-events-none">
              <Star className="w-3.5 h-3.5 fill-current" />
            </span>
          )}

          <div
            role="button"
            aria-label="Delete"
            className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 text-white/70 hover:text-danger hover:bg-black/40"
            onClick={handleDeleteClick}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleDeleteClick(e as unknown as React.MouseEvent); }}
            tabIndex={0}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </div>

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
  collapsed,
  onToggleCollapse,
  selectedIndices,
  thumbVersion,
  onToggleSelect,
  onPreview,
  onEdit,
  onDelete,
  onCategoryDrop,
}: {
  name: string | null;
  items: GalleryItem[];
  showHeader: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  selectedIndices: Set<number>;
  thumbVersion: number;
  onToggleSelect: (index: number, shiftKey: boolean) => void;
  onPreview: (item: GalleryItem, x: number, y: number) => void;
  onEdit: (item: GalleryItem) => void;
  onDelete: (item: GalleryItem) => void;
  onCategoryDrop: (index: number, category: string | null) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("application/gallery-item")) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("application/gallery-item")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const indexStr = e.dataTransfer.getData("application/gallery-item");
    if (!indexStr) return;
    onCategoryDrop(Number(indexStr), name);
  };

  return (
    <div
      onDragEnter={showHeader ? handleDragEnter : undefined}
      onDragOver={showHeader ? handleDragOver : undefined}
      onDragLeave={showHeader ? handleDragLeave : undefined}
      onDrop={showHeader ? handleDrop : undefined}
      className={`rounded-lg p-1 -m-1 transition-colors duration-150 ${
        isDragOver ? "bg-blue-500/10 ring-2 ring-blue-500/60 ring-inset" : ""
      }`}
    >
      {showHeader && (
        <button
          className="flex items-center gap-2 mb-3 w-full text-left group/header"
          onClick={onToggleCollapse}
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
              thumbVersion={thumbVersion}
              onToggleSelect={onToggleSelect}
              onPreview={onPreview}
              onEdit={onEdit}
              onDelete={onDelete}
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

function UploadZone() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const session = useSessionStore((s) =>
    activeProjectId ? s.getProjectSession(activeProjectId) : null
  );
  const queryClient = useQueryClient();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: File[]) => {
    const media = files.filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (media.length === 0) {
      toast.warning("No supported image files found");
      return;
    }
    setIsUploading(true);
    try {
      const result = await api.uploadImages(media);
      if (result.added.length === 0) {
        toast.warning("No new image files were added");
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
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    await upload(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      upload(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isUploading && fileInputRef.current?.click()}
      className={`border border-dashed rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 text-sm transition-colors ${
        isDragOver
          ? "border-blue-500 bg-blue-500/10 text-blue-400 cursor-copy"
          : isUploading
          ? "border-border text-text-muted cursor-not-allowed"
          : "border-border text-text-muted hover:border-border-subtle hover:text-text-secondary cursor-pointer"
      }`}
    >
      <Upload className="w-3.5 h-3.5 shrink-0" />
      {isUploading ? "Uploading..." : isDragOver ? "Drop to upload" : "Drop images here or click to upload"}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileInput}
      />
    </div>
  );
}

function ImagePreview({
  item,
  x,
  y,
  onClose,
}: {
  item: GalleryItem;
  x: number;
  y: number;
  onClose: () => void;
}) {
  const PAD = 16;
  const MAX = 800;
  let left = x + PAD;
  let top = y + PAD;
  if (left + MAX > window.innerWidth) left = x - MAX - PAD;
  if (top + MAX > window.innerHeight) top = y - MAX - PAD;
  left = Math.max(PAD, left);
  top = Math.max(PAD, top);

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute rounded-lg overflow-hidden shadow-2xl border border-border bg-surface"
        style={{ left, top, maxWidth: MAX, maxHeight: MAX }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={getMediaUrl(item.index)}
          alt={item.filename}
          style={{ maxWidth: MAX, maxHeight: MAX, display: "block" }}
        />
      </div>
    </div>
  );
}

export default function GalleryGrid() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const session = useSessionStore((s) =>
    activeProjectId ? s.getProjectSession(activeProjectId) : null
  );
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [pendingDeleteItem, setPendingDeleteItem] = useState<GalleryItem | null>(null);
  const [thumbVersion, setThumbVersion] = useState(0);
  const [previewState, setPreviewState] = useState<{ item: GalleryItem; x: number; y: number } | null>(null);
  const lastSelectedRef = useRef<number | null>(null);

  const total = session?.datasetInfo?.total_items ?? 0;

  const { data, isLoading } = useQuery({
    queryKey: ["gallery", "all", total],
    queryFn: () => api.getGallery(0, total),
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

  const flatItems = useMemo(
    () => grouped.flatMap(([, items]) => items),
    [grouped]
  );

  const toggleSelect = useCallback((index: number, shiftKey: boolean) => {
    if (shiftKey && lastSelectedRef.current !== null) {
      const anchorPos = flatItems.findIndex((i) => i.index === lastSelectedRef.current);
      const currentPos = flatItems.findIndex((i) => i.index === index);
      if (anchorPos !== -1 && currentPos !== -1) {
        const [start, end] = anchorPos < currentPos ? [anchorPos, currentPos] : [currentPos, anchorPos];
        const rangeIndices = flatItems.slice(start, end + 1).map((i) => i.index);
        setSelectedIndices((prev) => {
          const next = new Set(prev);
          for (const idx of rangeIndices) next.add(idx);
          return next;
        });
        return;
      }
    }
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    lastSelectedRef.current = index;
  }, [flatItems]);

  const clearSelection = useCallback(() => {
    setSelectedIndices(new Set());
    lastSelectedRef.current = null;
  }, []);

  const handlePreview = useCallback((item: GalleryItem, x: number, y: number) => {
    setPreviewState({ item, x, y });
  }, []);

  const closePreview = useCallback(() => {
    setPreviewState(null);
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIndices((prev) =>
      prev.size === allIndices.length ? new Set() : new Set(allIndices)
    );
  }, [allIndices]);

  const handleEdit = (item: GalleryItem) => {
    if (activeProjectId) {
      useSessionStore.getState().setCurrentIndex(activeProjectId, item.index);
      useSessionStore.getState().setCurrentItem(activeProjectId, null);
    }
    router.push("/edit");
  };

  const handleDelete = useCallback(async () => {
    if (!pendingDeleteItem) return;
    const item = pendingDeleteItem;
    setPendingDeleteItem(null);
    try {
      const result = await api.deleteItem(item.index);

      queryClient.setQueryData<GalleryResponse>(["gallery", "all"], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items
            .filter((i) => i.index !== item.index)
            .map((i) => (i.index > item.index ? { ...i, index: i.index - 1 } : i)),
          total: result.total_items,
          page_size: result.total_items,
        };
      });

      setThumbVersion((v) => v + 1);
      queryClient.invalidateQueries({ queryKey: ["gallery"] });

      if (activeProjectId && session?.datasetInfo) {
        useSessionStore.getState().setDatasetInfo(activeProjectId, {
          ...session.datasetInfo,
          total_items: result.total_items,
        });
      }

      setSelectedIndices((prev) => {
        const next = new Set(prev);
        next.delete(item.index);
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }, [pendingDeleteItem, activeProjectId, session, queryClient]);

  const collapsedCategories = session?.collapsedCategories ?? new Set<string>();

  const handleToggleCollapse = useCallback(
    (categoryKey: string) => {
      if (activeProjectId) {
        useSessionStore.getState().toggleCategoryCollapsed(activeProjectId, categoryKey);
      }
    },
    [activeProjectId]
  );

  const handleCategoryDrop = useCallback(
    async (index: number, category: string | null) => {
      const item = data?.items.find((i) => i.index === index);
      if (item?.category === category) return;
      try {
        await api.setCategory(index, category);
        queryClient.invalidateQueries({ queryKey: ["gallery"] });
        toast.success(
          category ? `Moved to "${category}"` : "Moved to uncategorized"
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to move image");
      }
    },
    [data?.items, queryClient]
  );

  if (!session?.datasetInfo) {
    return null;
  }

  const selectionCount = selectedIndices.size;
  const allSelected = allIndices.length > 0 && selectionCount === allIndices.length;

  return (
    <div className="flex flex-col gap-4">
      <UploadZone />

      <div className="flex items-center justify-between">
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
          {grouped.map(([category, items]) => {
            const categoryKey = category ?? "__uncategorized__";
            return (
              <CategorySection
                key={categoryKey}
                name={category}
                items={items}
                showHeader={hasCategories}
                collapsed={hasCategories && collapsedCategories.has(categoryKey)}
                onToggleCollapse={() => handleToggleCollapse(categoryKey)}
                selectedIndices={selectedIndices}
                thumbVersion={thumbVersion}
                onToggleSelect={toggleSelect}
                onPreview={handlePreview}
                onEdit={handleEdit}
                onDelete={setPendingDeleteItem}
                onCategoryDrop={handleCategoryDrop}
              />
            );
          })}
        </div>
      )}

      {previewState && (
        <ImagePreview
          item={previewState.item}
          x={previewState.x}
          y={previewState.y}
          onClose={closePreview}
        />
      )}

      <ConfirmDialog
        open={!!pendingDeleteItem}
        title="Delete Image"
        message={`Delete ${pendingDeleteItem?.filename}? This also removes its caption and mask.`}
        onConfirm={handleDelete}
        onCancel={() => setPendingDeleteItem(null)}
      />
    </div>
  );
}
