"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import JobList from "./JobList";
import { useJobsUiStore } from "@/stores/jobsUi";

export default function JobsDialog() {
  const isOpen = useJobsUiStore((s) => s.isOpen);
  const setOpen = useJobsUiStore((s) => s.setOpen);

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Jobs</DialogTitle>
          <DialogDescription>
            Queued and running batch operations. Jobs run one at a time.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <JobList />
        </div>
      </DialogContent>
    </Dialog>
  );
}
