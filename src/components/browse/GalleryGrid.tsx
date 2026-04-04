"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, getThumbnailUrl } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import type { GalleryItem } from "@/lib/types";

export default function GalleryGrid() {
  const { datasetInfo } = useSessionStore();
  const router = useRouter();
  const [page, setPage] = useState(0);
  const pageSize = 60;

  const { data, isLoading } = useQuery({
    queryKey: ["gallery", page, datasetInfo?.total_items],
    queryFn: () => api.getGallery(page, pageSize),
    enabled: !!datasetInfo,
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const handleClick = (item: GalleryItem) => {
    useSessionStore.getState().setCurrentIndex(item.index);
    router.push("/edit");
  };

  if (!datasetInfo) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        Load a dataset to browse images
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-zinc-400">
          {data?.total ?? 0} images
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-sm bg-zinc-800 rounded disabled:opacity-50 hover:bg-zinc-700"
          >
            Prev
          </button>
          <span className="text-sm text-zinc-400 self-center">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 text-sm bg-zinc-800 rounded disabled:opacity-50 hover:bg-zinc-700"
          >
            Next
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-zinc-500 py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
          {data?.items.map((item) => (
            <button
              key={item.index}
              onClick={() => handleClick(item)}
              className="group relative aspect-square bg-zinc-800 rounded overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
            >
              <img
                src={getThumbnailUrl(item.index)}
                alt={item.filename}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {item.is_bookmarked && (
                <span className="absolute top-1 right-1 text-yellow-400 text-xs">★</span>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5 text-[10px] text-zinc-300 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {item.filename}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
