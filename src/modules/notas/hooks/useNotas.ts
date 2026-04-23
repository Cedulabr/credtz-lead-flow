import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Note, NoteFolder, Board, BoardColumn, Card, CardLabel, Checklist, ChecklistItem, CardComment, CardActivity, NotesSection } from "../types";

const DEFAULT_FOLDERS = ["Pessoal", "Reuniões", "Clientes", "Ideias"];
const DEFAULT_BOARD_COLUMNS = [
  { name: "A Fazer", color: "gray", order_index: 0 },
  { name: "Em Progresso", color: "blue", order_index: 1 },
  { name: "Concluído", color: "green", order_index: 2 },
];

// ── FOLDERS ─────────────────────────────────────────────────────────
export function useFolders() {
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFolders = useCallback(async () => {
    const { data, error } = await supabase
      .from("note_folders")
      .select("*")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });
    if (!error && data) setFolders(data as NoteFolder[]);
    setLoading(false);
  }, []);

  const ensureDefaults = useCallback(async () => {
    const { count } = await supabase.from("note_folders").select("id", { count: "exact", head: true });
    if ((count ?? 0) === 0) {
      await (supabase.from("note_folders") as any).insert(
        DEFAULT_FOLDERS.map((name, i) => ({ name, order_index: i, parent_id: null }))
      );
    }
  }, []);

  useEffect(() => {
    (async () => {
      await ensureDefaults();
      await fetchFolders();
    })();
  }, [ensureDefaults, fetchFolders]);

  const createFolder = async (name: string, parent_id: string | null = null) => {
    const { data, error } = await (supabase.from("note_folders") as any)
      .insert({ name, parent_id, order_index: folders.length })
      .select()
      .single();
    if (!error && data) {
      setFolders((prev) => [...prev, data as NoteFolder]);
      return data as NoteFolder;
    }
  };

  const renameFolder = async (id: string, name: string) => {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
    await supabase.from("note_folders").update({ name }).eq("id", id);
  };

  const deleteFolder = async (id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    await supabase.from("note_folders").delete().eq("id", id);
  };

  return { folders, loading, fetchFolders, createFolder, renameFolder, deleteFolder };
}

// ── NOTES ───────────────────────────────────────────────────────────
export function useNotes(section: NotesSection, search: string, labelFilter?: { noteIds: string[] | null }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("notes").select("*").order("pinned", { ascending: false }).order("updated_at", { ascending: false });

    // Section filtering
    if (section.kind === "trash") {
      q = q.not("trashed_at", "is", null);
    } else {
      q = q.is("trashed_at", null);
      if (section.kind === "archive") {
        q = q.eq("archived", true);
      } else if (section.kind === "reminders") {
        q = q.eq("archived", false).not("reminder_at", "is", null);
      } else if (section.kind === "folder") {
        q = q.eq("archived", false).eq("folder_id", section.folderId);
      } else {
        q = q.eq("archived", false);
      }
    }

    const { data } = await q;
    let result = (data as Note[]) ?? [];

    if (section.kind === "label" && labelFilter?.noteIds) {
      const set = new Set(labelFilter.noteIds);
      result = result.filter((n) => set.has(n.id));
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (n) =>
          (n.title ?? "").toLowerCase().includes(s) ||
          JSON.stringify(n.content ?? "").toLowerCase().includes(s) ||
          n.tags.some((t) => t.toLowerCase().includes(s))
      );
    }
    setNotes(result);
    setLoading(false);
  }, [section, search, labelFilter?.noteIds]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = async (partial: Partial<Note>): Promise<Note | undefined> => {
    const insertPayload: any = {
      title: partial.title ?? "Sem título",
      content: partial.content ?? [],
      tags: partial.tags ?? [],
      color: partial.color ?? "white",
      folder_id: partial.folder_id ?? (section.kind === "folder" ? section.folderId : null),
      pinned: partial.pinned ?? false,
      reminder_at: partial.reminder_at ?? null,
      linked_contact_id: partial.linked_contact_id ?? null,
      checklist_mode: partial.checklist_mode ?? false,
      created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    };
    const { data, error } = await supabase.from("notes").insert(insertPayload).select().single();
    if (!error && data) {
      setNotes((prev) => [data as Note, ...prev]);
      return data as Note;
    }
  };

  const updateNote = async (id: string, patch: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } as Note : n)));
    await supabase.from("notes").update(patch as any).eq("id", id);
  };

  const archiveNote = async (id: string, archived = true) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notes").update({ archived } as any).eq("id", id);
  };

  const trashNote = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notes").update({ trashed_at: new Date().toISOString() } as any).eq("id", id);
  };

  const restoreNote = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notes").update({ trashed_at: null, archived: false } as any).eq("id", id);
  };

  const deleteNote = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notes").delete().eq("id", id);
  };

  const duplicateNote = async (note: Note) => {
    const { id, created_at, updated_at, ...rest } = note;
    return createNote({ ...rest, title: (note.title ?? "Sem título") + " (cópia)" });
  };

  return { notes, loading, fetchNotes, createNote, updateNote, archiveNote, trashNote, restoreNote, deleteNote, duplicateNote };
}

