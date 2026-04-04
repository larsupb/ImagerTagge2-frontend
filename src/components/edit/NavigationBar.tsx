"use client";

import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";

interface NavigationBarProps {
  onNavigate: (index: number) => void;
}

export default function NavigationBar({ onNavigate }: NavigationBarProps) {
  const { currentIndex, currentItem, datasetInfo } = useSessionStore();
  const total = datasetInfo?.total_items ?? 0;

  const handleBookmark = async () => {
    await api.toggleBookmark(currentIndex);
    onNavigate(currentIndex);
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <button
        onClick={() => onNavigate(Math.max(0, currentIndex - 1))}
        disabled={currentIndex <= 0}
        className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-sm disabled:opacity-50"
      >
        ← Prev
      </button>

      <input
        type="range"
        min={0}
        max={Math.max(0, total - 1)}
        value={currentIndex}
        onChange={(e) => onNavigate(Number(e.target.value))}
        className="flex-1"
      />

      <span className="text-sm text-zinc-400 min-w-[80px] text-center">
        {currentIndex + 1} / {total}
      </span>

      <button
        onClick={() => onNavigate(Math.min(total - 1, currentIndex + 1))}
        disabled={currentIndex >= total - 1}
        className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-sm disabled:opacity-50"
      >
        Next →
      </button>

      <button
        onClick={handleBookmark}
        className={`px-3 py-1.5 rounded text-sm ${
          currentItem?.is_bookmarked
            ? "bg-yellow-600 hover:bg-yellow-700"
            : "bg-zinc-700 hover:bg-zinc-600"
        }`}
      >
        {currentItem?.is_bookmarked ? "★" : "☆"}
      </button>
    </div>
  );
}
