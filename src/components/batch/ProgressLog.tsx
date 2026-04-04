"use client";

import type { BatchProgress } from "@/lib/types";

interface ProgressLogProps {
  entries: BatchProgress[];
  isRunning: boolean;
}

export default function ProgressLog({ entries, isRunning }: ProgressLogProps) {
  const latest = entries[entries.length - 1];
  const progressPercent = latest ? Math.round(latest.progress * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      {latest && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-zinc-800 rounded overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-zinc-400 min-w-[60px]">
            {latest.index + 1} / {latest.total}
          </span>
        </div>
      )}

      <div className="h-64 overflow-y-auto bg-zinc-900 rounded border border-zinc-700 p-2 font-mono text-xs text-zinc-300">
        {entries.map((entry, i) => (
          <div key={i} className="py-0.5">
            <span className="text-zinc-500">[{entry.index + 1}/{entry.total}]</span>{" "}
            <span className="text-zinc-400">{entry.filename}</span>{" "}
            {entry.log}
          </div>
        ))}
        {isRunning && <div className="text-blue-400 animate-pulse">Processing...</div>}
      </div>
    </div>
  );
}
