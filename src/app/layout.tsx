import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/layout/QueryProvider";
import AppLayout from "@/components/layout/AppLayout";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "ImageTagger",
  description: "AI-powered image tagging and dataset management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <body className="antialiased">
        <QueryProvider>
          <TooltipProvider>
            <AppLayout>{children}</AppLayout>
          </TooltipProvider>
        </QueryProvider>
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
