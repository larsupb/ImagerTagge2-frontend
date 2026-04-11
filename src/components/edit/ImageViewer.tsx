"use client";

import { Loader2 } from "lucide-react";

interface ImageViewerProps {
  mediaUrl: string;
  maskUrl?: string | null;
  filename: string;
  showMask?: boolean;
  processing?: string | null;
}

export default function ImageViewer({ mediaUrl, maskUrl, filename, showMask, processing }: ImageViewerProps) {
  return (
    <div className="relative bg-surface rounded-lg overflow-hidden h-full w-full">
      <img
        src={mediaUrl}
        alt={filename}
        className="absolute inset-0 w-full h-full object-contain"
      />
      {showMask && maskUrl && (
        <img
          src={maskUrl}
          alt="mask"
          className="absolute inset-0 w-full h-full object-contain opacity-50 mix-blend-multiply pointer-events-none"
        />
      )}
      {processing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-lg gap-2">
          <Loader2 className="size-10 text-white animate-spin" />
          <span className="text-white text-sm font-medium">
            {processing === "upscale" && "Upscaling..."}
            {processing === "rembg" && "Removing background..."}
            {processing === "mask" && "Generating mask..."}
          </span>
        </div>
      )}
    </div>
  );
}
