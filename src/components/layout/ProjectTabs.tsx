"use client";

import { useState } from "react";
import { FolderOpen, X, Plus } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ProjectTabs() {
  const { projects, activeProjectId, closeProject, switchProject, openProject } = useProjectStore();
  const [path, setPath] = useState("");
  const [showOpenDialog, setShowOpenDialog] = useState(false);

  const handleOpenProject = async () => {
    if (!path.trim()) return;
    try {
      const result = await openProject(path);
      toast.success(`Opened ${result.project_name}`);
      setPath("");
      setShowOpenDialog(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open project");
    }
  };

  const handleCloseProject = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await closeProject(sessionId);
      toast.success("Project closed");
    } catch {
      toast.error("Failed to close project");
    }
  };

  return (
    <div className="flex flex-col border-b border-border bg-surface">
      <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto">
        {projects.map((project) => {
          const isActive = project.session_id === activeProjectId;
          return (
            <div
              key={project.session_id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors max-w-48 ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-text-secondary hover:bg-surface-raised hover:text-text"
              }`}
              onClick={() => switchProject(project.session_id)}
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{project.project_name}</span>
              <button
                onClick={(e) => handleCloseProject(project.session_id, e)}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 shrink-0"
          onClick={() => setShowOpenDialog(!showOpenDialog)}
        >
          <Plus className="w-4 h-4" />
        </Button>
        {projects.length === 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 ml-2"
            onClick={() => setShowOpenDialog(!showOpenDialog)}
          >
            <FolderOpen className="w-4 h-4" />
            Open Project
          </Button>
        )}
      </div>
      {showOpenDialog && (
        <div className="flex items-center gap-2 px-2 pb-2">
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="Dataset path..."
            className="flex-1 px-3 py-1.5 bg-background border border-border rounded text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
            onKeyDown={(e) => e.key === "Enter" && handleOpenProject()}
          />
          <Button size="sm" onClick={handleOpenProject}>Open</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowOpenDialog(false)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}
