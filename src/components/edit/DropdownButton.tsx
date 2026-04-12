"use client";

import { ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DropdownButtonProps {
  icon: React.ReactNode;
  iconColor?: string;
  label: string;
  processingLabel?: string;
  processing?: boolean;
  currentValue: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
}

export default function DropdownButton({
  icon,
  iconColor = "text-foreground",
  label,
  processingLabel,
  processing = false,
  currentValue,
  options,
  onSelect,
}: DropdownButtonProps) {
  const currentOption = options.find((o) => o.value === currentValue);
  const tooltipText = processing ? (processingLabel || label) : `${label} (${currentOption?.label || currentValue})`;

  return (
    <div className="inline-flex items-center">
      <button
        title={tooltipText}
        className="inline-flex items-center justify-center rounded-l-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 h-7 gap-1 px-2 shrink-0 bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0"
        disabled={!!processing}
        onClick={() => onSelect(currentValue)}
      >
        <span className={iconColor}>{icon}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          title="More options"
          className="inline-flex items-center justify-center rounded-r-lg border border-l-0 border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 h-7 px-1.5 shrink-0 bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0"
          disabled={!!processing}
        >
          <ChevronDown className="size-3 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[140px]">
          <DropdownMenuItem
            onClick={() => onSelect(currentValue)}
            className="flex items-center justify-between gap-2"
          >
            <span>{currentOption?.label || currentValue}</span>
            <Check className="size-3" />
          </DropdownMenuItem>
          {options
            .filter((o) => o.value !== currentValue)
            .map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onSelect(option.value)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}