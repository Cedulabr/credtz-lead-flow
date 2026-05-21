export type AgibankLeadStatus =
  | "novo"
  | "em_andamento"
  | "nao_e_whatsapp"
  | "nao_e_cliente"
  | "sem_interesse"
  | "cliente_fechado"
  | "agendado";

export interface AgibankLead {
  id: string;
  created_at: string;
  updated_at: string;
  agent_id: string | null;
  company_id: string | null;
  list_id: string | null;
  name: string;
  phone: string;
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
  cliente_fechado: "Cliente fechado",
};

export const STATUS_COLORS: Record<AgibankLeadStatus, string> = {
  novo: "bg-blue-500 text-white",
  em_andamento: "bg-amber-500 text-white",
  agendado: "bg-purple-500 text-white",
  nao_e_whatsapp: "bg-slate-500 text-white",
  nao_e_cliente: "bg-slate-400 text-white",
  sem_interesse: "bg-red-600 text-white",
  cliente_fechado: "bg-emerald-600 text-white",
};

export const STATUS_ORDER: AgibankLeadStatus[] = [
  "novo",
  "em_andamento",
  "agendado",
  "nao_e_whatsapp",
  "nao_e_cliente",
  "sem_interesse",
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
