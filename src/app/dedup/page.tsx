"use client";

import { useProjectStore } from "@/stores/projectStore";
import EmptyState from "@/components/shared/EmptyState";
import DedupPage from "@/components/dedup/DedupPage";
import { ScanSearch } from "lucide-react";

export default function Page() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={ScanSearch}
        title="No project open"
        description="Open a project to find and remove duplicate images."
      />
    );
  }

  return <DedupPage />;
}
