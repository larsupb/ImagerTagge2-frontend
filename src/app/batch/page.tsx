"use client";

import { useSessionStore } from "@/stores/session";
import BatchForm from "@/components/batch/BatchForm";

export default function BatchPage() {
  const { datasetInfo } = useSessionStore();

  if (!datasetInfo) {
    return <div className="text-zinc-500 text-center py-12">Load a dataset for batch processing</div>;
  }

  return <BatchForm />;
}
