"use client";

import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export default function EmptyState({ title, description, icon: Icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon className="w-12 h-12 text-text-muted mb-4" />}
      <h3 className="text-lg font-medium text-text mb-1">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm">{description}</p>
    </div>
  );
}
