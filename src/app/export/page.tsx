"use client";

import { useProjectStore } from "@/store/projectStore";
import { useSessionStore } from "@/store/session";
import EmptyState from "@/components/shared/EmptyState";
import ExportForm from "@/components/export/ExportForm";
import { FolderOpen } from "lucide-react";

export default function ExportPage() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const session = activeProjectId
    ? useSessionStore((s) => s.getProjectSession(activeProjectId))
    : undefined;
  const { datasetInfo } = session ?? {};

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No project open"
        description="Open a project to export your dataset."
      />
    );
  }

  if (!datasetInfo) {
    return <div className="text-text-muted text-center py-12">Loading...</div>;
  }

  return <ExportForm />;
}