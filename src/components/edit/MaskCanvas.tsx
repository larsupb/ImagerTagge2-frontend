"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { PaintTool } from "@/lib/types";

export interface MaskCanvasHandle {
  onMouseDown(e: React.MouseEvent): void;
  onMouseMove(e: React.MouseEvent): void;
  onMouseUp(): void;
  getBlob(): Promise<Blob>;
}

interface MaskCanvasProps {
  tool: PaintTool;
  size: number;
  imageDisplayRect: { x: number; y: number; width: number; height: number };
  naturalWidth: number;
  naturalHeight: number;
  maskUrl?: string | null;
}

function toCanvasCoords(
  e: React.MouseEvent,
  canvas: HTMLCanvasElement
): { x: number; y: number } | null {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function stampMask(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  tool: PaintTool,
  size: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
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

const MaskCanvas = forwardRef<MaskCanvasHandle, MaskCanvasProps>(
  function MaskCanvas({ tool, size, imageDisplayRect, naturalWidth, naturalHeight, maskUrl }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isPaintingRef = useRef(false);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = naturalWidth;
      canvas.height = naturalHeight;
    }, [naturalWidth, naturalHeight]);

    useEffect(() => {
      if (!maskUrl || !canvasRef.current) return;
      const canvas = canvasRef.current;
      let cancelled = false;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (cancelled) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = maskUrl;
      return () => { cancelled = true; };
    }, [maskUrl, naturalWidth, naturalHeight]);

    useImperativeHandle(ref, () => ({
      onMouseDown(e) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const coords = toCanvasCoords(e, canvas);
        if (coords) {
          isPaintingRef.current = true;
          stampMask(canvas, coords.x, coords.y, tool, size);
        }
      },
      onMouseMove(e) {
        if (!isPaintingRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const coords = toCanvasCoords(e, canvas);
        if (coords) stampMask(canvas, coords.x, coords.y, tool, size);
      },
      onMouseUp() {
        isPaintingRef.current = false;
      },
      getBlob() {
        return new Promise<Blob>((resolve, reject) => {
          canvasRef.current?.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Canvas empty"))),
            "image/png"
          );
        });
      },
    }), [tool, size]);

    return (
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          left: imageDisplayRect.x,
          top: imageDisplayRect.y,
          width: imageDisplayRect.width,
          height: imageDisplayRect.height,
          opacity: 0.5,
          mixBlendMode: "multiply",
          imageRendering: "pixelated",
          pointerEvents: "none",
        }}
      />
    );
  }
);

export default MaskCanvas;
