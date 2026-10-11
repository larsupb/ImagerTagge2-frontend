"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { humanize } from "@/lib/utils";
import type { AttributeMap } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UNSET = "__unset__";

interface AttributePanelProps {
  filename: string;
  index: number;
}

export default function AttributePanel({ filename, index }: AttributePanelProps) {
  const { data: schema } = useQuery({
    queryKey: ["attribute-schema"],
    queryFn: () => api.getAttributeSchema(),
  });
  const [attributes, setAttributes] = useState<AttributeMap | null>(null);
  const [classifying, setClassifying] = useState(false);
  const filenameRef = useRef(filename);

  useEffect(() => {
    filenameRef.current = filename;
    let cancelled = false;
    setAttributes(null);
    api
      .getAttributes(filename)
      .then((res) => {
        if (!cancelled) setAttributes(res.attributes);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load attributes");
        if (!cancelled) setAttributes({});
      });
    return () => {
      cancelled = true;
    };
  }, [filename]);

  const handleChange = async (attr: string, value: string | null) => {
    const target = filename;
    const next = !value || value === UNSET ? null : value;
    try {
      await api.setAttributes(filename, { [attr]: next });
      if (target !== filenameRef.current) return;
      setAttributes((prev) => {
        if (!prev) return prev;
        const copy = { ...prev };
        if (next === null) delete copy[attr];
        else copy[attr] = next;
        return copy;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutoClassify = async () => {
    const target = filename;
    setClassifying(true);
    try {
      const res = await api.classifyImage(index);
      if (target !== filenameRef.current) return;
      if (res.failed) {
        toast.error("Classification failed");
        return;
      }
      const next = res.attributes;
      setAttributes((prev) => (prev ? { ...prev, ...next } : next));
      const n = Object.keys(next).length;
      toast(n > 0 ? `${n} attribute${n === 1 ? "" : "s"} set` : "No attributes detected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Classification failed");
    } finally {
      setClassifying(false);
    }
  };

  if (!schema || !attributes) return null;

  const entries = Object.entries(schema);
  if (entries.length === 0) return null;

  const count = Object.keys(attributes).length;

  return (
    <>
      <button
        type="button"
        onClick={handleAutoClassify}
        disabled={classifying}
        className="flex h-7 w-fit cursor-pointer items-center rounded-lg border border-input bg-transparent px-2.5 text-xs text-text-secondary hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
      >
        {classifying ? "Classifying..." : "Auto-classify (VLM)"}
      </button>
      <details className="relative">
      <summary className="flex h-7 w-fit cursor-pointer list-none items-center rounded-lg border border-input bg-transparent px-2.5 text-xs text-text-secondary [&::-webkit-details-marker]:hidden">
        Attributes{count > 0 ? ` (${count})` : ""}
      </summary>
      <div className="absolute z-20 mt-1 w-80 max-h-96 overflow-y-auto rounded-md border border-border bg-background p-3 shadow-md grid grid-cols-2 gap-2">
        {entries.map(([name, spec]) => (
          <div key={name} className="flex flex-col gap-1">
            <span className="text-xs text-text-secondary">{humanize(name)}</span>
            <Select
              value={attributes[name] ?? UNSET}
              onValueChange={(value) => handleChange(name, value)}
            >
              <SelectTrigger className="h-7 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>
                  <span className="text-text-muted">-- unset --</span>
                </SelectItem>
                {spec.values.map((v) => (
                  <SelectItem key={v} value={v}>
                    {humanize(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      </details>
    </>
  );
}
