import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import DatasetHeader from "@/components/layout/DatasetHeader";
import { QueryProvider } from "@/components/layout/QueryProvider";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "ImageTagger",
  description: "AI-powered image tagging and dataset management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <body className="bg-zinc-950 text-white antialiased">
        <TooltipProvider>
          <QueryProvider>
            <div className="flex h-screen">
              <Sidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <DatasetHeader />
                <main className="flex-1 overflow-auto p-4">
                  {children}
                </main>
              </div>
            </div>
          </QueryProvider>
        </TooltipProvider>
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
