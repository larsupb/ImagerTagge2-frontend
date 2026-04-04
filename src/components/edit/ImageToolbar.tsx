"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useSessionStore } from "@/stores/session";

interface ImageToolbarProps {
  index: number;
  onRefresh: () => void;
}

export default function ImageToolbar({ index, onRefresh }: ImageToolbarProps) {
  const { currentItem, datasetInfo } = useSessionStore();
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");

  const handleUpscale = async () => {
    setProcessing("upscale");
    try {
      await api.upscale(index);
      await api.saveUpscaled(index);
      onRefresh();
    } finally {
      setProcessing(null);
    }
  };

  const handleRemoveBg = async () => {
    setProcessing("rembg");
    try {
      await api.removeBackground(index);
      onRefresh();
    } finally {
      setProcessing(null);
    }
  };

  const handleGenerateMask = async () => {
    setProcessing("mask");
    try {
      await api.generateMask(index);
      onRefresh();
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
      <span className="text-xs text-zinc-400 mr-2">
        {currentItem?.filename}
        {currentItem?.width && ` — ${currentItem.width}×${currentItem.height}`}
        {currentItem?.file_size && ` — ${(currentItem.file_size / 1024).toFixed(0)}KB`}
      </span>

      <button
        onClick={handleUpscale}
        disabled={!!processing}
        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs disabled:opacity-50"
      >
        {processing === "upscale" ? "Upscaling..." : "Upscale"}
      </button>
      <button
        onClick={handleRemoveBg}
        disabled={!!processing}
        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 rounded text-xs disabled:opacity-50"
      >
        {processing === "rembg" ? "Removing..." : "Remove BG"}
      </button>
      <button
        onClick={handleGenerateMask}
        disabled={!!processing}
        className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-xs disabled:opacity-50"
      >
        {processing === "mask" ? "Generating..." : "Gen Mask"}
      </button>

      <div className="flex-1" />

      {renaming ? (
        <div className="flex gap-1">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-32 px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-xs text-white"
            placeholder="New name"
          />
          <button onClick={handleRename} className="px-2 py-1 bg-blue-600 rounded text-xs">OK</button>
          <button onClick={() => setRenaming(false)} className="px-2 py-1 bg-zinc-700 rounded text-xs">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => { setRenaming(true); setNewName(currentItem?.basename ?? ""); }}
          className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs"
        >
          Rename
        </button>
      )}

      <button
        onClick={() => setConfirmDelete(true)}
        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
      >
        Delete
      </button>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Image"
        message={`Delete ${currentItem?.filename}? This also removes its caption and mask.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
