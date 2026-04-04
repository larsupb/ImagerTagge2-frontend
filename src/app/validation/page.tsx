"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";

export default function ValidationPage() {
  const { datasetInfo } = useSessionStore();
  const [report, setReport] = useState<{ buckets: Array<{ width: number; height: number; count: number }>; total_images: number; summary: string } | null>(null);

  if (!datasetInfo) {
    return <div className="text-zinc-500 text-center py-12">Load a dataset to validate</div>;
  }

  const handleValidate = async () => {
    const result = await api.validate();
    setReport(result as typeof report);
  };

  return (
    <div className="max-w-2xl flex flex-col gap-4">
      <button onClick={handleValidate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium w-fit">
        Run Validation
      </button>

      {report && (
        <div className="bg-zinc-900 rounded border border-zinc-700 p-4">
          <h3 className="text-sm font-medium mb-2">Validation Report ({report.total_images} images)</h3>
          <p className="text-xs text-zinc-400 mb-3">{report.summary}</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {report.buckets.map((b, i) => (
              <div key={i} className="bg-zinc-800 rounded p-2">
                {b.width}×{b.height}: {b.count}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
