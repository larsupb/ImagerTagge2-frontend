"use client";

import { useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/session";
import { api } from "@/lib/api";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Progress, ProgressIndicator, ProgressTrack, ProgressValue } from "@/components/ui/progress";
import { FolderOpen, BarChart3 } from "lucide-react";
import { toast } from "sonner";

interface BucketEntry {
  width: number;
  height: number;
  count: number;
}

interface ValidationReport {
  buckets: BucketEntry[];
  total_images: number;
  summary: string;
}

export default function ValidationPage() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const session = activeProjectId
    ? useSessionStore((s) => s.getProjectSession(activeProjectId))
    : undefined;
  const { datasetInfo } = session ?? {};

  const [report, setReport] = useState<ValidationReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<number | null>(null);

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No project open"
        description="Open a project to validate dataset."
      />
    );
  }

  if (!datasetInfo) {
    return <div className="text-text-muted text-center py-12">Loading...</div>;
  }

  const handleValidate = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    try {
      const result = await api.validate();
      setAnalysisProgress(100);
      setReport(result as ValidationReport);
      toast.success("Validation complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setAnalysisProgress(null), 1000);
    }
  };

  const maxCount = report ? Math.max(...report.buckets.map((b) => b.count), 1) : 1;

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div className="bg-surface rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-text-secondary" />
          <h2 className="text-lg font-medium text-text">Dataset Validation</h2>
        </div>

        <Button onClick={handleValidate} disabled={isAnalyzing}>
          {isAnalyzing ? "Analyzing..." : "Run Validation"}
        </Button>

          {analysisProgress !== null && (
            <div className="mt-4">
              <Progress value={analysisProgress}>
                <ProgressTrack />
                <ProgressIndicator />
              </Progress>
            </div>
          )}
      </div>

      {report && (
        <div className="bg-surface rounded-lg border border-border p-6">
          <h3 className="text-sm font-medium text-text mb-1">
            Validation Report ({report.total_images} images)
          </h3>
          <p className="text-xs text-text-secondary mb-4">{report.summary}</p>

          <div className="mb-6">
            <h4 className="text-sm font-medium text-text mb-3">Resolution Distribution</h4>
            <div className="flex items-end gap-2 h-32">
              {report.buckets.map((b, i) => {
                const heightPct = (b.count / maxCount) * 100;
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center flex-1 min-w-0"
                  >
                    <span className="text-xs text-text-muted mb-1">{b.count}</span>
                    <div
                      className="w-full bg-primary rounded-t transition-all"
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                    <span className="text-xs text-text-muted mt-1 truncate w-full text-center">
                      {b.width}x{b.height}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {report.buckets.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-text mb-2">Recommendations</h4>
              <ul className="flex flex-col gap-1">
                {report.buckets.length > 3 && (
                  <li className="text-sm text-text-secondary">
                    Consider standardizing to fewer resolution buckets for training consistency
                  </li>
                )}
                {report.buckets.some((b) => b.width !== b.height) && (
                  <li className="text-sm text-text-secondary">
                    Non-square resolutions detected - verify your training pipeline supports them
                  </li>
                )}
                {report.buckets.every((b) => b.count < 10) && (
                  <li className="text-sm text-text-secondary">
                    Low image counts per bucket - consider adding more data
                  </li>
                )}
                {report.buckets.length <= 2 && (
                  <li className="text-sm text-text-secondary">
                    Good resolution consistency - dataset appears well-structured
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
