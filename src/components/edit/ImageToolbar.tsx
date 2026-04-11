"use client";

import { useState } from "react";
import { ArrowUpCircle, Eraser, VenetianMask, History, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import VersionHistoryDialog from "./VersionHistoryDialog";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/session";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

interface ImageToolbarProps {
  index: number;
  onRefresh: () => void;
  processing: string | null;
  setProcessing: (v: string | null) => void;
  onMaskGenerated: () => void;
  showMask: boolean;
  setShowMask: (v: boolean) => void;
}

export default function ImageToolbar({ index, onRefresh, processing, setProcessing, onMaskGenerated, showMask, setShowMask }: ImageToolbarProps) {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const session = activeProjectId
    ? useSessionStore((s) => s.getProjectSession(activeProjectId))
    : null;
  const setCurrentItem = useSessionStore((s) => s.setCurrentItem);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const currentItem = session?.currentItem;

  const handleUpscale = async () => {
    setProcessing("upscale");
    try {
      await api.upscale(index);
      await api.saveUpscaled(index);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upscale failed");
    } finally {
      setProcessing(null);
    }
  };

  const handleRemoveBg = async () => {
    setProcessing("rembg");
    try {
      await api.removeBackground(index);
      onRefresh();
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
    await api.deleteItem(index);
    onRefresh();
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    await api.renameItem(index, newName);
    setRenaming(false);
    onRefresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-text-muted mr-2">
        {currentItem?.filename}
        {currentItem?.width && ` \u2014 ${currentItem.width}\u00d7${currentItem.height}`}
        {currentItem?.file_size && ` \u2014 ${(currentItem.file_size / 1024).toFixed(0)}KB`}
      </span>

      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 h-7 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 shrink-0 bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          onClick={handleUpscale}
          disabled={!!processing}
        >
          <ArrowUpCircle className="size-4 text-purple-500" />
        </TooltipTrigger>
        <TooltipContent>
          {processing === "upscale" ? "Upscaling..." : "Upscale"}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 h-7 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 shrink-0 bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          onClick={handleRemoveBg}
          disabled={!!processing}
        >
          <Eraser className="size-4 text-teal-500" />
        </TooltipTrigger>
        <TooltipContent>
          {processing === "rembg" ? "Removing..." : "Remove BG"}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 h-7 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 shrink-0 bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          onClick={handleGenerateMask}
          disabled={!!processing}
        >
          <VenetianMask className="size-4 text-orange-500" />
        </TooltipTrigger>
        <TooltipContent>
          {processing === "mask" ? "Generating..." : "Gen Mask"}
        </TooltipContent>
      </Tooltip>

      {currentItem?.has_mask && (
        <Tooltip>
          <TooltipTrigger
            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 h-7 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 shrink-0 bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            onClick={() => setShowMask(!showMask)}
          >
            {showMask
              ? <EyeOff className="size-4 text-orange-500" />
              : <Eye className="size-4 text-orange-500" />
            }
          </TooltipTrigger>
          <TooltipContent>{showMask ? "Hide Mask" : "Show Mask"}</TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 h-7 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 shrink-0 bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          onClick={() => setHistoryOpen(true)}
        >
          <History className="size-4 text-blue-500" />
        </TooltipTrigger>
        <TooltipContent>Version History</TooltipContent>
      </Tooltip>

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
        <Tooltip>
          <TooltipTrigger
            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 h-7 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 shrink-0 bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            onClick={() => { setRenaming(true); setNewName(currentItem?.basename ?? ""); }}
          >
            <Pencil className="size-4" />
          </TooltipTrigger>
          <TooltipContent>Rename</TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 h-7 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 shrink-0 bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="size-4" />
        </TooltipTrigger>
        <TooltipContent>Delete</TooltipContent>
      </Tooltip>

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
        onRestored={onRefresh}
      />
    </div>
  );
}
