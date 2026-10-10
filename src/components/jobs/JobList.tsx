"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  Loader2,
  Pause,
  Play,
  X,
  XCircle,
  ListChecks,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Job, JobStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

const ACTIVE_STATUSES: JobStatus[] = ["pending", "running", "paused"];

export function isActive(job: Job): boolean {
  return ACTIVE_STATUSES.includes(job.status);
}

const STATUS_STYLES: Record<JobStatus, { label: string; className: string }> = {
  pending: { label: "Queued", className: "bg-surface-raised text-text-muted" },
  running: { label: "Running", className: "bg-primary/10 text-primary" },
  paused: { label: "Paused", className: "bg-amber-500/10 text-amber-400" },
  completed: { label: "Completed", className: "bg-green-500/10 text-green-400" },
  failed: { label: "Failed", className: "bg-red-500/10 text-red-400" },
  cancelled: { label: "Cancelled", className: "bg-surface-raised text-text-muted" },
};

function StatusIcon({ status }: { status: JobStatus }) {
  if (status === "running") return <Loader2 className="w-4 h-4 animate-spin" />;
  if (status === "paused") return <Pause className="w-4 h-4" />;
  if (status === "pending") return <Clock className="w-4 h-4" />;
  if (status === "completed") return <CheckCircle className="w-4 h-4" />;
  return <XCircle className="w-4 h-4" />;
}

export function formatDuration(seconds: number): string {
  if (seconds < 0 || !Number.isFinite(seconds)) return "-";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Elapsed seconds: frozen once finished, live while the job is still going. */
export function elapsedSeconds(job: Job, now: number): number {
  if (!job.started_at) return 0;
  const start = new Date(job.started_at).getTime();
  const end = job.completed_at ? new Date(job.completed_at).getTime() : now;
  return (end - start) / 1000;
}

function JobRow({ job, now }: { job: Job; now: number }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["jobs"] });

  const pause = useMutation({
    mutationFn: () => api.pauseJob(job.task_id),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const resume = useMutation({
    mutationFn: () => api.resumeJob(job.task_id),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const cancel = useMutation({
    mutationFn: () => api.cancelJob(job.task_id),
    onSuccess: () => {
      invalidate();
      toast.success("Job cancelled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const style = STATUS_STYLES[job.status];
  const percent = Math.round(job.progress * 100);
  const done = Math.round(job.progress * job.total);
  const active = isActive(job);

  return (
    <li className="border border-border rounded-lg bg-surface overflow-hidden">
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-raised transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <button
          className="text-text-muted shrink-0"
          aria-label={expanded ? "Collapse log" : "Expand log"}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text truncate">{job.name}</span>
            {job.project_name && (
              <span className="text-xs text-text-muted truncate">
                {job.project_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1 max-w-xs">
              <Progress value={percent} />
            </div>
            <span className="text-xs text-text-muted tabular-nums shrink-0">
              {done} / {job.total}
            </span>
          </div>
        </div>

        <span
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs shrink-0 ${style.className}`}
        >
          <StatusIcon status={job.status} />
          {style.label}
        </span>

        <span className="text-xs text-text-muted tabular-nums w-16 text-right shrink-0">
          {job.started_at ? formatDuration(elapsedSeconds(job, now)) : "-"}
        </span>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {job.status === "running" && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              title="Pause"
              disabled={pause.isPending}
              onClick={() => pause.mutate()}
            >
              <Pause className="w-3.5 h-3.5" />
            </Button>
          )}
          {job.status === "paused" && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              title="Resume"
              disabled={resume.isPending}
              onClick={() => resume.mutate()}
            >
              <Play className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            title="Cancel"
            disabled={!active || cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border">
          {job.error && (
            <div className="px-3 py-2 text-xs text-red-400 border-b border-border">
              {job.error}
            </div>
          )}
          {job.logs.length === 0 ? (
            <div className="px-3 py-4 text-xs text-text-muted">
              {job.status === "pending" ? "Waiting to start." : "No log entries yet."}
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto p-3 font-mono text-xs text-text-muted">
              {job.logs.map((entry, i) => (
                <div key={i} className="py-0.5">
                  <span className="text-text-muted/60">[{i + 1}/{job.total}]</span>{" "}
                  <span className="text-text-muted">{entry.filename}</span>{" "}
                  {entry.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function JobList() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => api.listJobs(),
    refetchInterval: 1000,
  });

  const [now, setNow] = useState(() => Date.now());
  const hasActive = (jobs ?? []).some(isActive);

  useEffect(() => {
    if (!hasActive) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasActive]);

  if (isLoading) {
    return <div className="text-text-muted text-center py-12">Loading...</div>;
  }

  if (!jobs || jobs.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No jobs"
        description="Batch operations you start from the batch page or the browse context menu appear here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {jobs.map((job) => (
        <JobRow key={job.task_id} job={job} now={now} />
      ))}
    </ul>
  );
}
