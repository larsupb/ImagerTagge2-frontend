"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { scanForDuplicates, removeDuplicates, getThumbnailUrl } from "@/lib/api";
import type { DedupGroup } from "@/lib/types";

type Phase = "idle" | "scanning" | "reviewing" | "done";

interface DoneInfo {
  deleted: number;
  groupCount: number;
}

export default function DedupPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [phashThreshold, setPhashThreshold] = useState(10);
  const [ssimThreshold, setSsimThreshold] = useState(0.85);
  const [groups, setGroups] = useState<DedupGroup[]>([]);
  const [keepSelections, setKeepSelections] = useState<number[]>([]);
  const [doneInfo, setDoneInfo] = useState<DoneInfo | null>(null);

  const handleScan = async () => {
    setPhase("scanning");
    try {
      const result = await scanForDuplicates(phashThreshold, ssimThreshold);
      setGroups(result.groups);
      setKeepSelections(result.groups.map((g) => g.keep_index));
      if (result.groups.length === 0) {
        setDoneInfo({ deleted: 0, groupCount: 0 });
        setPhase("done");
      } else {
        setPhase("reviewing");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed");
      setPhase("idle");
    }
  };

  const handleKeepSelect = (groupIdx: number, imageIdx: number) => {
    setKeepSelections((prev) => {
      const next = [...prev];
      next[groupIdx] = imageIdx;
      return next;
    });
  };

  const handleDelete = async () => {
    const paths: string[] = [];
    groups.forEach((group, groupIdx) => {
      group.images.forEach((img, imgIdx) => {
        if (imgIdx !== keepSelections[groupIdx]) {
          paths.push(img.path);
        }
      });
    });

    try {
      const result = await removeDuplicates(paths);
      setDoneInfo({ deleted: result.deleted, groupCount: groups.length });
      setPhase("done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const deleteCount = groups.reduce(
    (sum, group) => sum + group.images.length - 1,
    0
  );

  if (phase === "idle" || phase === "scanning") {
    return (
      <div className="p-6 flex flex-col gap-6 max-w-2xl">
        <h1 className="text-xl font-semibold text-text">Find Duplicates</h1>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              pHash distance threshold
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={20}
                value={phashThreshold}
                onChange={(e) => setPhashThreshold(Number(e.target.value))}
                disabled={phase === "scanning"}
                className="w-48 accent-primary"
              />
              <span className="text-sm font-semibold w-4 text-text">{phashThreshold}</span>
              <span className="text-xs text-text-muted">0 = exact copy, 20 = loose</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              SSIM confirmation threshold
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={50}
                max={99}
                value={Math.round(ssimThreshold * 100)}
                onChange={(e) => setSsimThreshold(Number(e.target.value) / 100)}
                disabled={phase === "scanning"}
                className="w-48 accent-primary"
              />
              <span className="text-sm font-semibold w-12 text-text">
                {ssimThreshold.toFixed(2)}
              </span>
              <span className="text-xs text-text-muted">higher = stricter</span>
            </div>
          </div>
        </div>

        {phase === "scanning" ? (
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Scanning...</span>
          </div>
        ) : (
          <button
            onClick={handleScan}
            className="w-fit px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Scan Dataset
          </button>
        )}
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="p-6 flex flex-col gap-4 max-w-2xl">
        <h1 className="text-xl font-semibold text-text">Done</h1>
        {doneInfo && (
          <>
            <p className="text-text-secondary text-sm">
              {doneInfo.groupCount === 0
                ? "No duplicate groups found."
                : `${doneInfo.deleted} images deleted from ${doneInfo.groupCount} groups.`}
            </p>
            <a
              href="/browse"
              className="w-fit px-4 py-2 bg-surface-raised rounded-md text-sm hover:bg-surface-border transition-colors text-text"
            >
              Back to Browse
            </a>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto">
        <h1 className="text-xl font-semibold text-text">Review Duplicates</h1>
        <p className="text-sm text-text-secondary">
          Found {groups.length} duplicate {groups.length === 1 ? "group" : "groups"}. Click the
          image to keep in each group — the rest will be deleted.
        </p>

        <div className="flex flex-col gap-4 max-w-4xl">
          {groups.map((group, groupIdx) => (
            <div key={groupIdx} className="border border-border rounded-lg p-4">
              <p className="text-xs text-text-muted mb-3">
                GROUP {groupIdx + 1} OF {groups.length} — {group.images.length} images
              </p>
              <div className="flex gap-3 flex-wrap">
                {group.images.map((img, imgIdx) => {
                  const isKeep = keepSelections[groupIdx] === imgIdx;
                  return (
                    <div
                      key={imgIdx}
                      onClick={() => handleKeepSelect(groupIdx, imgIdx)}
                      className="flex flex-col gap-1 items-center cursor-pointer"
                    >
                      <div
                        className={`relative w-28 h-28 rounded overflow-hidden border-2 transition-colors ${
                          isKeep ? "border-green-500" : "border-border hover:border-border-hover"
                        }`}
                      >
                        <img
                          src={getThumbnailUrl(img.index)}
                          alt={img.filename}
                          className="w-full h-full object-cover"
                        />
                        <div
                          className={`absolute bottom-1 left-1 text-xs px-1 rounded font-medium ${
                            isKeep ? "bg-green-500 text-black" : "bg-red-600/80 text-white"
                          }`}
                        >
                          {isKeep ? "KEEP" : "DELETE"}
                        </div>
                      </div>
                      <span className="text-xs text-text-muted">
                        {img.width && img.height
                          ? `${img.width}×${img.height}`
                          : img.filename}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-red-500/20 bg-background/95 backdrop-blur-sm p-4 flex items-center justify-between">
        <span className="text-sm text-text">
          <strong>{deleteCount}</strong> images marked for deletion
        </span>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          disabled={deleteCount === 0}
        >
          Delete {deleteCount} Images
        </button>
      </div>
    </div>
  );
}
