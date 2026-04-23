import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { NoteLabel } from "../types";

export function useLabels() {
  const [labels, setLabels] = useState<NoteLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteLabels, setNoteLabels] = useState<Record<string, string[]>>({}); // note_id -> [label_id]

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: lbls }, { data: links }] = await Promise.all([
      supabase.from("note_labels").select("*").order("name"),
      (supabase.from as any)("notes_labels").select("note_id, label_id"),
    ]);
    setLabels((lbls as NoteLabel[]) ?? []);
    const map: Record<string, string[]> = {};
    ((links as any[]) ?? []).forEach((l) => {
      if (!map[l.note_id]) map[l.note_id] = [];
      map[l.note_id].push(l.label_id);
    });
    setNoteLabels(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createLabel = async (name: string, color = "gray") => {
    const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { data, error } = await (supabase.from("note_labels") as any)
      .insert({ name, color, created_by: userId })
      .select()
      .single();
    if (!error && data) {
      setLabels((p) => [...p, data as NoteLabel].sort((a, b) => a.name.localeCompare(b.name)));
      return data as NoteLabel;
    }
  };

  const renameLabel = async (id: string, name: string, color?: string) => {
    const patch: any = { name };
    if (color) patch.color = color;
    setLabels((p) => p.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    await supabase.from("note_labels").update(patch).eq("id", id);
  };

  const deleteLabel = async (id: string) => {
    setLabels((p) => p.filter((l) => l.id !== id));
    await supabase.from("note_labels").delete().eq("id", id);
  };

  const toggleNoteLabel = async (noteId: string, labelId: string) => {
    const has = (noteLabels[noteId] ?? []).includes(labelId);
    setNoteLabels((p) => {
      const cur = p[noteId] ?? [];
      return { ...p, [noteId]: has ? cur.filter((x) => x !== labelId) : [...cur, labelId] };
    });
    if (has) {
      await (supabase.from("notes_labels") as any).delete().eq("note_id", noteId).eq("label_id", labelId);
    } else {
      await (supabase.from("notes_labels") as any).insert({ note_id: noteId, label_id: labelId });
    }
  };

  return { labels, loading, noteLabels, fetchAll, createLabel, renameLabel, deleteLabel, toggleNoteLabel };
}
