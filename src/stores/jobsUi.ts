import { create } from "zustand";

interface JobsUiStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
}

export const useJobsUiStore = create<JobsUiStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setOpen: (isOpen) => set({ isOpen }),
}));
