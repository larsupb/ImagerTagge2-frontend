"use client";

import { useEffect } from "react";
import Sidebar from "./Sidebar";
import ProjectTabs from "./ProjectTabs";
import { useProjectStore } from "@/stores/projectStore";
import EmptyState from "@/components/shared/EmptyState";
import { FolderOpen } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { projects, loadActiveProjects, loadRecentProjects } = useProjectStore();

  useEffect(() => {
    loadActiveProjects();
    loadRecentProjects();
  }, []);

  const hasProjects = projects.length > 0;

  if (!hasProjects) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title="No projects open"
            description="Open a dataset to get started"
            icon={FolderOpen}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <ProjectTabs />
        <main className="flex-1 overflow-auto p-4 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
