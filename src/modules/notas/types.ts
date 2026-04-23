export type NoteColor = "white" | "yellow" | "green" | "blue" | "purple" | "red" | "orange" | "gray";

export const NOTE_COLORS: { id: NoteColor; label: string; border: string; bg: string }[] = [
  { id: "white", label: "Padrão", border: "border-l-border", bg: "bg-card" },
  { id: "yellow", label: "Amarelo", border: "border-l-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/20" },
  { id: "green", label: "Verde", border: "border-l-green-500", bg: "bg-green-50 dark:bg-green-950/20" },
  { id: "blue", label: "Azul", border: "border-l-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
  { id: "purple", label: "Roxo", border: "border-l-purple-500", bg: "bg-purple-50 dark:bg-purple-950/20" },
  { id: "red", label: "Vermelho", border: "border-l-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
  { id: "orange", label: "Laranja", border: "border-l-orange-500", bg: "bg-orange-50 dark:bg-orange-950/20" },
  { id: "gray", label: "Cinza", border: "border-l-muted-foreground", bg: "bg-muted/40" },
];

export const LABEL_COLORS = [
  { id: "blue", className: "bg-blue-500" },
  { id: "green", className: "bg-green-500" },
  { id: "yellow", className: "bg-yellow-500" },
  { id: "red", className: "bg-red-500" },
  { id: "purple", className: "bg-purple-500" },
  { id: "gray", className: "bg-gray-500" },
];

export interface NoteFolder {
  id: string;
  company_id: string;
  parent_id: string | null;
  name: string;
  order_index: number;
  created_by: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  company_id: string;
  folder_id: string | null;
  title: string | null;
  content: any;
  tags: string[];
  color: NoteColor;
  pinned: boolean;
  reminder_at: string | null;
  linked_contact_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardColumn {
  id: string;
  board_id: string;
  company_id: string;
  name: string;
  order_index: number;
  color: string | null;
  created_at: string;
}

export interface Card {
  id: string;
  column_id: string;
  board_id: string;
  company_id: string;
  title: string;
  description: any;
  due_date: string | null;
  assignee_id: string | null;
  linked_contact_id: string | null;
  order_index: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardLabel {
  id: string;
  board_id: string;
  name: string;
  color: string;
}

export interface Checklist {
  id: string;
  card_id: string;
  title: string;
  order_index: number;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  text: string;
  checked: boolean;
  order_index: number;
}

export interface CardComment {
  id: string;
  card_id: string;
  company_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name?: string;
}

export interface CardActivity {
  id: string;
  card_id: string;
  user_id: string | null;
  action: string;
  metadata: any;
  created_at: string;
}
