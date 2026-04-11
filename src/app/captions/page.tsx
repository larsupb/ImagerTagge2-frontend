"use client";

import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const { data: captionTypes = [] } = useQuery({
    queryKey: ["captionTypes"],
    queryFn: () => api.getCaptionTypes(),
    enabled: !!datasetInfo,
  });

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

  if (captionTypes.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No caption types"
        description="Open an image in the editor and create a caption type to get started."
      />
    );
  }

  const currentTab = activeTab && captionTypes.includes(activeTab) ? activeTab : captionTypes[0];

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div className="flex gap-1 border-b border-border">
        {captionTypes.map((type) => (
          <button
            key={type}
            onClick={() => {
              setActiveTab(type);
              setSelectedTags([]);
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              type === currentTab
                ? "border-primary text-text"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <TagCloud
        key={currentTab}
        captionType={currentTab}
        onSelectedTagsChange={setSelectedTags}
      />
      <TagOperations
        key={`ops-${currentTab}`}
        captionType={currentTab}
        selectedTags={selectedTags}
      />
      <SearchReplace
        key={`sr-${currentTab}`}
        captionType={currentTab}
      />
    </div>
  );
}
