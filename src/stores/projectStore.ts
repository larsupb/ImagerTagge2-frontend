import { create } from "zustand";
import type { Project, RecentProject, ProjectOpenResponse } from "@/lib/types";
import { api, setSessionId } from "@/lib/api";
import { useSessionStore } from "@/stores/session";

interface ProjectStore {
  projects: Project[];
  activeProjectId: string | null;
  recentProjects: RecentProject[];
  isLoading: boolean;

  openProject: (
    path: string,
    onlyMissing?: boolean,
    subdirs?: boolean
  ) => Promise<ProjectOpenResponse>;
  closeProject: (sessionId: string) => Promise<void>;
  switchProject: (sessionId: string) => void;
  loadActiveProjects: () => Promise<void>;
  loadRecentProjects: () => Promise<void>;
  removeRecentProject: (projectId: string) => Promise<void>;
  createProject: (path: string) => Promise<ProjectOpenResponse>;
  reset: () => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  activeProjectId: null,
  recentProjects: [],
  isLoading: false,

  openProject: async (path, onlyMissing, subdirs) => {
    const result = await api.openProject(path, onlyMissing, subdirs);
    const sessionId = result.session_id;
    setSessionId(sessionId);
    useSessionStore.getState().setDatasetInfo(sessionId, {
      total_items: result.dataset_info.total_items,
      base_dir: result.dataset_info.base_dir,
      masks_dir: result.dataset_info.masks_dir,
    });
    set((state) => ({
      projects: [
        ...state.projects,
        {
          session_id: sessionId,
          project_id: result.project_id,
          project_name: result.project_name,
          path: result.dataset_info.base_dir,
          total_items: result.dataset_info.total_items,
          current_index: 0,
          created_at: Date.now() / 1000,
          last_accessed: Date.now() / 1000,
        },
      ],
      activeProjectId: sessionId,
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
    setSessionId(sessionId);
    set({ activeProjectId: sessionId });
  },

  loadActiveProjects: async () => {
    const response = await api.getActiveProjects();
    const sessionStore = useSessionStore.getState();
    for (const project of response.projects) {
      sessionStore.setDatasetInfo(project.session_id, {
        total_items: project.total_items,
        base_dir: project.path,
        masks_dir: null,
      });
    }
    set({ projects: response.projects });
    if (response.projects.length > 0) {
      const first = response.projects[0].session_id;
      set({ activeProjectId: first });
      setSessionId(first);
    }
  },

  loadRecentProjects: async () => {
    const response = await api.getRecentProjects();
    set({ recentProjects: response.projects });
  },

  removeRecentProject: async (projectId) => {
    await api.removeRecentProject(projectId);
    set((state) => ({
      recentProjects: state.recentProjects.filter((p) => p.project_id !== projectId),
    }));
  },

  createProject: async (path) => {
    const result = await api.createProject(path);
    const sessionId = result.session_id;
    setSessionId(sessionId);
    useSessionStore.getState().setDatasetInfo(sessionId, {
      total_items: result.dataset_info.total_items,
      base_dir: result.dataset_info.base_dir,
      masks_dir: result.dataset_info.masks_dir,
    });
    set((state) => ({
      projects: [
        ...state.projects,
        {
          session_id: sessionId,
          project_id: result.project_id,
          project_name: result.project_name,
          path: result.dataset_info.base_dir,
          total_items: result.dataset_info.total_items,
          current_index: 0,
          created_at: Date.now() / 1000,
          last_accessed: Date.now() / 1000,
        },
      ],
      activeProjectId: sessionId,
    }));
    return result;
  },

  reset: () => {
    set({ projects: [], activeProjectId: null, recentProjects: [], isLoading: false });
  },
}));
