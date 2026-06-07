"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { PaintTool } from "@/lib/types";

export interface PaintCanvasHandle {
  onMouseDown(e: React.MouseEvent): void;
  onMouseMove(e: React.MouseEvent): void;
  onMouseUp(): void;
  getBlob(): Promise<Blob>;
}

interface PaintCanvasProps {
  tool: PaintTool;
  size: number;
  color: string;
  imageDisplayRect: { x: number; y: number; width: number; height: number };
  naturalWidth: number;
  naturalHeight: number;
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

function stamp(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  tool: PaintTool,
  size: number,
  color: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
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

const PaintCanvas = forwardRef<PaintCanvasHandle, PaintCanvasProps>(
  function PaintCanvas({ tool, size, color, imageDisplayRect, naturalWidth, naturalHeight }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isPaintingRef = useRef(false);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = naturalWidth;
      canvas.height = naturalHeight;
      canvas.getContext("2d")?.clearRect(0, 0, naturalWidth, naturalHeight);
    }, [naturalWidth, naturalHeight]);

    useImperativeHandle(ref, () => ({
      onMouseDown(e) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const coords = toCanvasCoords(e, canvas);
        if (coords) {
          isPaintingRef.current = true;
          stamp(canvas, coords.x, coords.y, tool, size, color);
        }
      },
      onMouseMove(e) {
        if (!isPaintingRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const coords = toCanvasCoords(e, canvas);
        if (coords) stamp(canvas, coords.x, coords.y, tool, size, color);
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
    }), [tool, size, color]);

    return (
      <canvas
        ref={canvasRef}
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
    );
  }
);

export default PaintCanvas;
