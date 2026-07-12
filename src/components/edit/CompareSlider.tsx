"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronsLeftRight } from "lucide-react";

interface CompareSliderProps {
  leftUrl: string;
  rightUrl: string;
  leftLabel?: string;
  rightLabel?: string;
}

export default function CompareSlider({
  leftUrl,
  rightUrl,
  leftLabel = "Version",
  rightLabel = "Current",
}: CompareSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [pos, setPos] = useState(50);
  const [leftDims, setLeftDims] = useState<string | null>(null);
  const [rightDims, setRightDims] = useState<string | null>(null);

  const dimsFrom = (img: HTMLImageElement) =>
    img.naturalWidth && img.naturalHeight
      ? `${img.naturalWidth}×${img.naturalHeight}`
      : null;

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-fit cursor-ew-resize touch-none select-none overflow-hidden rounded"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <img
        src={leftUrl}
        alt={leftLabel}
        draggable={false}
        onLoad={(e) => setLeftDims(dimsFrom(e.currentTarget))}
        className="pointer-events-none block max-h-[75vh] max-w-full object-contain"
      />
      <img
        src={rightUrl}
        alt={rightLabel}
        draggable={false}
        onLoad={(e) => setRightDims(dimsFrom(e.currentTarget))}
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
      />

      <div
        className="pointer-events-none absolute inset-y-0"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white/90 shadow-[0_0_4px_rgba(0,0,0,0.6)]" />
        <div className="absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow">
          <ChevronsLeftRight className="h-4 w-4" />
        </div>
      </div>

      <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        {leftLabel}
        {leftDims ? ` · ${leftDims}` : ""}
      </span>
      <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        {rightLabel}
        {rightDims ? ` · ${rightDims}` : ""}
      </span>
    </div>
  );
}