// ── BOARDS ──────────────────────────────────────────────────────────
export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBoards = useCallback(async () => {
    const { data } = await supabase.from("boards").select("*").order("created_at", { ascending: false });
    setBoards((data as Board[]) ?? []);
    setLoading(false);
  }, []);

  const ensureDefaults = useCallback(async () => {
    const { count } = await supabase.from("boards").select("id", { count: "exact", head: true });
    if ((count ?? 0) === 0) {
      const defaults = ["Tarefas da Semana", "Pipeline de Projetos"];
      for (const name of defaults) {
        const { data: b } = await (supabase.from("boards") as any).insert({ name, color: "blue", icon: "Trello" }).select().single();
        if (b) {
          await (supabase.from("board_columns") as any).insert(
            DEFAULT_BOARD_COLUMNS.map((c) => ({ ...c, board_id: b.id, company_id: (b as any).company_id }))
          );
        }
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      await ensureDefaults();
      await fetchBoards();
    })();
  }, [ensureDefaults, fetchBoards]);

  const createBoard = async (name: string, description?: string, color = "blue") => {
    const { data, error } = await (supabase.from("boards") as any).insert({ name, description, color, icon: "Trello" }).select().single();
    if (!error && data) {
      await (supabase.from("board_columns") as any).insert(
        DEFAULT_BOARD_COLUMNS.map((c) => ({ ...c, board_id: data.id, company_id: (data as any).company_id }))
      );
      setBoards((prev) => [data as Board, ...prev]);
      return data as Board;
    }
  };

  const deleteBoard = async (id: string) => {
    setBoards((prev) => prev.filter((b) => b.id !== id));
    await supabase.from("boards").delete().eq("id", id);
  };

  return { boards, loading, fetchBoards, createBoard, deleteBoard };
}

// ── BOARD DETAIL (columns + cards) ──────────────────────────────────
export function useBoardDetail(boardId: string | null) {
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [labels, setLabels] = useState<CardLabel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!boardId) return;
    setLoading(true);
    const [{ data: cols }, { data: cds }, { data: lbs }] = await Promise.all([
      supabase.from("board_columns").select("*").eq("board_id", boardId).order("order_index"),
      supabase.from("cards").select("*").eq("board_id", boardId).order("order_index"),
      supabase.from("card_labels").select("*").eq("board_id", boardId),
    ]);
    setColumns((cols as BoardColumn[]) ?? []);
    setCards((cds as Card[]) ?? []);
    setLabels((lbs as CardLabel[]) ?? []);
    setLoading(false);
  }, [boardId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addColumn = async (name: string) => {
    if (!boardId) return;
    const board = await supabase.from("boards").select("company_id").eq("id", boardId).single();
    const { data } = await supabase
      .from("board_columns")
      .insert({ name, board_id: boardId, company_id: (board.data as any)?.company_id, order_index: columns.length, color: "gray" })
      .select()
      .single();
    if (data) setColumns((prev) => [...prev, data as BoardColumn]);
  };

  const renameColumn = async (id: string, name: string) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    await supabase.from("board_columns").update({ name }).eq("id", id);
  };

  const deleteColumn = async (id: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== id));
    setCards((prev) => prev.filter((c) => c.column_id !== id));
    await supabase.from("board_columns").delete().eq("id", id);
  };

  const addCard = async (column_id: string, title: string) => {
    if (!boardId) return;
    const board = await supabase.from("boards").select("company_id").eq("id", boardId).single();
    const colCards = cards.filter((c) => c.column_id === column_id);
    const { data } = await supabase
      .from("cards")
      .insert({
        title,
        column_id,
        board_id: boardId,
        company_id: (board.data as any)?.company_id,
        order_index: colCards.length,
        description: [],
      })
      .select()
      .single();
    if (data) setCards((prev) => [...prev, data as Card]);
  };

  const updateCard = async (id: string, patch: Partial<Card>) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } as Card : c)));
    await supabase.from("cards").update(patch as any).eq("id", id);
  };

  const moveCard = async (cardId: string, toColumnId: string, toIndex: number) => {
    setCards((prev) => {
      const moved = prev.find((c) => c.id === cardId);
      if (!moved) return prev;
      const without = prev.filter((c) => c.id !== cardId);
      const target = without.filter((c) => c.column_id === toColumnId);
      target.splice(toIndex, 0, { ...moved, column_id: toColumnId });
      const others = without.filter((c) => c.column_id !== toColumnId);
      const reindexed = target.map((c, i) => ({ ...c, order_index: i }));
      return [...others, ...reindexed];
    });
    await supabase.from("cards").update({ column_id: toColumnId, order_index: toIndex }).eq("id", cardId);
  };

  const deleteCard = async (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("cards").delete().eq("id", id);
  };

  const addLabel = async (name: string, color: string) => {
    if (!boardId) return;
    const { data } = await supabase.from("card_labels").insert({ board_id: boardId, name, color }).select().single();
    if (data) setLabels((prev) => [...prev, data as CardLabel]);
    return data as CardLabel | undefined;
  };

  const deleteLabel = async (id: string) => {
    setLabels((prev) => prev.filter((l) => l.id !== id));
    await supabase.from("card_labels").delete().eq("id", id);
  };

  return {
    columns,
    cards,
    labels,
    loading,
    fetchAll,
    addColumn,
    renameColumn,
    deleteColumn,
    addCard,
    updateCard,
    moveCard,
    deleteCard,
    addLabel,
    deleteLabel,
  };
}

