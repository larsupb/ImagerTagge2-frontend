"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BatchProgress, BucketResult, Upscaler, Tagger } from "@/lib/types";
import ProgressLog from "./ProgressLog";

export default function BatchForm() {
  const [rename, setRename] = useState(false);
  const [renameOffset, setRenameOffset] = useState(0);
  const [upscale, setUpscale] = useState(false);
  const [batchUpscaler, setBatchUpscaler] = useState("");
  const [bucketResize, setBucketResize] = useState(false);
  const [mask, setMask] = useState(false);
  const [caption, setCaption] = useState(false);
  const [tagger, setTagger] = useState("joytag");
  const [unifiedCaption, setUnifiedCaption] = useState("");
  const [resolution, setResolution] = useState(1024);
  const [step, setStep] = useState(128);
  const [maxSteps, setMaxSteps] = useState(2);
  const [isRunning, setIsRunning] = useState(false);
  const [logEntries, setLogEntries] = useState<BatchProgress[]>([]);
  const [bucketResult, setBucketResult] = useState<BucketResult | null>(null);

  const { data: taggers } = useQuery({
    queryKey: ["taggers"],
    queryFn: () => api.getTaggers(),
  });

  const { data: upscalers } = useQuery({
    queryKey: ["upscalers"],
    queryFn: () => api.getUpscalers(),
  });

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
  });

  const handleStart = async () => {
    setIsRunning(true);
    setLogEntries([]);
    try {
      const response = await fetch("/api/batch/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rename,
          rename_offset: renameOffset,
          upscale,
          upscaler: batchUpscaler,
          bucket_resize: bucketResize,
          mask,
          caption,
          tagger,
          unified_caption: unifiedCaption,
          bucket_resolution: resolution,
          bucket_step: step,
          bucket_max_steps: maxSteps,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.index !== undefined) {
                  setLogEntries((prev) => [...prev, data as BatchProgress]);
                }
              } catch { /* ignore parse errors */ }
            }
          }
        }
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleAnalyzeBuckets = async () => {
    const result = await api.analyzeBuckets(resolution, step, maxSteps);
    setBucketResult(result);
  };

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <h2 className="text-lg font-medium">Batch Processing</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={rename} onChange={(e) => setRename(e.target.checked)} />
            Rename (5 digits)
          </label>
          {rename && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Offset</label>
              <input
                type="number"
                value={renameOffset}
                onChange={(e) => setRenameOffset(Number(e.target.value))}
                min={0}
                max={99999}
                className="w-24 px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-sm"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={upscale} onChange={(e) => setUpscale(e.target.checked)} />
            Upscale
          </label>
          {upscale && (
            <select
              value={batchUpscaler}
              onChange={(e) => setBatchUpscaler(e.target.value)}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-sm"
            >
              <option value="">Default</option>
              {upscalers?.map((u) => (
                <option key={u.name} value={u.name}>
                  {u.name} ({u.scale_factor}x)
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={bucketResize} onChange={(e) => setBucketResize(e.target.checked)} />
            Bucket Resize
          </label>
          {bucketResize && (
            <div className="flex gap-2">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Base Res</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-sm"
                >
                  {[512, 768, 1024, 1280, 1536, 1792, 2048].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Step</label>
                <input
                  type="number"
                  value={step}
                  onChange={(e) => setStep(Number(e.target.value))}
                  min={64}
                  max={512}
                  step={64}
                  className="w-20 px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Max Steps</label>
                <input
                  type="number"
                  value={maxSteps}
                  onChange={(e) => setMaxSteps(Number(e.target.value))}
                  min={1}
                  max={4}
                  className="w-16 px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={mask} onChange={(e) => setMask(e.target.checked)} />
            Generate Masks
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={caption} onChange={(e) => setCaption(e.target.checked)} />
          Generate Captions
        </label>
        {caption && (
          <div className="flex flex-col gap-2 ml-6">
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-400">Method:</label>
              <select
                value={tagger}
                onChange={(e) => setTagger(e.target.value)}
                className="px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-sm"
              >
                {taggers?.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
                <option value="unified">Unified</option>
              </select>
            </div>
            {tagger === "unified" && (
              <input
                value={unifiedCaption}
                onChange={(e) => setUnifiedCaption(e.target.value)}
                placeholder="Enter unified caption..."
                className="px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-sm text-white"
              />
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleAnalyzeBuckets}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm"
        >
          Analyze Buckets
        </button>
        <button
          onClick={handleStart}
          disabled={isRunning || (!rename && !upscale && !bucketResize && !mask && !caption)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium disabled:opacity-50"
        >
          {isRunning ? "Processing..." : "Start Batch"}
        </button>
      </div>

      <ProgressLog entries={logEntries} isRunning={isRunning} />

      {bucketResult && (
        <div className="bg-zinc-900 rounded border border-zinc-700 p-3">
          <h3 className="text-sm font-medium mb-2">Bucket Analysis ({bucketResult.total_images} images)</h3>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {bucketResult.buckets.map((b, i) => (
              <div key={i} className="bg-zinc-800 rounded p-2">
                {b.width}×{b.height}: {b.count} images
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
