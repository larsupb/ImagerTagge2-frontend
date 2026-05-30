"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import ProjectTabs from "./ProjectTabs";
import { useProjectStore } from "@/stores/projectStore";
import EmptyState from "@/components/shared/EmptyState";
import { FolderOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { projects, recentProjects, loadActiveProjects, loadRecentProjects, openProject, removeRecentProject, createProject } = useProjectStore();
  const [path, setPath] = useState("");

  useEffect(() => {
    loadActiveProjects();
    loadRecentProjects();
  }, []);

  const handleOpenRecent = async (project: typeof recentProjects[0]) => {
    try {
      const result = await openProject(project.path);
toast.success(`Opened ${result.project_name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open project");
    }
  };

  const handleOpenProject = async () => {
    if (!path.trim()) return;
    try {
      const result = await openProject(path);
      toast.success(`Opened ${result.project_name}`);
      setPath("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open project");
    }
  };

  const handleCreateProject = async () => {
    if (!path.trim()) return;
    try {
      const result = await createProject(path);
      toast.success(`Created ${result.project_name}`);
      setPath("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create project");
    }
  };

  const hasProjects = projects.length > 0;

  if (!hasProjects) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
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
              <Button
                onClick={handleCreateProject}
                variant="outline"
                className="border-green-700 text-green-400 hover:border-green-500 hover:text-green-300 hover:bg-green-950"
              >
                Create Project
              </Button>
            </div>
          </div>
          {recentProjects.length > 0 && (
            <div className="mt-8 w-full max-w-md">
              <h3 className="text-sm font-medium text-text-secondary mb-3">Recent Datasets</h3>
              <ul className="space-y-2">
                {recentProjects.map((p) => (
                  <li key={p.project_id} className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenRecent(p)}
                      className="flex-1 text-left px-3 py-2 bg-surface border border-border rounded hover:border-primary transition-colors min-w-0"
                    >
                      <div className="text-sm font-medium text-text">{p.name}</div>
                      <div className="text-xs text-text-muted truncate">{p.path}</div>
                    </button>
                    <button
                      onClick={() => removeRecentProject(p.project_id)}
                      className="p-1 text-text-muted hover:text-text transition-colors flex-shrink-0"
                      title="Remove from history"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
