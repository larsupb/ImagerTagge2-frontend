"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, AlertTriangle } from "lucide-react";
import { api, getThumbnailUrl } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import { useProjectStore } from "@/stores/projectStore";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { GalleryItem } from "@/lib/types";

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
  onClick,
}: {
  item: GalleryItem;
  onClick: (item: GalleryItem) => void;
}) {
  const issues = getIssues(item);
  const hasIssues = issues.length > 0;

  const thumbnail = (
    <div
      className={`group relative aspect-square rounded-lg border overflow-hidden hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 bg-surface-raised ${
        hasIssues ? "border-danger" : "border-border"
      }`}
    >
      <img
        src={getThumbnailUrl(item.index)}
        alt={item.filename}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {item.is_bookmarked && (
        <span className="absolute top-1.5 right-1.5 text-yellow-400">
          <Star className="w-3.5 h-3.5 fill-current" />
        </span>
      )}
      {hasIssues && (
        <span className="absolute top-1.5 left-1.5 text-danger">
          <AlertTriangle className="w-3.5 h-3.5" />
        </span>
      )}
      <div className="absolute bottom-0 inset-x-0 bg-black/60 px-2 py-1 text-[10px] text-zinc-300 truncate opacity-0 group-hover:opacity-100 transition-opacity">
        {item.filename}
      </div>
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onClick(item)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onClick(item);
          }}
          className="cursor-pointer"
        >
          {thumbnail}
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
  onItemClick,
}: {
  name: string | null;
  items: GalleryItem[];
  showHeader: boolean;
  onItemClick: (item: GalleryItem) => void;
}) {
  return (
    <div>
      {showHeader && (
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold text-text">
            {name ?? "Uncategorized"}
          </h2>
          <span className="text-xs text-text-secondary">{items.length}</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
        {items.map((item) => (
          <GalleryThumbnail key={item.index} item={item} onClick={onItemClick} />
        ))}
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleClick = (item: GalleryItem) => {
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
        <span className="text-sm text-text-secondary">{total} images</span>
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
              onItemClick={handleClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
