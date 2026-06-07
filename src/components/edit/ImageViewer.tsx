"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import type { PaintTool } from "@/lib/types";
import CropOverlay from "./CropOverlay";

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
  paintTool?: PaintTool;
  paintSize?: number;
  paintColor?: string;
  paintCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  maskEditMode?: boolean;
  maskEditTool?: PaintTool;
  maskEditSize?: number;
  maskCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

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
  maskEditMode,
  maskEditTool,
  maskEditSize,
  maskCanvasRef,
}: ImageViewerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDisplayRect, setImageDisplayRect] = useState<{
    x: number; y: number; width: number; height: number;
  } | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: 1, h: 1 });
  const [isPainting, setIsPainting] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const zoomRef = useRef(1);
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const cropModeRef = useRef(cropMode);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);
  useEffect(() => { cropModeRef.current = !!cropMode; }, [cropMode]);

  useEffect(() => {
    if (cropMode) {
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [cropMode]);

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
    const outer = containerRef.current;
    if (!outer) return;
    const update = () => {
      const img = imgRef.current;
      if (!img || !img.naturalWidth || !img.naturalHeight) return;
      const w = outer.clientWidth;
      const h = outer.clientHeight;
      if (!w || !h) return;
      const ar = img.naturalWidth / img.naturalHeight;
      const cr = w / h;
      let dw: number, dh: number, ox = 0, oy = 0;
      if (ar > cr) { dw = w; dh = w / ar; oy = (h - dh) / 2; }
      else { dh = h; dw = h * ar; ox = (w - dw) / 2; }
      setImageDisplayRect({ x: ox, y: oy, width: dw, height: dh });
      setNaturalSize({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    };
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    return () => ro.disconnect();
  }, []);

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
    setImageDisplayRect({ x: offsetX, y: offsetY, width: displayedWidth, height: displayedHeight });
    setNaturalSize({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    setImageLoaded(true);
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

  function stampMask(canvas: HTMLCanvasElement, x: number, y: number) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const tool = maskEditTool ?? "pencil";
    const size = maskEditSize ?? 8;
    const half = size / 2;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = tool === "eraser" ? "black" : "white";
    if (tool === "quad") {
      ctx.fillRect(x - half, y - half, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, half, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function toCanvasCoords(e: React.MouseEvent, canvasOverride?: HTMLCanvasElement | null): { x: number; y: number } | null {
    const canvas = canvasOverride ?? paintCanvasRef?.current;
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

  const handleMaskCanvasMount = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (maskCanvasRef) {
        (maskCanvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = canvas;
      }
      if (canvas && imgRef.current) {
        canvas.width = imgRef.current.naturalWidth || 1;
        canvas.height = imgRef.current.naturalHeight || 1;
      }
    },
    [maskCanvasRef, imgRef]
  );

  useEffect(() => {
    if (!maskEditMode || !maskCanvasRef?.current || !maskUrl) return;
    const canvas = maskCanvasRef.current;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = maskUrl;
  }, [maskEditMode, maskUrl, maskCanvasRef]);

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
    if (maskEditMode) {
      const coords = toCanvasCoords(e, maskCanvasRef?.current);
      if (coords && maskCanvasRef?.current) {
        setIsPainting(true);
        stampMask(maskCanvasRef.current, coords.x, coords.y);
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
    if (isPainting && maskEditMode && maskCanvasRef?.current) {
      const coords = toCanvasCoords(e, maskCanvasRef.current);
      if (coords) stampMask(maskCanvasRef.current, coords.x, coords.y);
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
        {showMask && maskUrl && !maskEditMode && (
          <img
            src={maskUrl}
            alt="mask"
            className="absolute inset-0 w-full h-full object-contain opacity-50 mix-blend-multiply pointer-events-none"
          />
        )}
        {paintMode && imageLoaded && imageDisplayRect && (
          <canvas
            ref={handleCanvasMount}
            style={{
              position: "absolute",
              left: imageDisplayRect.x,
              top: imageDisplayRect.y,
              width: imageDisplayRect.width,
              height: imageDisplayRect.height,
              cursor: "crosshair",
              imageRendering: "pixelated",
            }}
          />
        )}
        {maskEditMode && imageLoaded && imageDisplayRect && (
          <canvas
            ref={handleMaskCanvasMount}
            style={{
              position: "absolute",
              left: imageDisplayRect.x,
              top: imageDisplayRect.y,
              width: imageDisplayRect.width,
              height: imageDisplayRect.height,
              opacity: 0.5,
              mixBlendMode: "multiply",
              imageRendering: "pixelated",
            }}
          />
        )}
      </div>
      {cropMode && imageDisplayRect && (
        <CropOverlay
          imageDisplayRect={imageDisplayRect}
          naturalWidth={naturalSize.w}
          naturalHeight={naturalSize.h}
          onCropComplete={onCropComplete!}
          onCropCancel={onCropCancel!}
        />
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
