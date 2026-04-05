"use client";

import { useEffect, useCallback } from "react";
import { FolderOpen } from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/session";
import EmptyState from "@/components/shared/EmptyState";
import ImageViewer from "@/components/edit/ImageViewer";
import VideoPlayer from "@/components/edit/VideoPlayer";
import NavigationBar from "@/components/edit/NavigationBar";
import CaptionEditor from "@/components/edit/CaptionEditor";
import ImageToolbar from "@/components/edit/ImageToolbar";

export default function EditPage() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const session = useSessionStore((s) =>
    activeProjectId ? s.getProjectSession(activeProjectId) : undefined
  );
  const { currentIndex, currentItem, datasetInfo } = session ?? {};
  const setCurrentIndex = useSessionStore((s) => s.setCurrentIndex);
  const setCurrentItem = useSessionStore((s) => s.setCurrentItem);

  const loadItem = useCallback(
    async (index: number) => {
      if (!activeProjectId) return;
      try {
        const item = await api.getItem(index);
        setCurrentIndex(activeProjectId, index);
        setCurrentItem(activeProjectId, item);
      } catch {
        // index out of range — stay put
      }
    },
    [activeProjectId, setCurrentIndex, setCurrentItem]
  );

  useEffect(() => {
    if (activeProjectId && datasetInfo && !currentItem) {
      loadItem(currentIndex ?? 0);
    }
  }, [activeProjectId, datasetInfo, currentItem, currentIndex, loadItem]);

  useEffect(() => {
    if (!activeProjectId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") loadItem(Math.max(0, (currentIndex ?? 0) - 1));
      if (e.key === "ArrowRight")
        loadItem(Math.min((datasetInfo?.total_items ?? 1) - 1, (currentIndex ?? 0) + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, datasetInfo, loadItem, activeProjectId]);

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No project open"
        description="Open a project to start editing."
      />
    );
  }

  if (!datasetInfo) {
    return <div className="text-text-muted text-center py-12">Loading...</div>;
  }

  if (!currentItem) {
    return <div className="text-text-muted text-center py-12">Loading...</div>;
  }

  const safeIndex = currentIndex ?? 0;

  return (
    <div className="flex flex-col h-full gap-3">
      <ImageToolbar index={safeIndex} onRefresh={() => loadItem(safeIndex)} />

      <div className="flex-1 min-h-0">
        {currentItem.is_video ? (
          <VideoPlayer mediaUrl={getMediaUrl(currentItem.index)} />
        ) : (
          <ImageViewer mediaUrl={getMediaUrl(currentItem.index)} filename={currentItem.filename} />
        )}
      </div>

      <CaptionEditor
        caption={currentItem.caption}
        index={safeIndex}
        onCaptionChange={(caption) =>
          setCurrentItem(activeProjectId, { ...currentItem, caption })
        }
      />

      <NavigationBar onNavigate={loadItem} />
    </div>
  );
}
