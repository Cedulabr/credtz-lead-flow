import { useState } from "react";
import { Folder, FolderOpen, Plus, Pencil, Trash2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NoteFolder } from "../types";

interface Props {
  folders: NoteFolder[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string, parent_id: string | null) => Promise<any>;
  onRename: (id: string, name: string) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  noteCounts: Record<string, number>;
  totalCount: number;
}

export function FolderTree({ folders, selectedId, onSelect, onCreate, onRename, onDelete, noteCounts, totalCount }: Props) {
  const [creatingFor, setCreatingFor] = useState<string | "root" | null>(null);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const roots = folders.filter((f) => !f.parent_id);
  const childrenOf = (id: string) => folders.filter((f) => f.parent_id === id);

  const submitCreate = async (parent_id: string | null) => {
    if (!newName.trim()) return setCreatingFor(null);
    await onCreate(newName.trim(), parent_id);
    setNewName("");
    setCreatingFor(null);
  };

  const submitRename = async (id: string) => {
    if (!editName.trim()) return setEditingId(null);
    await onRename(id, editName.trim());
    setEditingId(null);
  };

  const renderFolder = (f: NoteFolder, depth = 0) => {
    const isSelected = selectedId === f.id;
    const subs = childrenOf(f.id);
    const Icon = isSelected ? FolderOpen : Folder;
    return (
      <div key={f.id}>
        <div
          className={cn(
            "group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer hover:bg-accent",
            isSelected && "bg-accent"
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => onSelect(f.id)}
        >
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          {editingId === f.id ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => submitRename(f.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename(f.id);
                if (e.key === "Escape") setEditingId(null);
              }}
              autoFocus
              className="h-6 text-xs"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{noteCounts[f.id] ?? 0}</span>
              <div className="hidden group-hover:flex gap-0.5">
                {depth < 1 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCreatingFor(f.id);
                      setNewName("");
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(f.id);
                    setEditName(f.name);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Excluir pasta "${f.name}"?`)) onDelete(f.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </>
          )}
        </div>

        {creatingFor === f.id && (
          <div style={{ paddingLeft: `${24 + depth * 16}px` }} className="py-1 pr-2">
            <Input
              autoFocus
              placeholder="Nome da subpasta"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => submitCreate(f.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCreate(f.id);
                if (e.key === "Escape") setCreatingFor(null);
              }}
              className="h-7 text-xs"
            />
          </div>
        )}

        {subs.map((s) => renderFolder(s, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-2 border-b">
        <span className="text-xs font-semibold text-muted-foreground uppercase">Pastas</span>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => {
            setCreatingFor("root");
            setNewName("");
          }}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto py-1">
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer hover:bg-accent",
            selectedId === null && "bg-accent"
          )}
          onClick={() => onSelect(null)}
        >
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">Todas</span>
          <span className="text-xs text-muted-foreground tabular-nums">{totalCount}</span>
        </div>

        {creatingFor === "root" && (
          <div className="px-2 py-1">
            <Input
              autoFocus
              placeholder="Nome da pasta"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => submitCreate(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCreate(null);
                if (e.key === "Escape") setCreatingFor(null);
              }}
              className="h-7 text-xs"
            />
          </div>
        )}

        {roots.map((r) => renderFolder(r, 0))}
      </div>
    </div>
  );
}
