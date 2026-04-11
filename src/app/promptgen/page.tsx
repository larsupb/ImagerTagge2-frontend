"use client";

import { useState, useEffect } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/session";
import { api } from "@/lib/api";
import EmptyState from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Wand2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function PromptGenPage() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);

  const [captionTypes, setCaptionTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState("tags");
  const [exampleCount, setExampleCount] = useState(20);
  const [userPrompt, setUserPrompt] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!activeProjectId) return;
    api.getCaptionTypes().then(setCaptionTypes).catch(console.error);
  }, [activeProjectId]);

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={Wand2}
        title="No project open"
        description="Open a project to access PromptGen."
      />
    );
  }

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedPrompt("");
    try {
      const result = await api.generatePrompt(selectedType, exampleCount, userPrompt);
      setGeneratedPrompt(result.prompt);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate prompt");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedPrompt) return;
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-xl flex flex-col gap-6">
      <div className="bg-surface rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 className="w-5 h-5 text-text-secondary" />
          <h2 className="text-lg font-medium text-text">PromptGen</h2>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Caption Type</label>
            <Select value={selectedType} onValueChange={(v) => v && setSelectedType(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {captionTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Example Count
            </label>
            <Input
              type="number"
              min={5}
              max={100}
              value={exampleCount}
              onChange={(e) => setExampleCount(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">
              User Prompt (optional)
            </label>
            <Textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Additional instructions for the prompt..."
              rows={3}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedType}
          >
            <Wand2 className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate Prompt"}
          </Button>
        </div>
      </div>

      {generatedPrompt && (
        <div className="bg-surface rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-text-secondary">Generated Prompt</h3>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="w-4 h-4 mr-1" />
              ) : (
                <Copy className="w-4 h-4 mr-1" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-text whitespace-pre-wrap">{generatedPrompt}</p>
        </div>
      )}
    </div>
  );
}