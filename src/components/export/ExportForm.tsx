"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getCurrentSessionId } from "@/lib/api";
import type { BucketResult, BatchTask } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Download,
  Grid3X3,
  BarChart3,
  Tag,
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
  return (
    <div className={`bg-surface rounded-lg border border-border p-4 transition-colors hover:border-border/80 ${checked ? "border-primary/30" : ""}`}>
      <div className="flex items-start gap-3">
        <Checkbox checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5" />
        <div className="flex flex-1 items-start gap-3">
          <div className="text-text-muted">{icon}</div>
          <div className="flex-1">
            <label className="text-sm font-medium cursor-pointer">
              {title}
            </label>
            <p className="text-xs text-text-muted mt-0.5">{description}</p>
          </div>
        </div>
      </div>
      {checked && children && (
        <div className="mt-4 pt-4 border-t border-border">{children}</div>
      )}
    </div>
  );
}

export default function ExportForm() {
  const [format, setFormat] = useState("standard");
  const [bucketResize, setBucketResize] = useState(false);
  const [resolution, setResolution] = useState(1024);
  const [step, setStep] = useState(128);
  const [maxSteps, setMaxSteps] = useState(2);
  const [isExporting, setIsExporting] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [captionType, setCaptionType] = useState("tags");
  const [logEntry, setLogEntry] = useState<{ index: number; total: number; filename: string; progress: number; log: string } | null>(null);
  const [bucketResult, setBucketResult] = useState<BucketResult | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const { data: allCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
  });

  useEffect(() => {
    const cats = new Set(allCategories);
    cats.add("Uncategorized");
    setSelectedCategories(cats);
  }, [allCategories]);

  const { data: datasetInfo } = useQuery({
    queryKey: ["datasetInfo"],
    queryFn: () => api.getDatasetInfo(),
  });

  const { data: captionTypes = [] } = useQuery({
    queryKey: ["captionTypes"],
    queryFn: () => api.getCaptionTypes(),
  });

  const { data: firstItem } = useQuery({
    queryKey: ["exportActiveCaptionType"],
    queryFn: () => api.getItem(0),
    enabled: captionTypes.length > 0,
  });

  useEffect(() => {
    if (firstItem?.captions && captionTypes.length > 0) {
      const active = firstItem.captions.find((c: { is_active: boolean }) => c.is_active);
      const defaultType = active?.caption_type ?? captionTypes[0] ?? "tags";
      setCaptionType(defaultType);
    }
  }, [firstItem, captionTypes]);

  const { data: task, isLoading: isPolling } = useQuery<BatchTask>({
    queryKey: ["exportTask", currentTaskId],
    queryFn: () => currentTaskId ? api.getExportStatus(currentTaskId) : Promise.resolve(null as unknown as BatchTask),
    enabled: !!currentTaskId,
    refetchInterval: 1000,
  });

  useEffect(() => {
    if (task) {
      if (task.logs && task.logs.length > 0) {
        const lastLog = task.logs[task.logs.length - 1];
        setLogEntry({
          index: lastLog.index,
          total: task.total,
          filename: lastLog.filename,
          progress: (lastLog.index + 1) / task.total,
          log: lastLog.message,
        });
      }
      if (task.status === "completed") {
        toast.success("Export completed");
        setIsExporting(false);
        handleDownload();
      } else if (task.status === "failed") {
        toast.error(task.error || "Export failed");
        setIsExporting(false);
        setCurrentTaskId(null);
      }
    }
  }, [task]);

  const handleExport = async () => {
    setIsExporting(true);
    setLogEntry(null);
    try {
      const result = await api.startExportTask({
        format,
        caption_type: captionType,
        bucket_resize: bucketResize,
        bucket_resolution: resolution,
        bucket_step: step,
        bucket_max_steps: maxSteps,
        categories: Array.from(selectedCategories),
      });
      setCurrentTaskId(result.task_id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start export");
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    if (!currentTaskId) return;
    try {
      const response = await fetch(`/api/export/download/${currentTaskId}`);
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dataset_export.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    }
  };

  const handleAnalyzeBuckets = async () => {
    try {
      const categories = Array.from(selectedCategories);
      const result = await api.analyzeBuckets(resolution, step, maxSteps, categories);
      setBucketResult(result);
      toast.success("Bucket analysis complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bucket analysis failed");
    }
  };

  const handleSelectAllCategories = () => {
    const cats = new Set(allCategories);
    cats.add("Uncategorized");
    setSelectedCategories(cats);
  };

  const handleDeselectAllCategories = () => {
    setSelectedCategories(new Set());
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-medium text-text">Export Dataset</h2>
        <p className="text-sm text-text-muted mt-1">Export your dataset to a standard format with optional bucket resizing.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <OperationCard
          icon={<Download className="w-5 h-5" />}
          title="Format"
          description="Select export format"
          checked={true}
          onCheckedChange={() => {}}
        >
          <div className="flex items-center gap-3">
            <label className="text-sm text-text-secondary">Export Format</label>
            <Select value={format} onValueChange={(v) => setFormat(v ?? "standard")}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="musubi_control">Musubi Control</SelectItem>
                <SelectItem value="musubi_control_json">Musubi Control JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </OperationCard>

        <OperationCard
          icon={<Tag className="w-5 h-5" />}
          title="Caption Type"
          description="Select which caption type to export"
          checked={true}
          onCheckedChange={() => {}}
        >
          <div className="flex items-center gap-3">
            <label className="text-sm text-text-secondary">Type</label>
            <Select
              value={captionType}
              onValueChange={(v) => setCaptionType(v ?? "tags")}
              disabled={captionTypes.length === 0}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder={captionTypes.length === 0 ? "No caption types available" : ""} />
              </SelectTrigger>
              <SelectContent>
                {captionTypes.map((type: string) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </OperationCard>

        <div className="bg-surface rounded-lg border border-border p-4">
          <div className="flex items-start gap-3">
            <div className="text-text-muted"><Tag className="w-5 h-5" /></div>
            <div className="flex-1">
              <label className="text-sm font-medium cursor-pointer">
                Categories
              </label>
              <p className="text-xs text-text-muted mt-0.5">Select which categories to export</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex flex-wrap gap-2">
              {[...allCategories, "Uncategorized"].map((cat) => (
                <label key={cat} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedCategories.has(cat)}
                    onCheckedChange={() => toggleCategory(cat)}
                  />
                  {cat}
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={handleSelectAllCategories}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAllCategories}>
                Deselect All
              </Button>
            </div>
          </div>
        </div>

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
              <Button variant="outline" size="sm" onClick={handleAnalyzeBuckets} disabled={isExporting}>
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
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="ml-auto"
        >
          <Download className="w-4 h-4 mr-1.5" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </div>

      {logEntry && (
        <div className="mt-4">
          <p className="text-sm text-text-secondary">
            Exporting {logEntry.index + 1} of {logEntry.total}: {logEntry.filename}
          </p>
          <div className="w-full bg-surface-raised rounded-full h-2 mt-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{ width: `${logEntry.progress * 100}%` }}
            />
          </div>
          {logEntry.log && (
            <p className="text-xs text-text-muted mt-2">{logEntry.log}</p>
          )}
        </div>
      )}
    </div>
  );
}