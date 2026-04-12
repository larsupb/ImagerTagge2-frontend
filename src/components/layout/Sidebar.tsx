"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Image,
  Pencil,
  Tags,
  Layers,
  Wrench,
  CheckCircle,
  Settings,
  Wand2,
  Download,
} from "lucide-react";

const navItems = [
  { href: "/browse", label: "Browse", icon: Image },
  { href: "/edit", label: "Edit", icon: Pencil },
  { href: "/captions", label: "Captions", icon: Tags },
  { href: "/batch", label: "Batch", icon: Layers },
  { href: "/export", label: "Export", icon: Download },
  { href: "/promptgen", label: "PromptGen", icon: Wand2 },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/validation", label: "Validation", icon: CheckCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-60 shrink-0 border-r border-border bg-surface flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold text-text">ImageTagger</h1>
      </div>
      <ul className="flex-1 py-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-text-secondary hover:text-text hover:bg-surface-raised"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
