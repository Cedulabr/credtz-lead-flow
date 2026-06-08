// Canonical module catalog for the dynamic sidebar + admin permissions UI.
// module_key === tab id used by Index.tsx (kept identical to avoid mapping layer).

import {
  Zap, FileText, TrendingUp, PhoneCall, Keyboard, Kanban, Coins, Table,
  Wallet, BarChart3, Clock, NotebookPen, UsersRound, File as FileIcon,
  MessageCircle, Target, Headphones, Briefcase, Folder, Settings, Home,
  Mic, MessageSquare, Phone, PhoneOutgoing, Radar, Bot, Database, Users,
  RefreshCw, ClipboardList, Volume2, Share2, Store, Receipt, User,
  type LucideIcon,
} from "lucide-react";

export const ICON_LIBRARY: Record<string, LucideIcon> = {
  Zap, FileText, TrendingUp, PhoneCall, Keyboard, Kanban, Coins, Table,
  Wallet, BarChart3, Clock, NotebookPen, UsersRound, FileIcon,
  MessageCircle, Target, Headphones, Briefcase, Folder, Settings, Home,
  Mic, MessageSquare, Phone, PhoneOutgoing, Radar, Bot, Database, Users,
  RefreshCw, ClipboardList, Volume2, Share2, Store, Receipt, User,
};

export function getIcon(name?: string | null): LucideIcon {
  if (!name) return Folder;
  return ICON_LIBRARY[name] ?? Folder;
}

export interface ModuleDef {
  key: string;             // == tab id
  defaultLabel: string;
  defaultIcon: string;
  defaultCategory: string; // matches menu_categories.key
  description?: string;
}

export const MODULE_CATALOG: ModuleDef[] = [
  // Gestão Whatsapp / Comunicação
  { key: "easyn-flow", defaultLabel: "Easyn Flow", defaultIcon: "Zap", defaultCategory: "gestao_whatsapp" },
  { key: "whatsapp", defaultLabel: "WhatsApp Config", defaultIcon: "MessageCircle", defaultCategory: "gestao_whatsapp" },
  { key: "sms", defaultLabel: "SMS", defaultIcon: "MessageSquare", defaultCategory: "gestao_whatsapp" },
  { key: "telefonia", defaultLabel: "Telefonia", defaultIcon: "PhoneOutgoing", defaultCategory: "gestao_whatsapp" },
  { key: "voicer", defaultLabel: "Easyn Voicer", defaultIcon: "Mic", defaultCategory: "gestao_whatsapp" },

  // Captação
  { key: "proposal-generator", defaultLabel: "Gerador de Proposta", defaultIcon: "FileText", defaultCategory: "captacao" },
  { key: "activate-leads", defaultLabel: "Activate Leads", defaultIcon: "Zap", defaultCategory: "captacao" },
  { key: "leads", defaultLabel: "Leads Premium", defaultIcon: "TrendingUp", defaultCategory: "captacao" },
  { key: "leads-agibank", defaultLabel: "Leads Agibank", defaultIcon: "TrendingUp", defaultCategory: "captacao" },
  { key: "reaproveitamento", defaultLabel: "Reaproveitamento", defaultIcon: "RefreshCw", defaultCategory: "captacao" },
  { key: "reuse-alerts", defaultLabel: "Painel de Oportunidades", defaultIcon: "Target", defaultCategory: "captacao" },

  // Televendas
  { key: "televendas", defaultLabel: "Televendas", defaultIcon: "PhoneCall", defaultCategory: "televendas" },
  { key: "digitacao", defaultLabel: "Digitação", defaultIcon: "Keyboard", defaultCategory: "televendas" },
  { key: "digitacao-agibank", defaultLabel: "Digitação Agibank", defaultIcon: "Keyboard", defaultCategory: "televendas" },
  { key: "televendas-manage", defaultLabel: "Gestão de Televendas", defaultIcon: "Kanban", defaultCategory: "televendas" },
  { key: "my-clients", defaultLabel: "Meus Clientes", defaultIcon: "Users", defaultCategory: "televendas" },

  // Financeiro
  { key: "finances", defaultLabel: "Finanças", defaultIcon: "Coins", defaultCategory: "financeiro" },
  { key: "commission-table", defaultLabel: "Tabela de Comissões", defaultIcon: "Table", defaultCategory: "financeiro" },
  { key: "commissions", defaultLabel: "Todas as Comissões", defaultIcon: "Wallet", defaultCategory: "financeiro" },
  { key: "performance-report", defaultLabel: "Relatório de Desempenho", defaultIcon: "BarChart3", defaultCategory: "financeiro" },

  // Gestão
  { key: "time-clock", defaultLabel: "Controle de Ponto", defaultIcon: "Clock", defaultCategory: "gestao" },
  { key: "notas", defaultLabel: "Notas & Workspace", defaultIcon: "NotebookPen", defaultCategory: "gestao" },
  { key: "collaborative", defaultLabel: "Colaborativo", defaultIcon: "UsersRound", defaultCategory: "gestao" },
  { key: "documents", defaultLabel: "Documentos", defaultIcon: "FileIcon", defaultCategory: "gestao" },
];

export const MODULE_BY_KEY: Record<string, ModuleDef> = Object.fromEntries(
  MODULE_CATALOG.map((m) => [m.key, m])
);

// Tabs that are always available (no permission gate).
export const ALWAYS_VISIBLE_TABS = new Set<string>([
  "dashboard", "my-data", "marketplace", "billing", "indicate",
]);
