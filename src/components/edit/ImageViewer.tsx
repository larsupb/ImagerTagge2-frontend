"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { PaintTool } from "@/lib/types";
import CropOverlay from "./CropOverlay";
import PaintCanvas, { type PaintCanvasHandle } from "./PaintCanvas";
import MaskCanvas, { type MaskCanvasHandle } from "./MaskCanvas";

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
  paintCanvasRef?: React.RefObject<PaintCanvasHandle | null>;
  maskEditMode?: boolean;
  maskEditTool?: PaintTool;
  maskEditSize?: number;
  maskCanvasRef?: React.RefObject<MaskCanvasHandle | null>;
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

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (cropMode) return;
    if (e.shiftKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }
    if (paintMode) paintCanvasRef?.current?.onMouseDown(e);
    if (maskEditMode) maskCanvasRef?.current?.onMouseDown(e);
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (isPanning && panStart) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    if (paintMode) paintCanvasRef?.current?.onMouseMove(e);
    if (maskEditMode) maskCanvasRef?.current?.onMouseMove(e);
  };

  const handleContainerMouseUp = () => {
    setIsPanning(false);
    setPanStart(null);
    paintCanvasRef?.current?.onMouseUp();
    maskCanvasRef?.current?.onMouseUp();
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-surface rounded-lg overflow-hidden h-full w-full"
      style={{ cursor: isPanning ? "grabbing" : (paintMode || maskEditMode ? "crosshair" : undefined) }}
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
          <PaintCanvas
            ref={paintCanvasRef ?? null}
            tool={paintTool ?? "pencil"}
            size={paintSize ?? 8}
            color={paintColor ?? "#ffffff"}
            imageDisplayRect={imageDisplayRect}
            naturalWidth={naturalSize.w}
            naturalHeight={naturalSize.h}
          />
        )}
        {maskEditMode && imageLoaded && imageDisplayRect && (
          <MaskCanvas
            ref={maskCanvasRef ?? null}
            tool={maskEditTool ?? "pencil"}
            size={maskEditSize ?? 8}
            imageDisplayRect={imageDisplayRect}
            naturalWidth={naturalSize.w}
            naturalHeight={naturalSize.h}
            maskUrl={maskUrl}
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
