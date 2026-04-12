"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getCurrentSessionId } from "@/lib/api";
import type { BatchProgress, BucketResult, Upscaler, Tagger, ColorMatchPreviewItem, DatasetInfo, GalleryItem } from "@/lib/types";
import ProgressLog from "./ProgressLog";
import { HoverImage } from "@/components/shared/HoverImage";
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
  Palette,
  Eye,
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
  const [colorMatch, setColorMatch] = useState(false);
  const [colorMatchMethod, setColorMatchMethod] = useState("histogram");
  const [colorMatchReference, setColorMatchReference] = useState(0);
  const [colorMatchPreview, setColorMatchPreview] = useState<ColorMatchPreviewItem[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [colorMatchHistogram, setColorMatchHistogram] = useState<{ l: number[]; a: number[]; b: number[] } | null>(null);

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

  const { data: datasetInfo } = useQuery({
    queryKey: ["datasetInfo"],
    queryFn: () => api.getDatasetInfo(),
  });

  const { data: galleryItems } = useQuery({
    queryKey: ["galleryItems"],
    queryFn: () => api.getGallery(0, 100).then((r) => r.items),
  });

  useEffect(() => {
    if (colorMatch && colorMatchReference >= 0) {
      api.getHistogram(colorMatchReference)
        .then(setColorMatchHistogram)
        .catch(() => setColorMatchHistogram(null));
    } else {
      setColorMatchHistogram(null);
    }
  }, [colorMatch, colorMatchReference]);

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
          color_match: colorMatch,
          color_match_method: colorMatchMethod,
          color_match_reference: colorMatchReference,
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

  const handleColorMatchPreview = async () => {
    setIsPreviewing(true);
    setColorMatchPreview([]);
    try {
      const result = await api.previewColorMatch(colorMatchMethod, colorMatchReference, 4);
      setColorMatchPreview(result.previews);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setIsPreviewing(false);
    }
  };

  const hasAnyOperation = rename || upscale || bucketResize || mask || caption || colorMatch;

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
          <div className="flex flex-col gap-3">
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
            <div>
              <Button variant="outline" size="sm" onClick={handleAnalyzeBuckets} disabled={isRunning}>
                <BarChart3 className="w-4 h-4 mr-1.5" />
                Analyze Buckets
              </Button>
            </div>
            {bucketResult && (
              <div>
                <p className="text-xs text-text-muted mb-2">
                  Bucket Analysis ({bucketResult.total_images} images)
                </p>
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

        <OperationCard
          icon={<Palette className="w-5 h-5" />}
          title="Color Matching"
          description="Transfer color distribution from a reference image."
          checked={colorMatch}
          onCheckedChange={setColorMatch}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-text-secondary">Method</label>
              <Select value={colorMatchMethod} onValueChange={(v) => setColorMatchMethod(v ?? "histogram")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="histogram">LAB</SelectItem>
                  <SelectItem value="wavelet">Wavelet</SelectItem>
                  <SelectItem value="pca">PCA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-text-secondary">Reference</label>
              <Select
                value={String(colorMatchReference)}
                onValueChange={(v) => setColorMatchReference(Number(v) || 0)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select image" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: Math.min(datasetInfo?.total_items || 0, 100) }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {i} - {galleryItems?.[i]?.filename || `image_${i}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {colorMatchReference >= 0 && (
                <HoverImage
                  src={api.thumbnailUrl(colorMatchReference)}
                  alt="Reference"
                  previewSrc={api.mediaUrl(colorMatchReference)}
                  className="w-12 h-12 object-cover rounded border border-border"
                />
              )}
            </div>
            {colorMatchHistogram && (
              <div className="mt-2">
                <p className="text-xs text-text-muted mb-1">Reference LAB Histogram</p>
                <div className="flex gap-1 h-16">
                  <div className="flex-1 flex items-end gap-px">
                    {colorMatchHistogram.l.slice(0, 32).map((v, i) => (
                      <div
                        key={`l-${i}`}
                        className="flex-1 bg-gray-300"
                        style={{ height: `${(v / Math.max(...colorMatchHistogram.l)) * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex-1 flex items-end gap-px">
                    {colorMatchHistogram.a.slice(0, 32).map((v, i) => (
                      <div
                        key={`a-${i}`}
                        className="flex-1 bg-green-400"
                        style={{ height: `${(v / Math.max(...colorMatchHistogram.a.filter(x => x > 0), 1)) * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex-1 flex items-end gap-px">
                    {colorMatchHistogram.b.slice(0, 32).map((v, i) => (
                      <div
                        key={`b-${i}`}
                        className="flex-1 bg-blue-400"
                        style={{ height: `${(v / Math.max(...colorMatchHistogram.b.filter(x => x > 0), 1)) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 mt-1 text-xs text-text-muted">
                  <span className="flex-1 text-center">L</span>
                  <span className="flex-1 text-center">a</span>
                  <span className="flex-1 text-center">b</span>
                </div>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleColorMatchPreview}
              disabled={isPreviewing || !colorMatch}
            >
              <Eye className="w-4 h-4 mr-1.5" />
              {isPreviewing ? "Previewing..." : "Preview"}
            </Button>
            {colorMatchPreview.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-text-muted mb-2">Preview Results</p>
                <div className="grid grid-cols-4 gap-2">
                  {colorMatchPreview.map((preview) => (
                    <div key={preview.index} className="flex flex-col gap-1">
                      <div className="text-xs text-text-secondary truncate">{preview.filename}</div>
                      <div className="flex gap-0.5">
                        <HoverImage
                          src={`data:image/jpeg;base64,${preview.before}`}
                          alt="Before"
                          className="w-full h-16 object-cover rounded"
                        />
                        <HoverImage
                          src={`data:image/jpeg;base64,${preview.after}`}
                          alt="After"
                          className="w-full h-16 object-cover rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </OperationCard>
      </div>

      <div className="flex gap-3 pt-2">
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
    </div>
  );
}
