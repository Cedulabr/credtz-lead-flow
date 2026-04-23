import { useState } from "react";
import {
  Lightbulb,
  Bell,
  Pencil,
  Tag,
  Folder,
  Archive,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotesSection, NoteFolder, NoteLabel } from "../types";
import { LABEL_COLORS } from "../types";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props {
  section: NotesSection;
  onChange: (s: NotesSection) => void;
  folders: NoteFolder[];
  labels: NoteLabel[];
  onManageLabels: () => void;
  onCreateFolder: () => void;
  collapsed?: boolean;
}

const colorClass = (id: string) =>
  LABEL_COLORS.find((c) => c.id === id)?.className ?? "bg-gray-500";

export function KeepSidebar({
  section,
  onChange,
  folders,
  labels,
  onManageLabels,
  onCreateFolder,
  collapsed,
}: Props) {
  const [foldersOpen, setFoldersOpen] = useState(true);

  const isActive = (s: NotesSection) => {
    if (section.kind !== s.kind) return false;
    if (s.kind === "folder" && section.kind === "folder") return s.folderId === section.folderId;
    if (s.kind === "label" && section.kind === "label") return s.labelId === section.labelId;
    return true;
  };

  const Item = ({
    icon: Icon,
    label,
    active,
    onClick,
    iconColor,
    suffix,
  }: {
    icon: any;
    label: string;
    active: boolean;
    onClick: () => void;
    iconColor?: string;
    suffix?: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 h-10 pl-4 pr-3 rounded-r-full text-sm transition-colors",
        active
          ? "bg-amber-100 dark:bg-amber-900/30 text-foreground font-medium"
          : "hover:bg-muted text-foreground/80",
        collapsed && "justify-center pl-0 pr-0 rounded-full mx-1 w-10"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className={cn("h-5 w-5 shrink-0", iconColor)} />
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{label}</span>
          {suffix}
        </>
      )}
    </button>
  );

  return (
    <nav className="py-2 flex flex-col gap-0.5 overflow-y-auto h-full">
      <Item
        icon={Lightbulb}
        label="Notas"
        active={isActive({ kind: "notes" })}
        onClick={() => onChange({ kind: "notes" })}
      />
      <Item
        icon={Bell}
        label="Lembretes"
        active={isActive({ kind: "reminders" })}
        onClick={() => onChange({ kind: "reminders" })}
      />

      {/* Labels */}
      {!collapsed && (
        <Item
          icon={Pencil}
          label="Editar marcadores"
          active={false}
          onClick={onManageLabels}
        />
      )}
      {!collapsed &&
        labels.map((l) => (
          <button
            key={l.id}
            onClick={() => onChange({ kind: "label", labelId: l.id })}
            className={cn(
              "w-full flex items-center gap-4 h-10 pl-4 pr-3 rounded-r-full text-sm transition-colors",
              isActive({ kind: "label", labelId: l.id })
                ? "bg-amber-100 dark:bg-amber-900/30 font-medium"
                : "hover:bg-muted"
            )}
          >
            <Tag className={cn("h-5 w-5 shrink-0", "text-foreground/70")} />
            <span className="flex-1 text-left truncate">{l.name}</span>
            <span className={cn("h-2 w-2 rounded-full", colorClass(l.color))} />
          </button>
        ))}

      {/* Folders */}
      {!collapsed && folders.length > 0 && (
        <Collapsible open={foldersOpen} onOpenChange={setFoldersOpen} className="mt-1">
          <div className="flex items-center gap-1 pr-2">
            <CollapsibleTrigger asChild>
              <button className="flex-1 flex items-center gap-4 h-9 pl-4 pr-3 rounded-r-full text-xs uppercase font-semibold text-muted-foreground hover:bg-muted">
                {foldersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="flex-1 text-left">Pastas</span>
              </button>
            </CollapsibleTrigger>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCreateFolder}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <CollapsibleContent>
            {folders
              .filter((f) => !f.parent_id)
              .map((f) => (
                <button
                  key={f.id}
                  onClick={() => onChange({ kind: "folder", folderId: f.id })}
                  className={cn(
                    "w-full flex items-center gap-4 h-10 pl-4 pr-3 rounded-r-full text-sm",
                    isActive({ kind: "folder", folderId: f.id })
                      ? "bg-amber-100 dark:bg-amber-900/30 font-medium"
                      : "hover:bg-muted"
                  )}
                >
                  <Folder className="h-5 w-5 shrink-0 text-foreground/70" />
                  <span className="flex-1 text-left truncate">{f.name}</span>
                </button>
              ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="mt-1">
        <Item
          icon={Archive}
          label="Arquivo"
          active={isActive({ kind: "archive" })}
          onClick={() => onChange({ kind: "archive" })}
        />
        <Item
          icon={Trash2}
          label="Lixeira"
          active={isActive({ kind: "trash" })}
          onClick={() => onChange({ kind: "trash" })}
        />
      </div>
    </nav>
  );
}
