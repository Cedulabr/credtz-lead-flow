export interface UserData {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  pix_key?: string;
  role: string;
  company?: string;
  level?: string;
  is_active?: boolean;
  leads_premium_enabled?: boolean;
  can_access_premium_leads?: boolean;
  can_access_indicar?: boolean;
  can_access_meus_clientes?: boolean;
  can_access_televendas?: boolean;
  can_access_gestao_televendas?: boolean;
  can_access_documentos?: boolean;
  can_access_tabela_comissoes?: boolean;
  can_access_minhas_comissoes?: boolean;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
}

export interface UserCompany {
  id: string;
  company_id: string;
  user_id: string;
  company_role: 'gestor' | 'colaborador';
  companies?: Company;
}

export type ViewMode = 'list' | 'grid';

export interface UserFilters {
  search: string;
  companyId: string;
  role: string;
  status: string;
}

export const PERMISSION_MODULES = [
  { key: "can_access_premium_leads", label: "Leads Premium", description: "Acesso a leads qualificados premium", category: "leads", defaultValue: false },
  { key: "can_access_indicar", label: "Indicar", description: "Indicação de clientes para parceiros", category: "leads", defaultValue: true },
  { key: "can_access_gerador_propostas", label: "Gerador de Propostas", description: "Criar e enviar propostas comerciais", category: "comercial", defaultValue: true },
  { key: "can_access_activate_leads", label: "Activate Leads", description: "Gerenciar e ativar leads recebidos", category: "leads", defaultValue: true },
  { key: "can_access_baseoff_consulta", label: "Consulta Base OFF", description: "Consultar base de dados offline", category: "sistema", defaultValue: true },
  { key: "can_access_meus_clientes", label: "Meus Clientes", description: "Visualizar e gerenciar carteira de clientes", category: "comercial", defaultValue: true },
  { key: "can_access_televendas", label: "Televendas", description: "Módulo de vendas por telefone", category: "comercial", defaultValue: true },
  { key: "can_access_gestao_televendas", label: "Gestão de Televendas", description: "Painel gerencial de televendas", category: "comercial", defaultValue: true },
  { key: "can_access_digitacao", label: "Digitação", description: "Digitar contratos via API bancária", category: "comercial", defaultValue: true },
  { key: "can_access_financas", label: "Finanças", description: "Controle financeiro e transações", category: "financeiro", defaultValue: true },
  { key: "can_access_documentos", label: "Documentos", description: "Upload e gestão de documentos", category: "sistema", defaultValue: true },
  { key: "can_access_alertas", label: "Alertas de Reaproveitamento", description: "Receber alertas de oportunidades", category: "sistema", defaultValue: true },
  { key: "can_access_tabela_comissoes", label: "Tabela de Comissões", description: "Visualizar tabela de comissões", category: "financeiro", defaultValue: true },
  { key: "can_access_minhas_comissoes", label: "Minhas Comissões", description: "Acompanhar comissões pessoais", category: "financeiro", defaultValue: true },
  { key: "can_access_relatorio_desempenho", label: "Relatório de Desempenho", description: "Relatórios detalhados de performance", category: "relatorios", defaultValue: false },
  { key: "can_access_colaborativo", label: "Colaborativo", description: "Ferramentas de trabalho em equipe", category: "sistema", defaultValue: true },
  { key: "can_access_controle_ponto", label: "Controle de Ponto", description: "Registro de ponto e jornada", category: "sistema", defaultValue: true },
  { key: "can_access_meu_numero", label: "Meu Número", description: "Gerenciar linha telefônica virtual", category: "comunicacao", defaultValue: true },
  { key: "can_access_sms", label: "Comunicação SMS", description: "Envio de SMS em massa e automações", category: "comunicacao", defaultValue: false },
  { key: "can_access_whatsapp", label: "WhatsApp", description: "Integração e envio via WhatsApp", category: "comunicacao", defaultValue: false },
  { key: "can_access_radar", label: "Radar de Oportunidades", description: "Buscar oportunidades na base", category: "leads", defaultValue: true },
  { key: "can_access_autolead", label: "AutoLead", description: "Disparo automático de leads", category: "leads", defaultValue: true },
] as const;

export const PERMISSION_CATEGORIES = [
  { id: "comercial", label: "Comercial", icon: "ShoppingCart" },
  { id: "leads", label: "Leads", icon: "Target" },
  { id: "financeiro", label: "Financeiro", icon: "DollarSign" },
  { id: "sistema", label: "Sistema", icon: "Settings" },
  { id: "comunicacao", label: "Comunicação", icon: "MessageSquare" },
  { id: "relatorios", label: "Relatórios", icon: "BarChart3" },
] as const;
