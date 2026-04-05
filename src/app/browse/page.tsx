"use client";

import GalleryGrid from "@/components/browse/GalleryGrid";
import EmptyState from "@/components/shared/EmptyState";
import { useProjectStore } from "@/stores/projectStore";
import { FolderOpen } from "lucide-react";

export default function BrowsePage() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No project open"
        description="Open a project to browse and manage your images."
      />
    );
  }

  return <GalleryGrid />;
}
