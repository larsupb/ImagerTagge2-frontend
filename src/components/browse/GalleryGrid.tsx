"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Star, AlertTriangle } from "lucide-react";
import { api, getThumbnailUrl } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import { useProjectStore } from "@/stores/projectStore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { GalleryItem } from "@/lib/types";

function getIssues(item: GalleryItem): string[] {
  const issues: string[] = [];
  if (!item.has_caption) issues.push("No caption");
  if (item.width && item.height && item.width * item.height < 1_000_000) {
    issues.push(`Too small (${item.width}×${item.height}, <1 MP)`);
  }
  return issues;
}

export default function GalleryGrid() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const session = useSessionStore((s) =>
    activeProjectId ? s.getProjectSession(activeProjectId) : null
  );
  const router = useRouter();
  const [page, setPage] = useState(0);
  const pageSize = 60;

  const { data, isLoading } = useQuery({
    queryKey: ["gallery", page, session?.datasetInfo?.total_items],
    queryFn: () => api.getGallery(page, pageSize),
    enabled: !!session?.datasetInfo,
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const handleClick = (item: GalleryItem) => {
    if (activeProjectId) {
      useSessionStore.getState().setCurrentIndex(activeProjectId, item.index);
    }
    router.push("/edit");
  };

  if (!session?.datasetInfo) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-text-secondary">
          {data?.total ?? 0} images
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Prev
          </Button>
          <span className="text-sm text-text-secondary self-center">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {data?.items.map((item) => {
            const issues = getIssues(item);
            const hasIssues = issues.length > 0;
            const thumbnail = (
              <div
                key={item.index}
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
              <Tooltip key={item.index}>
                <TooltipTrigger>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleClick(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleClick(item);
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
          })}
        </div>
      )}
    </div>
  );
}
