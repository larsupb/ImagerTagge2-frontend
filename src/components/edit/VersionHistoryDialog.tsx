"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { History, RotateCcw, Trash2 } from "lucide-react";
import type { ImageVersion } from "@/lib/types";

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

  return (
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
  );
}