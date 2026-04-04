import { create } from "zustand";
import type { DatasetInfo, MediaItem } from "@/lib/types";

interface SessionState {
  datasetInfo: DatasetInfo | null;
  currentIndex: number;
  currentItem: MediaItem | null;
  isLoading: boolean;
  error: string | null;

  setDatasetInfo: (info: DatasetInfo | null) => void;
  setCurrentIndex: (index: number) => void;
  setCurrentItem: (item: MediaItem | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  datasetInfo: null,
  currentIndex: 0,
  currentItem: null,
  isLoading: false,
  error: null,

  setDatasetInfo: (info) => set({ datasetInfo: info }),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setCurrentItem: (item) => set({ currentItem: item }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      datasetInfo: null,
      currentIndex: 0,
      currentItem: null,
      isLoading: false,
      error: null,
    }),
}));
