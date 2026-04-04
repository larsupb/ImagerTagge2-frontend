"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";

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
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded text-sm text-white resize-y focus:outline-none focus:border-blue-500"
        placeholder="Caption text..."
      />

      <div className="flex items-center gap-2">
        <select
          value={tagger}
          onChange={(e) => setTagger(e.target.value)}
          className="px-2 py-1.5 bg-zinc-800 border border-zinc-600 rounded text-sm text-white"
        >
          {taggers?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-medium disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate"}
        </button>

        <button
          onClick={handleSave}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
        >
          Save Caption
        </button>
      </div>
    </div>
  );
}
