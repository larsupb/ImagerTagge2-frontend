"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface CaptionEditorProps {
  caption: string;
  index: number;
  onCaptionChange: (caption: string) => void;
}

export default function CaptionEditor({ caption, index, onCaptionChange }: CaptionEditorProps) {
  const [text, setText] = useState(caption);
  const [tagger, setTagger] = useState("florence");
  const [generating, setGenerating] = useState(false);

  const { data: taggers } = useQuery({
    queryKey: ["taggers"],
    queryFn: () => api.getTaggers(),
  });

  useEffect(() => {
    setText(caption);
  }, [caption]);

  const handleSave = async () => {
    await api.saveCaption(index, text);
    onCaptionChange(text);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await api.generateCaption(index, tagger);
      setText(result.caption);
      onCaptionChange(result.caption);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-surface rounded-lg border border-border p-4 flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text resize-y focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 placeholder:text-text-muted"
        placeholder="Caption text..."
      />

      <div className="flex items-center gap-2">
        <Select value={tagger} onValueChange={(value) => value && setTagger(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {taggers?.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
          {generating ? "Generating..." : "Generate"}
        </Button>

        <Button
          variant="secondary"
          onClick={handleSave}
        >
          Save Caption
        </Button>
      </div>
    </div>
  );
}
