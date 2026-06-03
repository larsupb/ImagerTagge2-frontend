"use client";

import { Button } from "@/components/ui/button";

type PaintTool = "pencil" | "quad" | "eraser";

interface PaintToolbarProps {
  tool: PaintTool;
  onToolChange: (t: PaintTool) => void;
  size: number;
  onSizeChange: (s: number) => void;
  color: string;
  onColorChange: (c: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
}

const SIZES = [4, 8, 16, 32] as const;

const COLORS: { hex: string; label: string }[] = [
  { hex: "#ffffff", label: "White" },
  { hex: "#e63946", label: "Red" },
  { hex: "#2a9d8f", label: "Teal" },
  { hex: "#e9c46a", label: "Yellow" },
  { hex: "#457b9d", label: "Blue" },
  { hex: "#000000", label: "Black" },
];

export default function PaintToolbar({
  tool,
  onToolChange,
  size,
  onSizeChange,
  color,
  onColorChange,
  onSave,
  onCancel,
  saving,
}: PaintToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-1 py-1 bg-surface rounded-lg border border-border">
      <div className="flex items-center gap-1">
        <span className="text-xs text-text-muted mr-1">Tool</span>
        {(["pencil", "quad", "eraser"] as PaintTool[]).map((t) => (
          <button
            key={t}
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
            key={s}
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

      <div className="w-px h-4 bg-border" />

      <div className="flex items-center gap-1">
        <span className="text-xs text-text-muted mr-1">Color</span>
        {COLORS.map(({ hex, label }) => (
          <button
            key={hex}
            title={label}
            onClick={() => onColorChange(hex)}
            className="w-5 h-5 rounded-sm transition-transform hover:scale-110"
            style={{
              background: hex,
              border: color === hex ? "2px solid var(--primary)" : "1px solid var(--border)",
              opacity: tool === "eraser" ? 0.3 : 1,
            }}
          />
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
