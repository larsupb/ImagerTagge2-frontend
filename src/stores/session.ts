import { create } from "zustand";
import type { DatasetInfo, MediaItem } from "@/lib/types";

interface PerProjectSession {
  datasetInfo: DatasetInfo | null;
  currentIndex: number;
  currentItem: MediaItem | null;
  isLoading: boolean;
  error: string | null;
}

interface SessionState {
  sessions: Map<string, PerProjectSession>;

  getProjectSession: (projectId: string) => PerProjectSession;
  setDatasetInfo: (projectId: string, info: DatasetInfo | null) => void;
  setCurrentIndex: (projectId: string, index: number) => void;
  setCurrentItem: (projectId: string, item: MediaItem | null) => void;
  setLoading: (projectId: string, loading: boolean) => void;
  setError: (projectId: string, error: string | null) => void;
  clearProjectSession: (projectId: string) => void;
}

const defaultSession = (): PerProjectSession => ({
  datasetInfo: null,
  currentIndex: 0,
  currentItem: null,
  isLoading: false,
  error: null,
});

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: new Map(),

  getProjectSession: (projectId) => {
    const state = get();
    if (!state.sessions.has(projectId)) {
      set((s) => {
        const next = new Map(s.sessions);
        next.set(projectId, defaultSession());
        return { sessions: next };
      });
      return defaultSession();
    }
    return state.sessions.get(projectId)!;
  },

  setDatasetInfo: (projectId, info) =>
    set((state) => {
      const next = new Map(state.sessions);
      const session = next.get(projectId) || defaultSession();
      next.set(projectId, { ...session, datasetInfo: info });
      return { sessions: next };
    }),

  setCurrentIndex: (projectId, index) =>
    set((state) => {
      const next = new Map(state.sessions);
      const session = next.get(projectId) || defaultSession();
      next.set(projectId, { ...session, currentIndex: index });
      return { sessions: next };
    }),

  setCurrentItem: (projectId, item) =>
    set((state) => {
      const next = new Map(state.sessions);
      const session = next.get(projectId) || defaultSession();
      next.set(projectId, { ...session, currentItem: item });
      return { sessions: next };
    }),

  setLoading: (projectId, loading) =>
    set((state) => {
      const next = new Map(state.sessions);
      const session = next.get(projectId) || defaultSession();
      next.set(projectId, { ...session, isLoading: loading });
      return { sessions: next };
    }),

  setError: (projectId, error) =>
    set((state) => {
      const next = new Map(state.sessions);
      const session = next.get(projectId) || defaultSession();
      next.set(projectId, { ...session, error });
      return { sessions: next };
    }),

  clearProjectSession: (projectId) =>
    set((state) => {
      const next = new Map(state.sessions);
      next.delete(projectId);
      return { sessions: next };
    }),
}));
