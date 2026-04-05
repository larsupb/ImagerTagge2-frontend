"use client";

import { useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/session";
import { api } from "@/lib/api";
import EmptyState from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress, ProgressIndicator, ProgressTrack, ProgressValue } from "@/components/ui/progress";
import { FolderOpen, Copy } from "lucide-react";
import { toast } from "sonner";

export default function ToolsPage() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const session = activeProjectId
    ? useSessionStore((s) => s.getProjectSession(activeProjectId))
    : undefined;
  const { datasetInfo } = session ?? {};

  const [targetDir, setTargetDir] = useState("");
  const [scope, setScope] = useState("all");
  const [isCopying, setIsCopying] = useState(false);
  const [copyProgress, setCopyProgress] = useState<number | null>(null);

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No project open"
        description="Open a project to access tools."
      />
    );
  }

  if (!datasetInfo) {
    return <div className="text-text-muted text-center py-12">Loading...</div>;
  }

  const handleCopy = async () => {
    if (!targetDir.trim()) {
      toast.error("Please enter a target directory");
      return;
    }
    setIsCopying(true);
    setCopyProgress(0);
    try {
      const result = await api.copyImages(targetDir, scope);
      const copied = (result as { copied: number }).copied;
      setCopyProgress(100);
      toast.success(`Copied ${copied} images to ${targetDir}`);
      setTargetDir("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to copy images");
    } finally {
      setIsCopying(false);
      setTimeout(() => setCopyProgress(null), 1000);
    }
  };

  return (
    <div className="max-w-xl flex flex-col gap-6">
      <div className="bg-surface rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Copy className="w-5 h-5 text-text-secondary" />
          <h2 className="text-lg font-medium text-text">Copy Images</h2>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Target Directory</label>
            <Input
              value={targetDir}
              onChange={(e) => setTargetDir(e.target.value)}
              placeholder="/path/to/target..."
              disabled={isCopying}
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Scope</label>
          <Select value={scope} onValueChange={(v) => v && setScope(v)} disabled={isCopying}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All images</SelectItem>
              <SelectItem value="bookmarks">Bookmarked only</SelectItem>
            </SelectContent>
          </Select>
          </div>

          <Button onClick={handleCopy} disabled={isCopying || !targetDir.trim()}>
            {isCopying ? "Copying..." : "Copy Images"}
          </Button>

          {copyProgress !== null && (
            <Progress value={copyProgress}>
              <ProgressTrack />
              <ProgressIndicator />
            </Progress>
          )}
        </div>
      </div>
    </div>
  );
}
