"use client";

interface ImageViewerProps {
  mediaUrl: string;
  filename: string;
}

export default function ImageViewer({ mediaUrl, filename }: ImageViewerProps) {
  return (
    <div className="flex items-center justify-center bg-surface rounded-lg overflow-hidden h-full">
      <img
        src={mediaUrl}
        alt={filename}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}
