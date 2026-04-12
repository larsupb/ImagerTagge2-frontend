"use client";

import { useState, useRef, useEffect } from "react";

interface HoverImageProps {
  src: string;
  alt: string;
  className?: string;
  previewClassName?: string;
  previewSrc?: string;
}

export function HoverImage({ src, alt, className = "", previewClassName = "", previewSrc }: HoverImageProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, above: false });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const previewHeight = 620;
    const previewWidth = 820;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.left;
    const showAbove = spaceBelow < previewHeight + 20;
    const leftPos = Math.min(rect.left, window.innerWidth - previewWidth - 20);
    
    setPosition({ 
      top: showAbove ? rect.top - previewHeight - 8 : rect.bottom + 8, 
      left: leftPos,
      above: showAbove
    });
  }, [showPreview]);

  const displaySrc = previewSrc || src;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      <img src={src} alt={alt} className="block w-full h-full object-contain" />
      {showPreview && (
        <div
          className={`fixed z-50 pointer-events-none ${previewClassName}`}
          style={{ top: position.top, left: position.left }}
        >
          <img
            src={displaySrc}
            alt={alt}
            className={`rounded-lg shadow-xl border border-border ${
              position.above 
                ? "animate-in fade-in slide-in-from-bottom-2" 
                : "animate-in fade-in slide-in-from-top-2"
            }`}
            style={{ maxWidth: "800px", maxHeight: "600px" }}
          />
        </div>
      )}
    </div>
  );
}