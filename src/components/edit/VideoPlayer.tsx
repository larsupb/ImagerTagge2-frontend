"use client";

interface VideoPlayerProps {
  mediaUrl: string;
}

export default function VideoPlayer({ mediaUrl }: VideoPlayerProps) {
  return (
    <div className="flex items-center justify-center bg-surface rounded-lg overflow-hidden h-full">
      <video src={mediaUrl} controls className="max-w-full max-h-full" />
    </div>
  );
}
