"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getCurrentSessionId } from "@/lib/api";
import type { BatchProgress, BucketResult, Upscaler, Tagger } from "@/lib/types";
import ProgressLog from "./ProgressLog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Type,
  ImagePlus,
  Grid3X3,
  Layers,
  FileText,
  ChevronDown,
  ChevronUp,
  Play,
  BarChart3,
} from "lucide-react";

interface OperationCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: React.ReactNode;
}

function OperationCard({ icon, title, description, checked, onCheckedChange, children }: OperationCardProps) {
  const [expanded, setExpanded] = useState(checked);

  const handleCheckedChange = (c: boolean) => {
    onCheckedChange(c);
    if (c) setExpanded(true);
  };

  return (
    <div className={`bg-surface rounded-lg border border-border p-4 transition-colors hover:border-border/80 ${checked ? "border-primary/30" : ""}`}>
      <div className="flex items-start gap-3">
        <Checkbox checked={checked} onCheckedChange={handleCheckedChange} className="mt-0.5" />
        <div className="flex flex-1 items-start gap-3">
          <div className="text-text-muted">{icon}</div>
          <div className="flex-1">
            <label className="text-sm font-medium cursor-pointer" onClick={() => setExpanded(!expanded)}>
              {title}
            </label>
            <p className="text-xs text-text-muted mt-0.5">{description}</p>
          </div>
          {checked && children && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-text-muted hover:text-text transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
      {checked && expanded && children && (
        <div className="mt-4 pt-4 border-t border-border">{children}</div>
      )}
    </div>
  );
}

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
  const [captionType, setCaptionType] = useState("tags");
  const [resolution, setResolution] = useState(1024);
  const [step, setStep] = useState(128);
  const [maxSteps, setMaxSteps] = useState(2);
  const [isRunning, setIsRunning] = useState(false);
  const [logEntries, setLogEntries] = useState<BatchProgress[]>([]);
  const [bucketResult, setBucketResult] = useState<BucketResult | null>(null);

  const { data: taggersResponse } = useQuery({
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
          "X-Session-ID": getCurrentSessionId() || "",
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
          caption_type: captionType,
          bucket_resolution: resolution,
          bucket_step: step,
          bucket_max_steps: maxSteps,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        const detail = error?.detail
          ? JSON.stringify(error.detail)
          : `Batch processing failed (${response.status})`;
        toast.error(detail);
        return;
      }

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
      toast.success("Batch processing completed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Batch processing failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handleAnalyzeBuckets = async () => {
    try {
      const result = await api.analyzeBuckets(resolution, step, maxSteps);
      setBucketResult(result);
      toast.success("Bucket analysis complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bucket analysis failed");
    }
  };

  const hasAnyOperation = rename || upscale || bucketResize || mask || caption;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-medium text-text">Batch Processing</h2>
        <p className="text-sm text-text-muted mt-1">Select operations to run on all images in the dataset.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <OperationCard
          icon={<Type className="w-5 h-5" />}
          title="Rename Files"
          description="Rename files using a 5-digit sequential pattern."
          checked={rename}
          onCheckedChange={setRename}
        >
          <div className="flex items-center gap-3">
            <label className="text-sm text-text-secondary">Offset</label>
            <Input
              type="number"
              value={renameOffset}
              onChange={(e) => setRenameOffset(Number(e.target.value))}
              min={0}
              max={99999}
              className="w-24"
            />
          </div>
        </OperationCard>

        <OperationCard
          icon={<ImagePlus className="w-5 h-5" />}
          title="Upscale"
          description="Upscale images using a selected upscaler model."
          checked={upscale}
          onCheckedChange={setUpscale}
        >
          <div className="flex items-center gap-3">
            <label className="text-sm text-text-secondary">Upscaler</label>
            <Select value={batchUpscaler} onValueChange={(v) => setBatchUpscaler(v ?? "")}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Default</SelectItem>
                {upscalers?.map((u: Upscaler) => (
                  <SelectItem key={u.name} value={u.name}>
                    {u.name} ({u.scale_factor}x)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </OperationCard>

        <OperationCard
          icon={<Grid3X3 className="w-5 h-5" />}
          title="Bucket Resize"
          description="Resize images to optimal bucket dimensions for training."
          checked={bucketResize}
          onCheckedChange={setBucketResize}
        >
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary">Base Res</label>
              <Select value={String(resolution)} onValueChange={(v) => setResolution(Number(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[512, 768, 1024, 1280, 1536, 1792, 2048].map((r) => (
                    <SelectItem key={r} value={String(r)}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary">Step</label>
              <Input
                type="number"
                value={step}
                onChange={(e) => setStep(Number(e.target.value))}
                min={64}
                max={512}
                step={64}
                className="w-20"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary">Max Steps</label>
              <Input
                type="number"
                value={maxSteps}
                onChange={(e) => setMaxSteps(Number(e.target.value))}
                min={1}
                max={4}
                className="w-16"
              />
            </div>
          </div>
        </OperationCard>

        <OperationCard
          icon={<Layers className="w-5 h-5" />}
          title="Generate Masks"
          description="Generate segmentation masks for all images."
          checked={mask}
          onCheckedChange={setMask}
        />

        <OperationCard
          icon={<FileText className="w-5 h-5" />}
          title="Generate Captions"
          description="Auto-generate captions using a tagging model."
          checked={caption}
          onCheckedChange={setCaption}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-text-secondary">Method</label>
              <Select value={tagger} onValueChange={(v) => setTagger(v ?? "joytag")}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taggersResponse?.taggers.map((t: Tagger) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                  <SelectItem value="unified">Unified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tagger === "unified" && (
              <Input
                value={unifiedCaption}
                onChange={(e) => setUnifiedCaption(e.target.value)}
                placeholder="Enter unified caption..."
              />
            )}
            <div className="flex items-center gap-3">
              <label className="text-sm text-text-secondary">Tag Type</label>
              <Input
                value={captionType}
                onChange={(e) => setCaptionType(e.target.value)}
                placeholder="tags"
                className="w-48"
              />
            </div>
          </div>
        </OperationCard>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={handleAnalyzeBuckets}
          disabled={isRunning}
        >
          <BarChart3 className="w-4 h-4 mr-1.5" />
          Analyze Buckets
        </Button>
        <Button
          onClick={handleStart}
          disabled={isRunning || !hasAnyOperation}
          className="ml-auto"
        >
          <Play className="w-4 h-4 mr-1.5" />
          {isRunning ? "Processing..." : "Run Batch"}
        </Button>
      </div>

      <ProgressLog entries={logEntries} isRunning={isRunning} />

      {bucketResult && (
        <div className="bg-surface rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium text-text mb-3">
            Bucket Analysis ({bucketResult.total_images} images)
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {bucketResult.buckets.map((b, i) => (
              <div key={i} className="bg-surface-raised rounded border border-border p-2 text-xs text-text-secondary">
                {b.width}×{b.height}: {b.count} images
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
