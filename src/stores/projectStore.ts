import { create } from "zustand";
import type { Project, RecentProject, ProjectOpenResponse } from "@/lib/types";
import { api } from "@/lib/api";

interface ProjectStore {
  projects: Project[];
  activeProjectId: string | null;
  recentProjects: RecentProject[];
  isLoading: boolean;

  openProject: (
    path: string,
    masksPath?: string,
    onlyMissing?: boolean,
    subdirs?: boolean
  ) => Promise<ProjectOpenResponse>;
  closeProject: (sessionId: string) => Promise<void>;
  switchProject: (sessionId: string) => void;
  loadActiveProjects: () => Promise<void>;
  loadRecentProjects: () => Promise<void>;
  reset: () => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  activeProjectId: null,
  recentProjects: [],
  isLoading: false,

  openProject: async (path, masksPath, onlyMissing, subdirs) => {
    const result = await api.openProject(path, masksPath, onlyMissing, subdirs);
    set((state) => ({
      projects: [
        ...state.projects,
        {
          session_id: result.session_id,
          project_id: result.project_id,
          project_name: result.project_name,
          path: result.dataset_info.base_dir,
          total_items: result.dataset_info.total_items,
          current_index: 0,
          created_at: Date.now() / 1000,
          last_accessed: Date.now() / 1000,
        },
      ],
      activeProjectId: result.session_id,
    }));
    return result;
  },

  closeProject: async (sessionId) => {
    await api.closeProject(sessionId);
    set((state) => {
      const remaining = state.projects.filter((p) => p.session_id !== sessionId);
      return {
        projects: remaining,
        activeProjectId:
          state.activeProjectId === sessionId
            ? remaining.length > 0
              ? remaining[remaining.length - 1].session_id
              : null
            : state.activeProjectId,
      };
    });
  },

  switchProject: (sessionId) => {
    set({ activeProjectId: sessionId });
  },

  loadActiveProjects: async () => {
    const response = await api.getActiveProjects();
    set({ projects: response.projects });
    if (response.projects.length > 0) {
      set({ activeProjectId: response.projects[0].session_id });
    }
  },

  loadRecentProjects: async () => {
    const response = await api.getRecentProjects();
    set({ recentProjects: response.projects });
  },

  reset: () => {
    set({ projects: [], activeProjectId: null, recentProjects: [], isLoading: false });
  },
}));
