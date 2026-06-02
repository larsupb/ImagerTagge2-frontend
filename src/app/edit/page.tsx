"use client";

import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { api, getMediaUrl, getMaskUrl } from "@/lib/api";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/session";
import EmptyState from "@/components/shared/EmptyState";
import ImageViewer from "@/components/edit/ImageViewer";
import VideoPlayer from "@/components/edit/VideoPlayer";
import NavigationBar from "@/components/edit/NavigationBar";
import CaptionEditor from "@/components/edit/CaptionEditor";
import CategorySelector from "@/components/edit/CategorySelector";
import ImageToolbar from "@/components/edit/ImageToolbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function EditPage() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const session = useSessionStore((s) =>
    activeProjectId ? s.getProjectSession(activeProjectId) : undefined
  );
  const { currentIndex, currentItem, datasetInfo } = session ?? {};

  const { data: galleryData } = useQuery({
    queryKey: ["gallery", "all", datasetInfo?.total_items ?? 0],
    queryFn: () => api.getGallery(0, datasetInfo!.total_items),
    enabled: !!datasetInfo && (datasetInfo.total_items > 0),
    staleTime: Infinity,
  });

  const navItems = useMemo<{ index: number }[]>(() => {
    if (!currentItem) return [];
    if (galleryData?.items) {
      return galleryData.items
        .filter((i) => i.category === currentItem.category)
        .sort((a, b) => a.index - b.index)
        .map((i) => ({ index: i.index }));
    }
    const total = datasetInfo?.total_items ?? 0;
    return Array.from({ length: total }, (_, i) => ({ index: i }));
  }, [galleryData?.items, currentItem, datasetInfo?.total_items]);

  const positionInNav = navItems.findIndex((i) => i.index === (currentIndex ?? 0));

  const setCurrentIndex = useSessionStore((s) => s.setCurrentIndex);
  const setCurrentItem = useSessionStore((s) => s.setCurrentItem);

  const queryClient = useQueryClient();
  const [captionDirty, setCaptionDirty] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showMask, setShowMask] = useState(false);
  const [showDirtyDialog, setShowDirtyDialog] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const pendingNavigation = useRef<number | null>(null);
  const getUnsavedTextRef = useRef<(() => string) | null>(null);

  const loadItem = useCallback(
    async (index: number) => {
      if (!activeProjectId) return;
      try {
        const item = await api.getItem(index);
        setCurrentIndex(activeProjectId, index);
        setCurrentItem(activeProjectId, item);
        if (!item.has_mask) setShowMask(false);
      } catch {
        // index out of range — stay put
      }
    },
    [activeProjectId, setCurrentIndex, setCurrentItem]
  );

  const handleDeleted = useCallback(
    (deletedIndex: number) => {
      const pos = navItems.findIndex((i) => i.index === deletedIndex);
      const newTotal = (datasetInfo?.total_items ?? 1) - 1;
      let targetIndex: number;
      if (pos !== -1 && pos < navItems.length - 1) {
        targetIndex = navItems[pos + 1].index - 1;
      } else if (pos > 0) {
        targetIndex = navItems[pos - 1].index;
      } else {
        targetIndex = Math.min(deletedIndex, newTotal - 1);
      }
      loadItem(Math.max(0, targetIndex));
    },
    [navItems, datasetInfo?.total_items, loadItem]
  );

  const handleNavigate = useCallback(
    (index: number) => {
      if (captionDirty) {
        pendingNavigation.current = index;
        setShowDirtyDialog(true);
      } else {
        loadItem(index);
      }
    },
    [captionDirty, loadItem]
  );

  const handleSaveAndGo = async () => {
    const text = getUnsavedTextRef.current?.() ?? "";
    const saveIndex = currentIndex ?? 0;
    await api.saveCaption(saveIndex, text);
    setShowDirtyDialog(false);
    if (pendingNavigation.current !== null) {
      loadItem(pendingNavigation.current);
      pendingNavigation.current = null;
    }
  };

  const handleDiscardAndGo = () => {
    setShowDirtyDialog(false);
    if (pendingNavigation.current !== null) {
      loadItem(pendingNavigation.current);
      pendingNavigation.current = null;
    }
  };

  const handleCropComplete = async (
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    setProcessing("crop");
    try {
      await api.crop(safeIndex, x, y, width, height);
      setCropMode(false);
      loadItem(safeIndex);
      queryClient.invalidateQueries({ queryKey: ["versions", safeIndex] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Crop failed");
    } finally {
      setProcessing(null);
    }
  };

  useEffect(() => {
    if (activeProjectId && datasetInfo && (!currentItem || currentItem.index !== currentIndex)) {
      loadItem(currentIndex ?? 0);
    }
  }, [activeProjectId, datasetInfo, currentItem, currentIndex, loadItem]);

  useEffect(() => {
    if (!activeProjectId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") {
        const prev = navItems[positionInNav - 1];
        if (prev) handleNavigate(prev.index);
      }
      if (e.key === "ArrowRight") {
        const next = navItems[positionInNav + 1];
        if (next) handleNavigate(next.index);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navItems, positionInNav, handleNavigate, activeProjectId]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (captionDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [captionDirty]);

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
      <ImageToolbar index={safeIndex} onRefresh={() => loadItem(safeIndex)} onDeleted={handleDeleted} processing={processing} setProcessing={setProcessing} onMaskGenerated={() => setShowMask(true)} showMask={showMask} setShowMask={setShowMask} cropMode={cropMode} setCropMode={setCropMode} />

      <div className="flex-1 min-h-0">
        {currentItem.is_video ? (
          <VideoPlayer mediaUrl={getMediaUrl(currentItem.index)} />
        ) : (
          <ImageViewer
            mediaUrl={`${getMediaUrl(currentItem.index)}&v=${encodeURIComponent(`${currentItem.filename}-${currentItem.file_size ?? ""}`)}`}
            maskUrl={currentItem.has_mask ? getMaskUrl(currentItem.index) : null}
            filename={currentItem.filename}
            showMask={showMask}
            processing={processing}
            cropMode={cropMode}
            onCropComplete={handleCropComplete}
            onCropCancel={() => setCropMode(false)}
          />
        )}
      </div>

      <CategorySelector
        index={safeIndex}
        category={currentItem.category}
        onCategoryChange={(category) => {
          setCurrentItem(activeProjectId, { ...currentItem, category });
        }}
      />

      <CaptionEditor
        caption={currentItem.caption}
        index={safeIndex}
        savedCaption={currentItem.caption}
        captions={currentItem.captions ?? []}
        onCaptionChange={async (caption) => {
          setCurrentItem(activeProjectId, { ...currentItem, caption });
          await loadItem(safeIndex);
        }}
        onDirtyChange={setCaptionDirty}
        getUnsavedText={(getter) => {
          getUnsavedTextRef.current = getter;
        }}
      />

      <NavigationBar onNavigate={handleNavigate} navItems={navItems} />

      <Dialog open={showDirtyDialog} onOpenChange={setShowDirtyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Caption Changes</DialogTitle>
            <DialogDescription>
              The caption for this image has been modified. What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDirtyDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDiscardAndGo}>
              Discard
            </Button>
            <Button onClick={handleSaveAndGo}>
              Save &amp; Go
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
