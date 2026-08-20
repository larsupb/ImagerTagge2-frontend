"use client";

import JobList from "@/components/jobs/JobList";

export default function JobsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text">Jobs</h2>
        <p className="text-sm text-text-muted">
          Queued and running batch operations. Jobs run one at a time.
        </p>
      </div>
      <JobList />
    </div>
  );
}
