export type AgibankLeadStatus =
  | "novo"
  | "em_andamento"
  | "nao_e_whatsapp"
  | "nao_e_cliente"
  | "sem_interesse"
  | "cliente_fechado"
  | "agendado"
  | "negativado";

export interface AgibankLead {
  id: string;
  created_at: string;
  updated_at: string;
  agent_id: string | null;
  company_id: string | null;
  list_id: string | null;
  name: string;
  phone: string;
  phone2: string | null;
  phone3: string | null;
  phone4: string | null;
  phone5: string | null;
  tag: string | null;
  document: string | null;
  status: AgibankLeadStatus;
  scheduled_at: string | null;
  credits_cost: number;
  first_opened_at: string | null;
  notes: string | null;
}

export const STATUS_LABELS: Record<AgibankLeadStatus, string> = {
  novo: "Novo",
  em_andamento: "Em andamento",
  agendado: "Agendado",
  nao_e_whatsapp: "Não é WhatsApp",
  nao_e_cliente: "Não é o cliente",
  sem_interesse: "Sem interesse",
  cliente_fechado: "Convertido",
  negativado: "Negativado",
};

// Cores semânticas conforme spec do CRM
export const STATUS_COLORS: Record<AgibankLeadStatus, string> = {
  novo: "bg-blue-500 text-white",
  em_andamento: "bg-orange-500 text-white",
  agendado: "bg-purple-500 text-white",
  nao_e_whatsapp: "bg-yellow-400 text-black",
  nao_e_cliente: "bg-slate-400 text-white",
  sem_interesse: "bg-slate-500 text-white",
  cliente_fechado: "bg-emerald-600 text-white",
  negativado: "bg-red-600 text-white",
};

export const STATUS_ORDER: AgibankLeadStatus[] = [
  "novo",
  "em_andamento",
  "agendado",
  "nao_e_whatsapp",
  "nao_e_cliente",
  "sem_interesse",
  "negativado",
  "cliente_fechado",
];

export function maskPhone(phone: string): string {
  const d = (phone || "").replace(/\D/g, "");
  if (d.length < 4) return phone;
  const last4 = d.slice(-4);
  return `(••) •••••-${last4}`;
}

export function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

// Score/temperatura derivada da idade do lead (sem coluna no DB ainda)
export type LeadTemperature = "quente" | "morno" | "frio";

export function getLeadTemperature(lead: AgibankLead): LeadTemperature {
  // Se já está convertido ou negativado, considera frio
  if (lead.status === "cliente_fechado" || lead.status === "negativado") return "frio";
  const ageMs = Date.now() - new Date(lead.created_at).getTime();
  const days = ageMs / (1000 * 60 * 60 * 24);
  if (days < 1) return "quente";
  if (days < 7) return "morno";
  return "frio";
}

export const TEMPERATURE_META: Record<LeadTemperature, { label: string; emoji: string; color: string }> = {
  quente: { label: "Quente", emoji: "🔴", color: "text-red-600" },
  morno: { label: "Morno", emoji: "🟡", color: "text-yellow-600" },
  frio: { label: "Frio", emoji: "🔵", color: "text-blue-600" },
};
