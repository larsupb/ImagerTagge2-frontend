"use client";

import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/session";
import EmptyState from "@/components/shared/EmptyState";
import TagCloud from "@/components/captions/TagCloud";
import TagOperations from "@/components/captions/TagOperations";
import SearchReplace from "@/components/captions/SearchReplace";

export default function CaptionsPage() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const session = activeProjectId
    ? useSessionStore((s) => s.getProjectSession(activeProjectId))
    : undefined;
  const { datasetInfo } = session ?? {};
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No project open"
        description="Open a project to manage captions and tags."
      />
    );
  }

  if (!datasetInfo) {
    return <div className="text-text-muted text-center py-12">Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <TagCloud onSelectedTagsChange={setSelectedTags} />
      <TagOperations selectedTags={selectedTags} />
      <SearchReplace />
    </div>
  );
}
