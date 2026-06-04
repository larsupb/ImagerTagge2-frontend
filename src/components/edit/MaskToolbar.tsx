"use client";

import { Button } from "@/components/ui/button";
import type { PaintTool } from "@/lib/types";

interface MaskToolbarProps {
  tool: PaintTool;
  onToolChange: (t: PaintTool) => void;
  size: number;
  onSizeChange: (s: number) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
}

const SIZES = [4, 8, 16, 32] as const;

export default function MaskToolbar({
  tool,
  onToolChange,
  size,
  onSizeChange,
  onSave,
  onCancel,
  saving,
}: MaskToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-1 py-1 bg-surface rounded-lg border border-border">
      <div className="flex items-center gap-1">
        <span className="text-xs text-text-muted mr-1">Tool</span>
        {(["pencil", "quad", "eraser"] as PaintTool[]).map((t) => (
          <button
            type="button"
            key={t}
            aria-pressed={tool === t}
            onClick={() => onToolChange(t)}
            className={`px-2 py-1 text-xs rounded capitalize transition-colors ${
              tool === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-text-muted hover:bg-muted/80"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-border" />

      <div className="flex items-center gap-1">
        <span className="text-xs text-text-muted mr-1">Size</span>
        {SIZES.map((s) => (
          <button
            type="button"
            key={s}
            aria-pressed={size === s}
            onClick={() => onSizeChange(s)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              size === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-text-muted hover:bg-muted/80"
            }`}
          >
            {s}px
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Button size="xs" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button size="xs" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
