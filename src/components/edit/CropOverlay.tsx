"use client";

import { useState } from "react";

interface CropOverlayProps {
  imageDisplayRect: { x: number; y: number; width: number; height: number };
  naturalWidth: number;
  naturalHeight: number;
  onCropComplete: (x: number, y: number, w: number, h: number) => void;
  onCropCancel: () => void;
}

type ResizeHandle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | null;

const ASPECTS = [
  { label: "1:1", ratio: 1 },
  { label: "3:2", ratio: 3 / 2 },
  { label: "2:3", ratio: 2 / 3 },
  { label: "5:4", ratio: 5 / 4 },
  { label: "4:5", ratio: 4 / 5 },
  { label: "Free", ratio: null },
];

export default function CropOverlay({
  imageDisplayRect,
  naturalWidth,
  naturalHeight,
  onCropComplete,
  onCropCancel,
}: CropOverlayProps) {
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [aspectPreset, setAspectPreset] = useState<string | null>(null);
  const [resizing, setResizing] = useState<ResizeHandle>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; rect: { x: number; y: number; width: number; height: number } } | null>(null);
  const [moving, setMoving] = useState(false);
  const [moveStart, setMoveStart] = useState<{ x: number; y: number; rect: { x: number; y: number; width: number; height: number } } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "BUTTON" || target.closest("button")) return;
    const overlayRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - overlayRect.left;
    const y = e.clientY - overlayRect.top;

    if (cropRect && !resizing) {
      const inRect =
        x >= cropRect.x && x <= cropRect.x + cropRect.width &&
        y >= cropRect.y && y <= cropRect.y + cropRect.height;
      if (inRect) {
        setMoveStart({ x, y, rect: { ...cropRect } });
        setMoving(true);
        setIsDrawing(false);
        return;
      }
    }

    setDragStart({ x, y });
    setIsDrawing(true);
    setCropRect(null);
    setResizing(null);
    setMoving(false);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    if (!cropRect || !handle) return;
    const overlayRect = (e.currentTarget as HTMLElement).closest("[data-crop-overlay]")?.getBoundingClientRect();
    if (!overlayRect) return;
    setResizeStart({ x: e.clientX - overlayRect.left, y: e.clientY - overlayRect.top, rect: { ...cropRect } });
    setResizing(handle);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const overlayRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = Math.max(0, Math.min(e.clientX - overlayRect.left, overlayRect.width));
    const mouseY = Math.max(0, Math.min(e.clientY - overlayRect.top, overlayRect.height));

    if (moving && moveStart && cropRect) {
      const dx = mouseX - moveStart.x;
      const dy = mouseY - moveStart.y;
      const s = moveStart.rect;
      setCropRect({
        ...cropRect,
        x: Math.max(0, Math.min(s.x + dx, overlayRect.width - s.width)),
        y: Math.max(0, Math.min(s.y + dy, overlayRect.height - s.height)),
      });
      return;
    }

    if (resizing && resizeStart) {
      const dx = mouseX - resizeStart.x;
      const dy = mouseY - resizeStart.y;
      const s = resizeStart.rect;
      const newRect = { ...s };

      if (resizing.includes("e")) newRect.width = Math.max(20, s.width + dx);
      if (resizing.includes("w")) { newRect.width = Math.max(20, s.width - dx); newRect.x = s.x + (s.width - newRect.width); }
      if (resizing.includes("s")) newRect.height = Math.max(20, s.height + dy);
      if (resizing.includes("n")) { newRect.height = Math.max(20, s.height - dy); newRect.y = s.y + (s.height - newRect.height); }

      if (aspectPreset) {
        const preset = ASPECTS.find((a) => a.label === aspectPreset);
        if (preset?.ratio) {
          if (resizing === "e" || resizing === "w") newRect.height = newRect.width / preset.ratio;
          else if (resizing === "n" || resizing === "s") newRect.width = newRect.height * preset.ratio;
        }
      }

      setCropRect(newRect);
      return;
    }

    if (!isDrawing || !dragStart) return;

    let width = mouseX - dragStart.x;
    let height = mouseY - dragStart.y;

    if (aspectPreset) {
      const preset = ASPECTS.find((a) => a.label === aspectPreset);
      if (preset?.ratio) {
        if (Math.abs(width) > Math.abs(height)) height = width / preset.ratio;
        else width = height * preset.ratio;
      }
    }

    if (width < 0) setCropRect({ x: mouseX, y: dragStart.y, width: -width, height });
    else if (height < 0) setCropRect({ x: dragStart.x, y: mouseY, width, height: -height });
    else setCropRect({ x: dragStart.x, y: dragStart.y, width, height });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setDragStart(null);
    setResizing(null);
    setResizeStart(null);
    setMoving(false);
    setMoveStart(null);
  };

  const handleAccept = () => {
    if (!cropRect) return;
    const { x: offsetX, y: offsetY, width: displayedWidth, height: displayedHeight } = imageDisplayRect;
    const scaleX = naturalWidth / displayedWidth;
    const scaleY = naturalHeight / displayedHeight;
    const crop = {
      x: Math.max(0, Math.round((cropRect.x - offsetX) * scaleX)),
      y: Math.max(0, Math.round((cropRect.y - offsetY) * scaleY)),
      width: Math.round(cropRect.width * scaleX),
      height: Math.round(cropRect.height * scaleY),
    };
    if (crop.width > 10 && crop.height > 10) {
      onCropComplete(crop.x, crop.y, crop.width, crop.height);
      setCropRect(null);
    }
  };

  return (
    <div
      data-crop-overlay
      className="absolute inset-0 cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1 bg-black/70 rounded p-1 z-10">
        {ASPECTS.map((a) => (
          <button
            key={a.label}
            className={`px-2 py-1 text-xs rounded ${
              aspectPreset === a.label ? "bg-blue-500 text-white" : "text-white hover:bg-white/20"
            }`}
            onClick={(e) => { e.stopPropagation(); setAspectPreset(a.label); }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {cropRect && (
        <div
          className="absolute border-2 border-green-500 bg-green-500/20 cursor-move"
          style={{ left: cropRect.x, top: cropRect.y, width: cropRect.width, height: cropRect.height }}
        >
          {(["nw", "ne", "sw", "se"] as const).map((h) => (
            <div
              key={h}
              className={`absolute w-3 h-3 bg-green-500 hover:bg-green-400 ${
                h === "nw" ? "-top-1 -left-1 cursor-nw-resize" :
                h === "ne" ? "-top-1 -right-1 cursor-ne-resize" :
                h === "sw" ? "-bottom-1 -left-1 cursor-sw-resize" :
                             "-bottom-1 -right-1 cursor-se-resize"
              }`}
              onMouseDown={(e) => handleResizeMouseDown(e, h)}
            />
          ))}
          <div className="absolute top-0 -left-2 w-2 h-full bg-green-500 cursor-w-resize hover:bg-green-400" onMouseDown={(e) => handleResizeMouseDown(e, "w")} />
          <div className="absolute top-0 -right-2 w-2 h-full bg-green-500 cursor-e-resize hover:bg-green-400" onMouseDown={(e) => handleResizeMouseDown(e, "e")} />
          <div className="absolute left-0 -top-2 w-full h-2 bg-green-500 cursor-n-resize hover:bg-green-400" onMouseDown={(e) => handleResizeMouseDown(e, "n")} />
          <div className="absolute left-0 -bottom-2 w-full h-2 bg-green-500 cursor-s-resize hover:bg-green-400" onMouseDown={(e) => handleResizeMouseDown(e, "s")} />
        </div>
      )}

      {cropRect && cropRect.width > 5 && cropRect.height > 5 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          <button
            className="px-3 py-1.5 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600"
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleAccept(); }}
          >
            Accept
          </button>
          <button
            className="px-3 py-1.5 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600"
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onCropCancel(); setCropRect(null); }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
