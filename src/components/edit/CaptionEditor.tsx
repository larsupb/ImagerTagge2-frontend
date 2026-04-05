"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { Tagger } from "@/lib/types";
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
  savedCaption: string;
  onCaptionChange: (caption: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  getUnsavedText?: (getter: () => string) => void;
}

export default function CaptionEditor({
  caption,
  index,
  savedCaption,
  onCaptionChange,
  onDirtyChange,
  getUnsavedText,
}: CaptionEditorProps) {
  const [text, setText] = useState(caption);
  const [tagger, setTagger] = useState("");
  const [generating, setGenerating] = useState(false);

  const { data: taggersResponse } = useQuery({
    queryKey: ["taggers"],
    queryFn: () => api.getTaggers(),
  });

  useEffect(() => {
    if (taggersResponse?.default_tagger && !tagger) {
      setTagger(taggersResponse.default_tagger);
    }
  }, [taggersResponse?.default_tagger, tagger]);

  useEffect(() => {
    setText(caption);
  }, [caption]);

  useEffect(() => {
    const dirty = text !== savedCaption;
    onDirtyChange?.(dirty);
  }, [text, savedCaption, onDirtyChange]);

  useEffect(() => {
    if (getUnsavedText) {
      getUnsavedText(() => text);
    }
  }, [getUnsavedText, text]);

  const handleSave = async () => {
    await api.saveCaption(index, text);
    onCaptionChange(text);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await api.generateCaption(index, tagger);
      setText(result.caption);
    } finally {
      setGenerating(false);
    }
  };

  const dirty = text !== savedCaption;

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
            {taggersResponse?.taggers.map((t: Tagger) => (
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
          variant={dirty ? "default" : "secondary"}
          onClick={handleSave}
          className={dirty ? "bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-500/40 ring-2 ring-orange-400/50" : ""}
        >
          Save Caption
          {dirty && <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-white/20 rounded-full">*</span>}
        </Button>
      </div>
    </div>
  );
}
