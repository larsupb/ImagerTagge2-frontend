"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const NONE = "__none__";
const NEW = "__new__";

interface CategorySelectorProps {
  index: number;
  category: string | null;
  onCategoryChange: (category: string | null) => void;
}

export default function CategorySelector({ index, category, onCategoryChange }: CategorySelectorProps) {
  const queryClient = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [newInput, setNewInput] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [renameInput, setRenameInput] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
  });

  useEffect(() => {
    if (editOpen && category) {
      setRenameInput(category);
    }
  }, [editOpen, category]);

  const handleSelect = async (value: string | null) => {
    if (!value) return;
    if (value === NEW) {
      setNewInput("");
      setNewOpen(true);
      return;
    }
    const next = value === NONE ? null : value;
    try {
      await api.setCategory(index, next);
      onCategoryChange(next);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set category");
    }
  };

  const handleCreate = async () => {
    const name = newInput.trim();
    if (!name) return;
    setNewOpen(false);
    setNewInput("");
    try {
      await api.setCategory(index, name);
      onCategoryChange(name);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create category");
    }
  };

  const handleRename = async () => {
    const newName = renameInput.trim();
    if (!newName || !category || newName === category) {
      setEditOpen(false);
      return;
    }
    try {
      await api.renameCategory(category, newName);
      onCategoryChange(newName);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename category");
    }
  };

  const handleDelete = async () => {
    if (!category) return;
    try {
      await api.deleteCategory(category);
      onCategoryChange(null);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete category");
    }
  };

  return (
    <div className="bg-surface rounded-lg border border-border px-4 py-2.5 flex items-center gap-3">
      <span className="text-sm text-text-secondary min-w-fit">Category</span>

      <Select value={category ?? NONE} onValueChange={handleSelect}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>
            <span className="text-text-muted">No category</span>
          </SelectItem>
          {categories.length > 0 && <SelectSeparator />}
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={NEW}>
            <div className="flex items-center gap-1">
              <Plus className="w-3 h-3" />
              New category...
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <Popover open={newOpen} onOpenChange={setNewOpen}>
        <PopoverTrigger asChild>
          <div />
        </PopoverTrigger>
        <PopoverContent className="w-52">
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Category name..."
              value={newInput}
              onChange={(e) => setNewInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <Button size="sm" onClick={handleCreate}>
              Create
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {category && (
        <Popover open={editOpen} onOpenChange={setEditOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-text-secondary">Rename &ldquo;{category}&rdquo;</p>
              <Input
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleRename} className="flex-1">
                  Rename
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
