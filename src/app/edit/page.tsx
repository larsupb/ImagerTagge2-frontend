"use client";

import { useEffect, useCallback } from "react";
import { api, getMediaUrl } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import ImageViewer from "@/components/edit/ImageViewer";
import VideoPlayer from "@/components/edit/VideoPlayer";
import NavigationBar from "@/components/edit/NavigationBar";
import CaptionEditor from "@/components/edit/CaptionEditor";
import ImageToolbar from "@/components/edit/ImageToolbar";

export default function EditPage() {
  const { currentIndex, currentItem, datasetInfo, setCurrentItem, setCurrentIndex } =
    useSessionStore();

  const loadItem = useCallback(async (index: number) => {
    try {
      const item = await api.getItem(index);
      setCurrentIndex(index);
      setCurrentItem(item);
    } catch {
      // index out of range — stay put
    }
  }, [setCurrentIndex, setCurrentItem]);

  useEffect(() => {
    if (datasetInfo) {
      loadItem(currentIndex);
    }
  }, [datasetInfo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") loadItem(Math.max(0, currentIndex - 1));
      if (e.key === "ArrowRight") loadItem(Math.min((datasetInfo?.total_items ?? 1) - 1, currentIndex + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, datasetInfo, loadItem]);

  if (!datasetInfo) {
    return <div className="text-zinc-500 text-center py-12">Load a dataset to start editing</div>;
  }

  if (!currentItem) {
    return <div className="text-zinc-500 text-center py-12">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <ImageToolbar index={currentIndex} onRefresh={() => loadItem(currentIndex)} />

      <div className="flex-1 min-h-0">
        {currentItem.is_video ? (
          <VideoPlayer mediaUrl={getMediaUrl(currentItem.index)} />
        ) : (
          <ImageViewer mediaUrl={getMediaUrl(currentItem.index)} filename={currentItem.filename} />
        )}
      </div>

      <CaptionEditor
        caption={currentItem.caption}
        index={currentIndex}
        onCaptionChange={(caption) =>
          setCurrentItem({ ...currentItem, caption })
        }
      />

      <NavigationBar onNavigate={loadItem} />
    </div>
  );
}
