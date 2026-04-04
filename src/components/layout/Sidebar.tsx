"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/browse", label: "Browse", icon: "🖼" },
  { href: "/edit", label: "Edit", icon: "✏" },
  { href: "/captions", label: "Captions", icon: "💬" },
  { href: "/batch", label: "Batch", icon: "⚙" },
  { href: "/tools", label: "Tools", icon: "🔧" },
  { href: "/validation", label: "Validation", icon: "✓" },
  { href: "/settings", label: "Settings", icon: "⚡" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-48 shrink-0 border-r border-zinc-700 bg-zinc-900 flex flex-col">
      <div className="p-4 border-b border-zinc-700">
        <h1 className="text-lg font-bold text-white">ImageTagger</h1>
      </div>
      <ul className="flex-1 py-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-zinc-700 text-white font-medium"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
