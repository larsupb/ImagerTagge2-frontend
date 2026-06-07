"use client";

import { useState } from "react";

function getAspectRatioInfo(w: number, h: number): { ratio: string; clean: boolean; label: string } {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const g = gcd(w, h);
  const rw = w / g;
  const rh = h / g;

  if (rw <= 24 && rh <= 24) {
    return { ratio: `${rw}:${rh}`, clean: true, label: `${rw}:${rh}` };
  }

  const COMMON = [
    [1, 1], [4, 3], [3, 2], [16, 9], [16, 10], [5, 4], [3, 4], [2, 3], [3, 5],
    [9, 16], [21, 9], [2, 1], [4, 5], [5, 7], [8, 5], [9, 21],
  ];
  const ar = w / h;
  const [nw, nh] = COMMON.reduce((best, cur) => {
    const diff = Math.abs(cur[0] / cur[1] - ar);
    return diff < Math.abs(best[0] / best[1] - ar) ? cur : best;
  });
  const deviation = Math.abs(nw / nh - ar) / ar;
  if (deviation < 0.01) {
    return { ratio: `${nw}:${nh}`, clean: true, label: `${nw}:${nh}` };
  }

  return { ratio: ar.toFixed(2), clean: false, label: ar.toFixed(2) };
}
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpCircle, Brush, Eraser, VenetianMask, History, Pencil, Trash2, Eye, EyeOff, Crop, Sun, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import VersionHistoryDialog from "./VersionHistoryDialog";
import DropdownButton from "./DropdownButton";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/session";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ToolbarButton from "./ToolbarButton";
import { Input } from "@/components/ui/input";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

interface ImageToolbarProps {
  index: number;
  onRefresh: () => void;
  onDeleted: (deletedIndex: number) => void;
  processing: string | null;
  setProcessing: (v: string | null) => void;
  onMaskGenerated: () => void;
  showMask: boolean;
  setShowMask: (v: boolean) => void;
  cropMode?: boolean;
  setCropMode?: (v: boolean) => void;
  paintMode?: boolean;
  setPaintMode?: (v: boolean) => void;
  maskEditMode?: boolean;
  setMaskEditMode?: (v: boolean) => void;
}

