import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useProjectStore } from "@/stores/projectStore";

/**
 * The active caption/tag type, shared by every page.
 *
 * The backend session is the single source of truth: it is seeded from the
 * project config on open and written back on change, so the choice survives
 * both page navigation and a restart.
 */
export function useActiveTagType(captionTypes: string[] = []) {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["sessionSettings", activeProjectId],
    queryFn: () => api.getSessionSettings(),
    enabled: !!activeProjectId,
  });

  const stored = data?.active_tag_type ?? null;
  const activeTagType =
    stored && (captionTypes.length === 0 || captionTypes.includes(stored))
      ? stored
      : captionTypes[0] ?? null;

  const mutation = useMutation({
    mutationFn: (type: string) => api.setSessionSettings(type),
    onSuccess: (result) => {
      queryClient.setQueryData(["sessionSettings", activeProjectId], result);
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
    },
  });

  const setActiveTagType = useCallback(
    (type: string) => {
      if (!type || type === stored) return;
      mutation.mutate(type);
    },
    [mutation, stored]
  );

  return { activeTagType, setActiveTagType };
}