// ── CARD DETAIL (checklists, comments, activity, labels assignment) ─
export function useCardDetail(cardId: string | null) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [comments, setComments] = useState<CardComment[]>([]);
  const [activity, setActivity] = useState<CardActivity[]>([]);
  const [cardLabels, setCardLabels] = useState<string[]>([]); // label ids

  const fetchAll = useCallback(async () => {
    if (!cardId) return;
    const [{ data: cls }, { data: cmts }, { data: act }, { data: lbs }] = await Promise.all([
      supabase.from("checklists").select("*").eq("card_id", cardId).order("order_index"),
      supabase.from("card_comments").select("*").eq("card_id", cardId).order("created_at", { ascending: false }),
      supabase.from("card_activity").select("*").eq("card_id", cardId).order("created_at", { ascending: false }).limit(50),
      supabase.from("cards_labels").select("label_id").eq("card_id", cardId),
    ]);
    const checklistsData = (cls as Checklist[]) ?? [];
    setChecklists(checklistsData);
    if (checklistsData.length > 0) {
      const { data: itemsData } = await supabase
        .from("checklist_items")
        .select("*")
        .in("checklist_id", checklistsData.map((c) => c.id))
        .order("order_index");
      setItems((itemsData as ChecklistItem[]) ?? []);
    } else {
      setItems([]);
    }
    setComments((cmts as CardComment[]) ?? []);
    setActivity((act as CardActivity[]) ?? []);
    setCardLabels(((lbs as any[]) ?? []).map((r) => r.label_id));
  }, [cardId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addChecklist = async (title: string) => {
    if (!cardId) return;
    const { data } = await supabase
      .from("checklists")
      .insert({ card_id: cardId, title, order_index: checklists.length })
      .select()
      .single();
    if (data) setChecklists((prev) => [...prev, data as Checklist]);
  };

  const deleteChecklist = async (id: string) => {
    setChecklists((prev) => prev.filter((c) => c.id !== id));
    setItems((prev) => prev.filter((i) => i.checklist_id !== id));
    await supabase.from("checklists").delete().eq("id", id);
  };

  const addItem = async (checklist_id: string, text: string) => {
    const order = items.filter((i) => i.checklist_id === checklist_id).length;
    const { data } = await supabase
      .from("checklist_items")
      .insert({ checklist_id, text, order_index: order, checked: false })
      .select()
      .single();
    if (data) setItems((prev) => [...prev, data as ChecklistItem]);
  };

  const toggleItem = async (id: string, checked: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked } : i)));
    await supabase.from("checklist_items").update({ checked }).eq("id", id);
  };

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("checklist_items").delete().eq("id", id);
  };

  const addComment = async (content: string) => {
    if (!cardId) return;
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const { data } = await (supabase.from("card_comments") as any).insert({ card_id: cardId, user_id: userId, content }).select().single();
    if (data) setComments((prev) => [data as CardComment, ...prev]);
  };

  const deleteComment = async (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("card_comments").delete().eq("id", id);
  };

  const toggleLabel = async (labelId: string) => {
    if (!cardId) return;
    if (cardLabels.includes(labelId)) {
      setCardLabels((prev) => prev.filter((l) => l !== labelId));
      await supabase.from("cards_labels").delete().eq("card_id", cardId).eq("label_id", labelId);
    } else {
      setCardLabels((prev) => [...prev, labelId]);
      await supabase.from("cards_labels").insert({ card_id: cardId, label_id: labelId });
    }
  };

  return {
    checklists,
    items,
    comments,
    activity,
    cardLabels,
    fetchAll,
    addChecklist,
    deleteChecklist,
    addItem,
    toggleItem,
    deleteItem,
    addComment,
    deleteComment,
    toggleLabel,
  };
}