export default function ImageToolbar({
  index, onRefresh, onDeleted, processing, setProcessing,
  onMaskGenerated, showMask, setShowMask,
  cropMode, setCropMode,
  paintMode, setPaintMode,
  maskEditMode, setMaskEditMode,
}: ImageToolbarProps) {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const session = activeProjectId
    ? useSessionStore((s) => s.getProjectSession(activeProjectId))
    : null;
  const setCurrentItem = useSessionStore((s) => s.setCurrentItem);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [imageRefreshKey, setImageRefreshKey] = useState(0);
  const bumpRefreshKey = () => setImageRefreshKey((k) => k + 1);

  const currentItem = session?.currentItem;
  const queryClient = useQueryClient();

  const { data: versions } = useQuery({
    queryKey: ["versions", index],
    queryFn: () => api.getVersions(index),
    staleTime: 0,
  });

const revertMutation = useMutation({
    mutationFn: async () => {
      const allVersions = await api.getVersions(index);
      if (!allVersions || allVersions.length === 0) {
        throw new Error("No version available to revert");
      }
      const latestVersion = allVersions[0];
      await api.restoreVersion(latestVersion.id, index);
    },
    onSuccess: () => {
      toast.success("Reverted to previous version");
      onRefresh();
      bumpRefreshKey();
      queryClient.invalidateQueries({ queryKey: ["versions", index] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Revert failed");
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
  });

  const { data: upscalers } = useQuery({
    queryKey: ["upscalers"],
    queryFn: () => api.getUpscalers(),
  });

  const { data: backgroundRemovers } = useQuery({
    queryKey: ["background-removers"],
    queryFn: () => api.getBackgroundRemovers(),
  });

  const handleUpscale = async (upscaler?: string) => {
    setProcessing("upscale");
    try {
      await api.upscale(index, upscaler);
      await api.saveUpscaled(index);
      onRefresh();
      bumpRefreshKey();
      queryClient.invalidateQueries({ queryKey: ["versions", index] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upscale failed");
    } finally {
      setProcessing(null);
    }
  };

  const handleRemoveBg = async (model?: string) => {
    setProcessing("rembg");
    try {
      await api.removeBackground(index, model);
      onRefresh();
      bumpRefreshKey();
      queryClient.invalidateQueries({ queryKey: ["versions", index] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove background failed");
    } finally {
      setProcessing(null);
    }
  };

  const handleGenerateMask = async () => {
    setProcessing("mask");
    try {
      await api.generateMask(index);
      onMaskGenerated();
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generate mask failed");
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    const result = await api.deleteItem(index);
    if (activeProjectId && session?.datasetInfo) {
      useSessionStore.getState().setDatasetInfo(activeProjectId, {
        ...session.datasetInfo,
        total_items: result.total_items,
      });
    }
    queryClient.removeQueries({ queryKey: ["gallery"] });
    onDeleted(index);
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    await api.renameItem(index, newName);
    setRenaming(false);
    onRefresh();
  };

  const handleCrop = () => {
    if (setPaintMode && paintMode) setPaintMode(false);
    if (setMaskEditMode && maskEditMode) setMaskEditMode(false);
    if (setCropMode) setCropMode(!cropMode);
  };

  const handlePaint = () => {
    if (setCropMode && cropMode) setCropMode(false);
    if (setMaskEditMode && maskEditMode) setMaskEditMode(false);
    if (setPaintMode) setPaintMode(!paintMode);
  };

  const handleMaskEdit = () => {
    if (setCropMode && cropMode) setCropMode(false);
    if (setPaintMode && paintMode) setPaintMode(false);
    if (setMaskEditMode) setMaskEditMode(true);
  };

  const handleWhiteBalance = async (method?: string) => {
    setProcessing("white_balance");
    try {
      const wbMethod = method || settings?.white_balance_method || "gray_world";
      await api.whiteBalance(index, wbMethod);
      onRefresh();
      bumpRefreshKey();
      queryClient.invalidateQueries({ queryKey: ["versions", index] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "White balance failed");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-text-muted mr-2">
        {currentItem?.filename}
        {currentItem?.width && ` \u2014 ${currentItem.width}\u00d7${currentItem.height}`}
        {currentItem?.width && currentItem?.height && (() => {
          const { clean, label } = getAspectRatioInfo(currentItem.width, currentItem.height);
          if (clean) {
            return <span> ({label})</span>;
          }
          return (
            <Tooltip>
              <TooltipTrigger>
                <span className="text-red-400"> ({label})</span>
              </TooltipTrigger>
              <TooltipContent>
                Non-standard ratio — consider resizing to a common aspect ratio before training.
              </TooltipContent>
            </Tooltip>
          );
        })()}
        {currentItem?.file_size && ` \u2014 ${(currentItem.file_size / 1024).toFixed(0)}KB`}
      </span>

      <DropdownButton
        icon={<ArrowUpCircle className="size-4" />}
        iconColor="text-purple-500"
        label="Upscale"
        processingLabel={processing === "upscale" ? "Upscaling..." : undefined}
        processing={!!processing}
        currentValue={settings?.upscaler || "NMKD_Siax_200k_4x"}
        options={(upscalers || []).map((u) => ({ value: u.name, label: `${u.name} (${u.scale_factor}x)` }))}
        onSelect={(value) => handleUpscale(value)}
      />

      <DropdownButton
        icon={<Eraser className="size-4" />}
        iconColor="text-teal-500"
        label="Remove BG"
        processingLabel={processing === "rembg" ? "Removing..." : undefined}
        processing={!!processing}
        currentValue={settings?.rembg?.model || "u2net_human_seg"}
        options={(backgroundRemovers || []).map((b) => ({ value: b.name, label: b.description }))}
        onSelect={(value) => handleRemoveBg(value)}
      />

      <ToolbarButton
        tooltip={processing === "mask" ? "Generating..." : "Gen Mask"}
        onClick={handleGenerateMask}
        disabled={!!processing}
      >
        <VenetianMask className="size-4 text-orange-500" />
      </ToolbarButton>

      {currentItem?.has_mask && (
        <ToolbarButton tooltip={showMask ? "Hide Mask" : "Show Mask"} onClick={() => setShowMask(!showMask)}>
          {showMask ? <EyeOff className="size-4 text-orange-500" /> : <Eye className="size-4 text-orange-500" />}
        </ToolbarButton>
      )}

      {currentItem?.has_mask && showMask && !maskEditMode && (
        <ToolbarButton tooltip="Edit Mask" onClick={handleMaskEdit} disabled={!!processing || currentItem?.is_video}>
          <Pencil className="size-4 text-blue-400" />
        </ToolbarButton>
      )}

      <ToolbarButton tooltip="Version History" onClick={() => setHistoryOpen(true)}>
        <History className="size-4 text-blue-500" />
      </ToolbarButton>

      <ToolbarButton tooltip="Crop" onClick={handleCrop} disabled={!!processing || currentItem?.is_video}>
        <Crop className={`size-4 ${cropMode ? "text-green-400" : "text-green-500"}`} />
      </ToolbarButton>

      <ToolbarButton tooltip="Paint" onClick={handlePaint} disabled={!!processing || currentItem?.is_video}>
        <Brush className={`size-4 ${paintMode ? "text-pink-400" : "text-pink-500"}`} />
      </ToolbarButton>

      <DropdownButton
        icon={<Sun className="size-4" />}
        iconColor="text-yellow-500"
        label="White Balance"
        processingLabel={processing === "white_balance" ? "Balancing..." : undefined}
        processing={!!processing}
        currentValue={settings?.white_balance_method || "gray_world"}
        options={[
          { value: "gray_world", label: "Gray World" },
          { value: "shades_of_gray", label: "Shades of Gray" },
          { value: "gray_edge", label: "Gray Edge" },
        ]}
        onSelect={(value) => handleWhiteBalance(value)}
      />

      <div className="flex-1" />

      {renaming ? (
        <div className="flex gap-1 items-center">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-32 h-7 text-xs"
            placeholder="New name"
          />
          <Button size="xs" onClick={handleRename}>OK</Button>
          <Button size="xs" variant="secondary" onClick={() => setRenaming(false)}>Cancel</Button>
        </div>
      ) : (
        <>
          <ToolbarButton
            tooltip={versions && versions.length > 0 ? "Revert to Previous" : "No version to revert"}
            onClick={() => revertMutation.mutate()}
            disabled={!versions || versions.length === 0 || revertMutation.isPending}
          >
            <RotateCcw className={`size-4 ${revertMutation.isPending ? "animate-spin" : "text-indigo-500"}`} />
          </ToolbarButton>

          <ToolbarButton tooltip="Rename" onClick={() => { setRenaming(true); setNewName(currentItem?.basename ?? ""); }}>
            <Pencil className="size-4" />
          </ToolbarButton>
        </>
      )}

      <ToolbarButton tooltip="Delete" variant="destructive" onClick={() => setConfirmDelete(true)}>
        <Trash2 className="size-4" />
      </ToolbarButton>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Image"
        message={`Delete ${currentItem?.filename}? This also removes its caption and mask.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <VersionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        index={index}
        onRestored={() => { onRefresh(); bumpRefreshKey(); }}
        refreshKey={imageRefreshKey}
      />
    </div>
  );
}
