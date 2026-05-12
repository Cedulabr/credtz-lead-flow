export interface PropostaCancelada {
  id: string;
  nome: string;
  cpf: string | null;
  banco: string | null;
  tipo_operacao: string | null;
  troco: number | null;
  saldo_devedor: number | null;
  status: string;
  data_cancelamento: string | null;
  motivo_cancelamento: string | null;
  reativacao_score: number | null;
  reativacao_justificativa: string | null;
  created_at: string;
  user_id: string;
  company_id: string | null;
  observacao: string | null;
  telefone: string | null;
}

export type ReaproveitamentoTab = "todas" | "quentes" | "recentes" | "alto_valor";

export const PERIOD_OPTIONS = [
  { value: "30", label: "Últimos 30 dias" },
  { value: "60", label: "Últimos 60 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "all", label: "Todos" },
] as const;
