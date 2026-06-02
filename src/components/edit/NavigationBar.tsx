"use client";

import { ChevronLeft, ChevronRight, Bookmark } from "lucide-react";
import { api } from "@/lib/api";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/session";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavigationBarProps {
  onNavigate: (index: number) => void;
  navItems: { index: number }[];
}

export default function NavigationBar({ onNavigate, navItems }: NavigationBarProps) {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const session = activeProjectId
    ? useSessionStore((s) => s.getProjectSession(activeProjectId))
    : null;
  const currentIndex = session?.currentIndex ?? 0;
  const currentItem = session?.currentItem;

  const positionInNav = navItems.findIndex((i) => i.index === currentIndex);
  const safePosition = Math.max(0, positionInNav);
  const total = navItems.length;

  const handleBookmark = async () => {
    await api.toggleBookmark(currentIndex);
    onNavigate(currentIndex);
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          const prev = navItems[positionInNav - 1];
          if (prev) onNavigate(prev.index);
        }}
        disabled={positionInNav <= 0}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <input
        type="range"
        min={0}
        max={Math.max(0, total - 1)}
        value={safePosition}
        onChange={(e) => {
          const item = navItems[Number(e.target.value)];
          if (item) onNavigate(item.index);
        }}
        className="flex-1 accent-bg-primary"
        style={{ accentColor: "var(--color-primary, #3b82f6)" }}
      />

      <span className="text-sm text-text-muted min-w-[80px] text-center">
        {safePosition + 1} / {total}
      </span>

      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          const next = navItems[positionInNav + 1];
          if (next) onNavigate(next.index);
        }}
        disabled={positionInNav >= total - 1}
      >
        <ChevronRight className="size-4" />
      </Button>

      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 size-8 shrink-0 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          onClick={handleBookmark}
        >
          <Bookmark className={`size-4 ${currentItem?.is_bookmarked ? "fill-current" : ""}`} />
        </TooltipTrigger>
        <TooltipContent>{currentItem?.is_bookmarked ? "Remove bookmark" : "Add bookmark"}</TooltipContent>
      </Tooltip>
    </div>
  );
}
