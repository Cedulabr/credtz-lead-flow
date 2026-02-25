export interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  created_by: string;
  company_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SmsContactList {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  company_id: string | null;
  contact_count: number;
  created_at: string;
  updated_at: string;
}

export interface SmsContact {
  id: string;
  list_id: string;
  name: string | null;
  phone: string;
  source: string;
  source_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SmsCampaign {
  id: string;
  name: string;
  template_id: string | null;
  message_content: string;
  contact_list_id: string | null;
  status: "draft" | "scheduled" | "sending" | "completed" | "failed";
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmsHistoryRecord {
  id: string;
  campaign_id: string | null;
  phone: string;
  contact_name: string | null;
  message: string;
  status: "pending" | "sent" | "delivered" | "failed";
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  sent_by: string;
  company_id: string | null;
  created_at: string;
  televendas_id: string | null;
  send_type: string;
}

export type SmsTab = "televendas_sms" | "automation" | "campaigns" | "templates" | "history" | "contacts";

export const LEAD_SOURCE_OPTIONS = [
  { value: "activate_leads", label: "Activate Leads", icon: "⚡" },
  { value: "leads_premium", label: "Leads Premium", icon: "💎" },
  { value: "televendas", label: "Televendas", icon: "📞" },
] as const;

export const LEAD_STATUS_FILTERS = [
  { value: "novo", label: "Novo" },
  { value: "aguardando", label: "Aguardando" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "fechado", label: "Fechado" },
] as const;

export const CAMPAIGN_STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  draft: { label: "Rascunho", emoji: "📝", color: "text-muted-foreground" },
  scheduled: { label: "Agendado", emoji: "🕐", color: "text-blue-600" },
  sending: { label: "Enviando", emoji: "📤", color: "text-amber-600" },
  completed: { label: "Concluído", emoji: "✅", color: "text-green-600" },
  failed: { label: "Falhou", emoji: "❌", color: "text-red-600" },
};
