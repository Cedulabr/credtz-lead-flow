import { useEffect, useMemo, useState } from "react";
import { Search, Plus, NotebookPen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FolderTree } from "../components/FolderTree";
import { NoteCard } from "../components/NoteCard";
import { NoteEditor } from "../components/NoteEditor";
import { useFolders, useNotes } from "../hooks/useNotas";
import type { Note } from "../types";

export function NotesView() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { folders, createFolder, renameFolder, deleteFolder } = useFolders();
  const { notes, fetchNotes, createNote, updateNote, deleteNote, duplicateNote } = useNotes(selectedFolder, debounced);

  // Counts per folder
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  useEffect(() => {
    if (selectedFolder === null && !debounced) setAllNotes(notes);
  }, [notes, selectedFolder, debounced]);

  useEffect(() => {
    const handler = () => fetchNotes();
    window.addEventListener("notas:refresh", handler);
    return () => window.removeEventListener("notas:refresh", handler);
  }, [fetchNotes]);

  const noteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allNotes.forEach((n) => {
      if (n.folder_id) counts[n.folder_id] = (counts[n.folder_id] ?? 0) + 1;
    });
    return counts;
  }, [allNotes]);

  const pinned = notes.filter((n) => n.pinned);
  const unpinned = notes.filter((n) => !n.pinned);

  const handleCreateBlank = async () => {
    const note = await createNote({ folder_id: selectedFolder, title: "Nova nota", content: [] });
    if (note) setEditingNote(note);
  };

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <aside className="hidden md:flex w-64 border-r flex-col bg-muted/20">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar notas..."
              className="pl-8 h-9"
            />
          </div>
        </div>
        <FolderTree
          folders={folders}
          selectedId={selectedFolder}
          onSelect={setSelectedFolder}
          onCreate={createFolder}
          onRename={renameFolder}
          onDelete={deleteFolder}
          noteCounts={noteCounts}
          totalCount={allNotes.length}
        />
      </aside>

      {/* Center grid */}
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 bg-background/80 backdrop-blur border-b px-4 py-2 flex items-center justify-between gap-2 z-10">
          <div className="md:hidden flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar notas..."
              className="h-9"
            />
          </div>
          <Button onClick={handleCreateBlank} size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Nova nota
          </Button>
        </div>

        <div className="p-4">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <NotebookPen className="h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="font-medium mb-1">Nenhuma nota ainda</h3>
              <p className="text-sm text-muted-foreground mb-4">Comece criando sua primeira anotação.</p>
              <Button onClick={handleCreateBlank}>
                <Plus className="h-4 w-4 mr-1" /> Criar nota
              </Button>
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">📌 Fixadas</h4>
                  <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3">
                    {pinned.map((n) => (
                      <NoteCard
                        key={n.id}
                        note={n}
                        onClick={() => setEditingNote(n)}
                        onPin={() => updateNote(n.id, { pinned: !n.pinned })}
                        onDelete={() => deleteNote(n.id)}
                        onDuplicate={() => duplicateNote(n)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {unpinned.length > 0 && (
                <div>
                  {pinned.length > 0 && <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Outras</h4>}
                  <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3">
                    {unpinned.map((n) => (
                      <NoteCard
                        key={n.id}
                        note={n}
                        onClick={() => setEditingNote(n)}
                        onPin={() => updateNote(n.id, { pinned: !n.pinned })}
                        onDelete={() => deleteNote(n.id)}
                        onDuplicate={() => duplicateNote(n)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <NoteEditor
        note={editingNote}
        open={!!editingNote}
        onClose={() => {
          setEditingNote(null);
          fetchNotes();
        }}
        onUpdate={updateNote}
      />
    </div>
  );
}
