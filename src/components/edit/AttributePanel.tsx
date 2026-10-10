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
}

export default function AttributePanel({ filename }: AttributePanelProps) {
  const { data: schema } = useQuery({
    queryKey: ["attribute-schema"],
    queryFn: () => api.getAttributeSchema(),
  });
  const [attributes, setAttributes] = useState<AttributeMap | null>(null);
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

  if (!schema || !attributes) return null;

  const entries = Object.entries(schema).filter(
    ([name, spec]) => spec.applies_to === "all" || name in attributes
  );
  if (entries.length === 0) return null;

  return (
    <div className="bg-surface rounded-lg border border-border px-4 py-2.5">
      <span className="text-sm text-text-secondary">Attributes</span>
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
        {entries.map(([name, spec]) => (
          <div key={name} className="flex items-center gap-2">
            <span className="text-sm text-text-secondary min-w-fit">{humanize(name)}</span>
            <Select
              value={attributes[name] ?? UNSET}
              onValueChange={(value) => handleChange(name, value)}
            >
              <SelectTrigger className="w-[180px]">
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
    </div>
  );
}
