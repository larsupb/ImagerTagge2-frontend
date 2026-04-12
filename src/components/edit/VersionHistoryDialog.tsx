"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { History, RotateCcw, Trash2, Eye } from "lucide-react";
import type { ImageVersion } from "@/lib/types";
import { useSessionStore } from "@/stores/session";
import { useProjectStore } from "@/stores/projectStore";

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  index: number;
  onRestored: () => void;
}

export default function VersionHistoryDialog({
  open,
  onOpenChange,
  index,
  onRestored,
}: VersionHistoryDialogProps) {
  const queryClient = useQueryClient();
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const session = activeProjectId
    ? useSessionStore((s) => s.getProjectSession(activeProjectId))
    : null;
  const [previewVersion, setPreviewVersion] = useState<ImageVersion | null>(null);

  const { data: versions, isLoading } = useQuery({
    queryKey: ["versions", index],
    queryFn: () => api.getVersions(index),
    enabled: open && index >= 0,
  });

  const restoreMutation = useMutation({
    mutationFn: ({ versionId }: { versionId: number }) =>
      api.restoreVersion(versionId, index),
    onSuccess: () => {
      toast.success("Version restored");
      onOpenChange(false);
      onRestored();
      queryClient.invalidateQueries({ queryKey: ["versions", index] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ versionId }: { versionId: number }) =>
      api.deleteVersion(versionId),
    onSuccess: () => {
      toast.success("Version deleted");
      queryClient.invalidateQueries({ queryKey: ["versions", index] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    },
  });

  const previewUrl = previewVersion && activeProjectId
    ? api.getVersionImageUrl(previewVersion.id, activeProjectId)
    : null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Version History
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-text-muted py-4">Loading...</p>
          ) : !versions || versions.length === 0 ? (
            <p className="text-sm text-text-muted py-4">No versions available</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v: ImageVersion) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-2 rounded bg-surface-raised border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">
                      {v.operation}
                    </p>
                    <p className="text-xs text-text-muted">
                      {v.original_width && v.original_height
                        ? `${v.original_width}×${v.original_height}`
                        : "—"}
                      {" · "}
                      {new Date(v.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewVersion(v)}
                      title="Show"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => restoreMutation.mutate({ versionId: v.id })}
                      disabled={restoreMutation.isPending}
                      title="Restore"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate({ versionId: v.id })}
                      disabled={deleteMutation.isPending}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={!!previewVersion} onOpenChange={(open) => !open && setPreviewVersion(null)}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Version Preview
          </DialogTitle>
        </DialogHeader>
        {previewUrl ? (
          <div className="flex justify-center">
            <img
              src={previewUrl}
              alt={`Version ${previewVersion?.operation}`}
              className="max-w-full max-h-[75vh] object-contain rounded"
            />
          </div>
        ) : null}
        <div className="flex justify-between items-center">
          <p className="text-sm text-text-muted">
            {previewVersion?.original_width && previewVersion?.original_height
              ? `${previewVersion.original_width} × ${previewVersion.original_height}`
              : "—"}
            {" · "}
            {previewVersion ? new Date(previewVersion.created_at).toLocaleString() : ""}
          </p>
          <Button variant="outline" onClick={() => setPreviewVersion(null)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}