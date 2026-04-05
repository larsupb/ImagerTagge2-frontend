"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import ProjectTabs from "./ProjectTabs";
import { useProjectStore } from "@/stores/projectStore";
import EmptyState from "@/components/shared/EmptyState";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { projects, loadActiveProjects, loadRecentProjects, openProject } = useProjectStore();
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [path, setPath] = useState("");

  useEffect(() => {
    loadActiveProjects();
    loadRecentProjects();
  }, []);

  const handleOpenProject = async () => {
    if (!path.trim()) return;
    try {
      const result = await openProject(path);
      toast.success(`Opened ${result.project_name}`);
      setPath("");
      setShowOpenForm(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open project");
    }
  };

  const hasProjects = projects.length > 0;

  if (!hasProjects) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <EmptyState
            title="No projects open"
            description="Open a dataset to get started"
            icon={FolderOpen}
          />
          <div className="flex flex-col items-center gap-2 mt-4 w-96">
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="Dataset path..."
              className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
              onKeyDown={(e) => e.key === "Enter" && handleOpenProject()}
            />
            <div className="flex gap-2">
              <Button onClick={handleOpenProject}>Open Project</Button>
              <Button variant="outline" onClick={() => setShowOpenForm(false)}>Cancel</Button>
            </div>
          </div>
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
