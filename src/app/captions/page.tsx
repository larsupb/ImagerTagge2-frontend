"use client";

import { useState } from "react";
import { useSessionStore } from "@/stores/session";
import TagCloud from "@/components/captions/TagCloud";
import TagOperations from "@/components/captions/TagOperations";
import SearchReplace from "@/components/captions/SearchReplace";

export default function CaptionsPage() {
  const { datasetInfo } = useSessionStore();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  if (!datasetInfo) {
    return <div className="text-zinc-500 text-center py-12">Load a dataset to manage captions</div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <TagCloud onSelectedTagsChange={setSelectedTags} />
      <TagOperations selectedTags={selectedTags} />
      <SearchReplace />
    </div>
  );
}
