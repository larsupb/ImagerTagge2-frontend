"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ListChecks } from "lucide-react";
import { api } from "@/lib/api";
import { isActive } from "./JobList";

export default function JobsIndicator() {
  const pathname = usePathname();
  const { data: jobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => api.listJobs(),
    refetchInterval: 2000,
  });

  const activeCount = (jobs ?? []).filter(isActive).length;
  const isCurrent = pathname.startsWith("/jobs");

  const label =
    activeCount > 0
      ? `${activeCount} active job${activeCount === 1 ? "" : "s"}`
      : "Jobs";

  return (
    <Link
      href="/jobs"
      title={label}
      aria-label={label}
      className={`relative flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
        isCurrent
          ? "bg-primary/10 text-primary"
          : "text-text-secondary hover:bg-surface-raised hover:text-text"
      }`}
    >
      <ListChecks className="w-4 h-4" />
      {activeCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-primary text-[10px] font-medium text-white tabular-nums">
          {activeCount}
        </span>
      )}
    </Link>
  );
}
