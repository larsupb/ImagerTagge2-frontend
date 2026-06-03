"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";

interface ImageViewerProps {
  mediaUrl: string;
  maskUrl?: string | null;
  filename: string;
  showMask?: boolean;
  processing?: string | null;
  cropMode?: boolean;
  onCropComplete?: (x: number, y: number, width: number, height: number) => void;
  onCropCancel?: () => void;
  paintMode?: boolean;
  paintTool?: "pencil" | "quad" | "eraser";
  paintSize?: number;
  paintColor?: string;
  paintCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

type ResizeHandle =
  | "nw" | "ne" | "sw" | "se"
  | "n" | "s" | "e" | "w"
  | null;

export default function ImageViewer({
  mediaUrl,
  maskUrl,
  filename,
  showMask,
  processing,
  cropMode,
  onCropComplete,
  onCropCancel,
  paintMode,
  paintTool,
  paintSize,
  paintColor,
  paintCanvasRef,
}: ImageViewerProps) {
  const [cropRect, setCropRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [aspectPreset, setAspectPreset] = useState<string | null>(null);
  const [resizing, setResizing] = useState<ResizeHandle>(null);
  const [resizeStart, setResizeStart] = useState<{
    x: number;
    y: number;
    rect: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const [moving, setMoving] = useState(false);
  const [moveStart, setMoveStart] = useState<{
    x: number;
    y: number;
    rect: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const zoomRef = useRef(1);
  const panOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);
  const cropModeRef = useRef(!!cropMode);
  useEffect(() => { cropModeRef.current = !!cropMode; }, [cropMode]);

  useEffect(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, [mediaUrl]);

  useEffect(() => {
    const canvas = paintCanvasRef?.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const onLoad = () => {
      canvas.width = img.naturalWidth || 1;
      canvas.height = img.naturalHeight || 1;
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    };
    if (img.complete && img.naturalWidth) {
      onLoad();
    } else {
      img.addEventListener("load", onLoad, { once: true });
      return () => img.removeEventListener("load", onLoad);
    }
  }, [mediaUrl, paintCanvasRef]);

  useEffect(() => {
    if (cropMode) {
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [cropMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      if (cropModeRef.current) return;
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const currentZoom = zoomRef.current;
      const currentPan = panOffsetRef.current;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.min(8, Math.max(0.25, currentZoom * factor));
      setZoom(newZoom);
      setPanOffset({
        x: cursorX - (cursorX - currentPan.x) * (newZoom / currentZoom),
        y: cursorY - (cursorY - currentPan.y) * (newZoom / currentZoom),
      });
    };
    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, []);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const container = img.parentElement;
    if (!container || !img.naturalWidth || !img.naturalHeight) {
      setImageLoaded(true);
      return;
    }
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = containerWidth / containerHeight;

    let displayedWidth: number;
    let displayedHeight: number;
    let offsetX = 0;
    let offsetY = 0;

    if (imgAspect > containerAspect) {
      displayedWidth = containerWidth;
      displayedHeight = containerWidth / imgAspect;
      offsetY = (containerHeight - displayedHeight) / 2;
    } else {
      displayedHeight = containerHeight;
      displayedWidth = containerHeight * imgAspect;
      offsetX = (containerWidth - displayedWidth) / 2;
    }

    (img as HTMLImageElement & { _displayedOffset?: { x: number; y: number }; })._displayedOffset = { x: offsetX, y: offsetY };
    setImageLoaded(true);
  };

  const aspects = [
    { label: "1:1", ratio: 1 },
    { label: "3:2", ratio: 3 / 2 },
    { label: "2:3", ratio: 2 / 3 },
    { label: "5:4", ratio: 5 / 4 },
    { label: "4:5", ratio: 4 / 5 },
    { label: "Free", ratio: null },
  ];

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!cropMode || !imgRef.current || !imageLoaded) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "BUTTON" || target.closest("button")) return;
    const imgRect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - imgRect.left;
    const y = e.clientY - imgRect.top;

    if (cropRect && !resizing) {
      const inRect =
        x >= cropRect.x &&
        x <= cropRect.x + cropRect.width &&
        y >= cropRect.y &&
        y <= cropRect.y + cropRect.height;
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

  const handleResizeMouseDown = (
    e: React.MouseEvent,
    handle: ResizeHandle
  ) => {
    e.stopPropagation();
    if (!cropRect || !imgRef.current || !handle) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setResizeStart({ x, y, rect: { ...cropRect } });
    setResizing(handle);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const mouseX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const mouseY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    if (moving && moveStart && cropRect) {
      const dx = mouseX - moveStart.x;
      const dy = mouseY - moveStart.y;
      const start = moveStart.rect;

      let newX = start.x + dx;
      let newY = start.y + dy;

      newX = Math.max(0, Math.min(newX, rect.width - start.width));
      newY = Math.max(0, Math.min(newY, rect.height - start.height));

      setCropRect({ ...cropRect, x: newX, y: newY });
      return;
    }

    if (resizing && resizeStart) {
      const dx = mouseX - resizeStart.x;
      const dy = mouseY - resizeStart.y;
      const start = resizeStart.rect;

      let newRect = { ...start };

      if (resizing.includes("e")) {
        newRect.width = Math.max(20, start.width + dx);
      }
      if (resizing.includes("w")) {
        const newWidth = Math.max(20, start.width - dx);
        newRect.x = start.x + (start.width - newWidth);
        newRect.width = newWidth;
      }
      if (resizing.includes("s")) {
        newRect.height = Math.max(20, start.height + dy);
      }
      if (resizing.includes("n")) {
        const newHeight = Math.max(20, start.height - dy);
        newRect.y = start.y + (start.height - newHeight);
        newRect.height = newHeight;
      }

      if (aspectPreset) {
        const preset = aspects.find((a) => a.label === aspectPreset);
        if (preset?.ratio) {
          if (resizing === "e" || resizing === "w") {
            newRect.height = newRect.width / preset.ratio;
          } else if (resizing === "n" || resizing === "s") {
            newRect.width = newRect.height * preset.ratio;
          }
        }
      }

      setCropRect(newRect);
      return;
    }

    if (!isDrawing || !dragStart) return;

    let width = mouseX - dragStart.x;
    let height = mouseY - dragStart.y;

    if (aspectPreset) {
      const preset = aspects.find((a) => a.label === aspectPreset);
      if (preset?.ratio) {
        if (Math.abs(width) > Math.abs(height)) {
          height = width / preset.ratio;
        } else {
          width = height * preset.ratio;
        }
      }
    }

    if (width < 0) {
      setCropRect({ x: mouseX, y: dragStart.y, width: -width, height: height });
    } else if (height < 0) {
      setCropRect({ x: dragStart.x, y: mouseY, width: width, height: -height });
    } else {
      setCropRect({ x: dragStart.x, y: dragStart.y, width, height });
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setDragStart(null);
    setResizing(null);
    setResizeStart(null);
    setMoving(false);
    setMoveStart(null);
  };

  const handleAccept = async () => {
    if (!cropRect || !imgRef.current || !imageLoaded) return;
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    if (!naturalWidth || !naturalHeight) {
      return;
    }

    const containerWidth = rect.width;
    const containerHeight = rect.height;
    const imgAspect = naturalWidth / naturalHeight;
    const containerAspect = containerWidth / containerHeight;

    let displayedWidth: number;
    let displayedHeight: number;
    let offsetX = 0;
    let offsetY = 0;

    if (imgAspect > containerAspect) {
      displayedWidth = containerWidth;
      displayedHeight = containerWidth / imgAspect;
      offsetY = (containerHeight - displayedHeight) / 2;
    } else {
      displayedHeight = containerHeight;
      displayedWidth = containerHeight * imgAspect;
      offsetX = (containerWidth - displayedWidth) / 2;
    }

    const imgX = cropRect.x - offsetX;
    const imgY = cropRect.y - offsetY;

    const scaleX = naturalWidth / displayedWidth;
    const scaleY = naturalHeight / displayedHeight;

    const crop = {
      x: Math.max(0, Math.round(imgX * scaleX)),
      y: Math.max(0, Math.round(imgY * scaleY)),
      width: Math.round(cropRect.width * scaleX),
      height: Math.round(cropRect.height * scaleY),
    };

    if (crop.width > 10 && crop.height > 10) {
      await onCropComplete?.(crop.x, crop.y, crop.width, crop.height);
      setCropRect(null);
    }
  };

  const handleCancel = () => {
    setCropRect(null);
    onCropCancel?.();
  };

  function stamp(canvas: HTMLCanvasElement, x: number, y: number) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const tool = paintTool ?? "pencil";
    const size = paintSize ?? 8;
    const color = paintColor ?? "#ffffff";
    const half = size / 2;
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = color;
    }
    if (tool === "quad") {
      ctx.fillRect(x - half, y - half, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, half, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function toCanvasCoords(e: React.MouseEvent): { x: number; y: number } | null {
    const canvas = paintCanvasRef?.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  const handleCanvasMount = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (paintCanvasRef) {
        (paintCanvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = canvas;
      }
      if (canvas && imgRef.current) {
        canvas.width = imgRef.current.naturalWidth || 1;
        canvas.height = imgRef.current.naturalHeight || 1;
      }
    },
    [paintCanvasRef, imgRef]
  );

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (cropMode) return;
    if (e.shiftKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }
    if (paintMode) {
      const coords = toCanvasCoords(e);
      if (coords && paintCanvasRef?.current) {
        setIsPainting(true);
        stamp(paintCanvasRef.current, coords.x, coords.y);
      }
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (isPanning && panStart) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    if (isPainting && paintMode && paintCanvasRef?.current) {
      const coords = toCanvasCoords(e);
      if (coords) stamp(paintCanvasRef.current, coords.x, coords.y);
    }
  };

  const handleContainerMouseUp = () => {
    setIsPanning(false);
    setPanStart(null);
    setIsPainting(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-surface rounded-lg overflow-hidden h-full w-full"
      style={{ cursor: isPanning ? "grabbing" : (paintMode ? "crosshair" : undefined) }}
      onMouseDown={handleContainerMouseDown}
      onMouseMove={handleContainerMouseMove}
      onMouseUp={handleContainerMouseUp}
      onMouseLeave={handleContainerMouseUp}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        <img
          ref={imgRef}
          src={mediaUrl}
          alt={filename}
          className="absolute inset-0 w-full h-full object-contain"
          onLoad={handleImageLoad}
        />
        {showMask && maskUrl && (
          <img
            src={maskUrl}
            alt="mask"
            className="absolute inset-0 w-full h-full object-contain opacity-50 mix-blend-multiply pointer-events-none"
          />
        )}
        {paintMode && imageLoaded && (
          <canvas
            ref={handleCanvasMount}
            className="absolute inset-0 w-full h-full"
            style={{ cursor: "crosshair", imageRendering: "pixelated" }}
          />
        )}
      </div>
      {cropMode && (
        <div
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1 bg-black/70 rounded p-1 z-10">
            {aspects.map((a) => (
              <button
                key={a.label}
                className={`px-2 py-1 text-xs rounded ${
                  aspectPreset === a.label
                    ? "bg-blue-500 text-white"
                    : "text-white hover:bg-white/20"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setAspectPreset(a.label);
                }}
              >
                {a.label}
              </button>
            ))}
          </div>

          {cropRect && (
            <div
              className="absolute border-2 border-green-500 bg-green-500/20 cursor-move"
              style={{
                left: cropRect.x,
                top: cropRect.y,
                width: cropRect.width,
                height: cropRect.height,
              }}
            >
              <div
                className="absolute -top-1 -left-1 w-3 h-3 bg-green-500 cursor-nw-resize hover:bg-green-400"
                onMouseDown={(e) => handleResizeMouseDown(e, "nw")}
              />
              <div
                className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 cursor-ne-resize hover:bg-green-400"
                onMouseDown={(e) => handleResizeMouseDown(e, "ne")}
              />
              <div
                className="absolute -bottom-1 -left-1 w-3 h-3 bg-green-500 cursor-sw-resize hover:bg-green-400"
                onMouseDown={(e) => handleResizeMouseDown(e, "sw")}
              />
              <div
                className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 cursor-se-resize hover:bg-green-400"
                onMouseDown={(e) => handleResizeMouseDown(e, "se")}
              />
              <div
                className="absolute top-0 -left-2 w-2 h-full bg-green-500 cursor-w-resize hover:bg-green-400"
                onMouseDown={(e) => handleResizeMouseDown(e, "w")}
              />
              <div
                className="absolute top-0 -right-2 w-2 h-full bg-green-500 cursor-e-resize hover:bg-green-400"
                onMouseDown={(e) => handleResizeMouseDown(e, "e")}
              />
              <div
                className="absolute left-0 -top-2 w-full h-2 bg-green-500 cursor-n-resize hover:bg-green-400"
                onMouseDown={(e) => handleResizeMouseDown(e, "n")}
              />
              <div
                className="absolute left-0 -bottom-2 w-full h-2 bg-green-500 cursor-s-resize hover:bg-green-400"
                onMouseDown={(e) => handleResizeMouseDown(e, "s")}
              />
            </div>
          )}

          {cropRect && cropRect.width > 5 && cropRect.height > 5 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              <button
                className="px-3 py-1.5 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleAccept();
                }}
              >
                Accept
              </button>
              <button
                className="px-3 py-1.5 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleCancel();
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
      {processing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-lg gap-2">
          <Loader2 className="size-10 text-white animate-spin" />
          <span className="text-white text-sm font-medium">
            {processing === "upscale" && "Upscaling..."}
            {processing === "rembg" && "Removing background..."}
            {processing === "mask" && "Generating mask..."}
            {processing === "crop" && "Cropping..."}
            {processing === "paint" && "Painting..."}
          </span>
        </div>
      )}
    </div>
  );
}
