"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { Tagger, CaptionEntry } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Loader2, Plus } from "lucide-react";

interface CaptionEditorProps {
  caption: string;
  index: number;
  savedCaption: string;
  captions: CaptionEntry[];
  onCaptionChange: (caption: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  getUnsavedText?: (getter: () => string) => void;
}

export default function CaptionEditor({
  caption,
  index,
  savedCaption,
  captions = [],
  onCaptionChange,
  onDirtyChange,
  getUnsavedText,
}: CaptionEditorProps) {
  const [text, setText] = useState(caption);
  const [savedContent, setSavedContent] = useState<Record<string, string>>({});
  const [tagger, setTagger] = useState("");
  const [generating, setGenerating] = useState(false);
  const [activeType, setActiveType] = useState("tag");
  const [newTypeInput, setNewTypeInput] = useState("");
  const [newTypeOpen, setNewTypeOpen] = useState(false);

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
    if (!captions || captions.length === 0) {
      setText(caption);
    }
  }, [caption, captions]);

  const dirty = captions && captions.length > 0
    ? text !== (savedContent[activeType] ?? "")
    : text !== savedCaption;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (getUnsavedText) {
      getUnsavedText(() => text);
    }
  }, [getUnsavedText, text]);

  useEffect(() => {
    if (captions && captions.length > 0) {
      const map: Record<string, string> = {};
      for (const c of captions) {
        map[c.caption_type] = c.content ?? "";
      }
      setSavedContent(map);
      const currentTypeExists = captions.some((c) => c.caption_type === activeType);
      if (!currentTypeExists) {
        const active = captions.find((c) => c.is_active);
        setActiveType(active?.caption_type ?? captions[0]?.caption_type ?? "")
      }
    } else {
      setSavedContent({});
      setActiveType("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captions]);

  useEffect(() => {
    if (captions) {
      const entry = captions.find((c) => c.caption_type === activeType);
      setText(entry?.content ?? "");
    }
  }, [captions, activeType]);

  const handleTypeChange = async (type: string | null) => {
    if (!type) return;
    if (type === "__new__") {
      setNewTypeOpen(true);
      return;
    }
    if (text !== (savedContent[activeType] ?? "")) {
      await api.saveCaption(index, text, activeType);
      setSavedContent((prev) => ({ ...prev, [activeType]: text }));
    }
    setActiveType(type);
    const entry = captions?.find((c) => c.caption_type === type);
    const newContent = entry?.content ?? "";
    setText(newContent);
  };

  const handleCreateNewType = () => {
    const trimmed = newTypeInput.trim();
    if (!trimmed) return;
    setNewTypeOpen(false);
    setNewTypeInput("");
    setActiveType(trimmed);
    setText("");
  };

  const handleSave = async () => {
    await api.saveCaption(index, text, activeType);
    setSavedContent((prev) => ({ ...prev, [activeType]: text }));
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
        <Select value={activeType} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {captions?.map((c) => (
              <SelectItem key={c.caption_type} value={c.caption_type}>
                {c.caption_type}
              </SelectItem>
            ))}
            {activeType && activeType !== "__new__" && !captions?.find((c) => c.caption_type === activeType) && (
              <SelectItem key={activeType} value={activeType}>
                {activeType}
              </SelectItem>
            )}
            <SelectSeparator />
            <SelectItem value="__new__">
              <div className="flex items-center gap-1">
                <Plus className="w-3 h-3" />
                New type...
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <Popover open={newTypeOpen} onOpenChange={setNewTypeOpen}>
          <PopoverTrigger asChild>
            <div />
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="flex flex-col gap-2">
              <Input
                placeholder="New caption type..."
                value={newTypeInput}
                onChange={(e) => setNewTypeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateNewType()}
              />
              <Button size="sm" onClick={handleCreateNewType}>
                Create
              </Button>
            </div>
          </PopoverContent>
        </Popover>

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
