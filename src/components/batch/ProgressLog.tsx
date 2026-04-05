"use client";

import { useState } from "react";
import type { BatchProgress } from "@/lib/types";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { CheckCircle, Loader2, ChevronDown, ChevronUp, FileText } from "lucide-react";

interface ProgressLogProps {
  entries: BatchProgress[];
  isRunning: boolean;
}

export default function ProgressLog({ entries, isRunning }: ProgressLogProps) {
  const [showLog, setShowLog] = useState(true);
  const latest = entries[entries.length - 1];
  const progressPercent = latest ? Math.round(latest.progress * 100) : 0;
  const isComplete = entries.length > 0 && !isRunning && latest?.progress >= 1;

  if (entries.length === 0 && !isRunning) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {latest && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Progress value={progressPercent}>
              <ProgressTrack />
              <ProgressIndicator />
            </Progress>
          </div>
          <span className="text-xs text-text-muted min-w-[60px] text-right tabular-nums">
            {latest.index + 1} / {latest.total}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowLog(!showLog)}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text transition-colors"
        >
          {showLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Processing Log
        </button>
        {isComplete && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle className="w-4 h-4" />
            Complete
          </span>
        )}
        {isRunning && (
          <span className="flex items-center gap-1.5 text-sm text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </span>
        )}
      </div>

      {showLog && (
        <div className="h-64 overflow-y-auto bg-surface rounded-lg border border-border p-3 font-mono text-xs text-text-muted">
          {entries.map((entry, i) => (
            <div key={i} className="py-0.5">
              <span className="text-text-muted/60">[{entry.index + 1}/{entry.total}]</span>{" "}
              <span className="text-text-muted">{entry.filename}</span>{" "}
              {entry.log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
