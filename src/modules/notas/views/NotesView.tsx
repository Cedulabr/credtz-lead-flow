import { useEffect, useMemo, useState } from "react";
import {
  Search,
  NotebookPen,
  Bell,
  Archive,
  Trash2,
  Lightbulb,
  Tag,
  Folder,
  PanelLeft,
  Menu as MenuIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { NoteCard } from "../components/NoteCard";
import { NoteEditor } from "../components/NoteEditor";
import { KeepSidebar } from "../components/KeepSidebar";
import { InlineNoteCreator } from "../components/InlineNoteCreator";
import { LabelManagerDialog } from "../components/LabelManagerDialog";
import { useFolders, useNotes } from "../hooks/useNotas";
import { useLabels } from "../hooks/useLabels";
import { useNotesAuthors } from "../hooks/useNotesAuthors";
import type { Note, NotesSection } from "../types";
import { cn } from "@/lib/utils";

const sectionMeta = (s: NotesSection, labelName?: string, folderName?: string) => {
  switch (s.kind) {
    case "notes":
      return { title: "Notas", icon: Lightbulb, empty: { icon: Lightbulb, msg: "Suas notas aparecerão aqui" } };
    case "reminders":
      return { title: "Lembretes", icon: Bell, empty: { icon: Bell, msg: "Notas com lembretes aparecerão aqui" } };
    case "label":
      return { title: labelName ?? "Marcador", icon: Tag, empty: { icon: Tag, msg: "Nenhuma nota com este marcador" } };
    case "folder":
      return { title: folderName ?? "Pasta", icon: Folder, empty: { icon: Folder, msg: "Esta pasta está vazia" } };
    case "archive":
      return { title: "Arquivo", icon: Archive, empty: { icon: Archive, msg: "Notas arquivadas aparecerão aqui" } };
    case "trash":
      return { title: "Lixeira", icon: Trash2, empty: { icon: Trash2, msg: "Sem notas na lixeira" } };
  }
};

export function NotesView() {
  const [section, setSection] = useState<NotesSection>({ kind: "notes" });
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { folders, createFolder } = useFolders();
  const { labels, noteLabels: noteLabelsMap, createLabel, renameLabel, deleteLabel, toggleNoteLabel, fetchAll: refetchLabels } =
    useLabels();

  const labelFilter = useMemo(() => {
    if (section.kind !== "label") return undefined;
    const noteIds = Object.entries(noteLabelsMap)
      .filter(([, ids]) => ids.includes(section.labelId))
      .map(([nid]) => nid);
    return { noteIds };
  }, [section, noteLabelsMap]);

  const {
    notes,
    fetchNotes,
    createNote,
    updateNote,
    archiveNote,
    trashNote,
    restoreNote,
    deleteNote,
    duplicateNote,
  } = useNotes(section, debounced, labelFilter);

  useEffect(() => {
    const handler = () => fetchNotes();
    window.addEventListener("notas:refresh", handler);
    return () => window.removeEventListener("notas:refresh", handler);
  }, [fetchNotes]);

  const { getAuthorLabel, isGestorOrAdmin } = useNotesAuthors(
    notes.map((n) => n.created_by)
  );

  const meta = sectionMeta(
    section,
    section.kind === "label" ? labels.find((l) => l.id === section.labelId)?.name : undefined,
    section.kind === "folder" ? folders.find((f) => f.id === section.folderId)?.name : undefined
  );

  const pinned = notes.filter((n) => n.pinned);
  const unpinned = notes.filter((n) => !n.pinned);

  const renderCard = (n: Note) => (
    <NoteCard
      key={n.id}
      note={n}
      labels={labels}
      noteLabelIds={noteLabelsMap[n.id] ?? []}
      authorLabel={isGestorOrAdmin ? getAuthorLabel(n.created_by) : null}
      onClick={() => setEditingNote(n)}
      onPin={() => updateNote(n.id, { pinned: !n.pinned })}
      onDelete={() => trashNote(n.id)}
      onDuplicate={() => duplicateNote(n)}
      onArchive={() => archiveNote(n.id, !n.archived)}
      onRestore={() => restoreNote(n.id)}
      onPermanentDelete={() => deleteNote(n.id)}
      inTrash={section.kind === "trash"}
      inArchive={section.kind === "archive"}
    />
  );

  const sidebar = (
    <KeepSidebar
      section={section}
      onChange={(s) => {
        setSection(s);
        setMobileSidebarOpen(false);
      }}
      folders={folders}
      labels={labels}
      onManageLabels={() => setLabelManagerOpen(true)}
      onCreateFolder={async () => {
        const name = prompt("Nome da pasta:");
        if (name?.trim()) await createFolder(name.trim(), null);
      }}
      collapsed={sidebarCollapsed}
    />
  );

  return (
    <div className="flex h-full bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex border-r flex-col transition-all",
          sidebarCollapsed ? "w-14" : "w-64"
        )}
      >
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          {sidebar}
        </SheetContent>
      </Sheet>

      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 bg-background/90 backdrop-blur border-b px-3 md:px-4 py-2 flex items-center gap-2 z-10">
          <Button
            size="icon"
            variant="ghost"
            className="md:hidden"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hidden md:inline-flex"
            onClick={() => setSidebarCollapsed((p) => !p)}
            title="Recolher menu"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 mr-2">
            <meta.icon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">{meta.title}</h2>
          </div>

          <div className="relative flex-1 max-w-md ml-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              className="pl-8 h-9"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1">
          {section.kind === "trash" && (
            <div className="max-w-2xl mx-auto mb-4 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              Os itens são excluídos definitivamente após 30 dias.
            </div>
          )}

          {/* Inline creator (only on Notes) */}
          {section.kind === "notes" && (
            <div className="mb-6">
              <InlineNoteCreator onCreate={createNote} />
            </div>
          )}

          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <meta.empty.icon className="h-20 w-20 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">{meta.empty.msg}</p>
            </div>
          ) : (
            <>
              {pinned.length > 0 && section.kind === "notes" && (
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 tracking-wide">FIXADAS</h4>
                  <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3">
                    {pinned.map(renderCard)}
                  </div>
                </div>
              )}

              {unpinned.length > 0 && (
                <div>
                  {pinned.length > 0 && section.kind === "notes" && (
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 tracking-wide">OUTRAS</h4>
                  )}
                  <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3">
                    {(section.kind === "notes" ? unpinned : notes).map(renderCard)}
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
          refetchLabels();
        }}
        onUpdate={updateNote}
        labels={labels}
        noteLabelIds={editingNote ? noteLabelsMap[editingNote.id] ?? [] : []}
        onToggleLabel={(labelId) => editingNote && toggleNoteLabel(editingNote.id, labelId)}
        onArchive={editingNote ? () => { archiveNote(editingNote.id, !editingNote.archived); setEditingNote(null); } : undefined}
        onTrash={editingNote ? () => { trashNote(editingNote.id); setEditingNote(null); } : undefined}
      />

      <LabelManagerDialog
        open={labelManagerOpen}
        onClose={() => setLabelManagerOpen(false)}
        labels={labels}
        onCreate={createLabel}
        onRename={renameLabel}
        onDelete={deleteLabel}
      />
    </div>
  );
}
