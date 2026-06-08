// Maps module_key (new system) → legacy profile boolean flag.
// Modules NOT listed here have no legacy column and rely exclusively on module_permissions.
export const MODULE_TO_PROFILE_FLAG: Record<string, string> = {
  "time-clock": "can_access_controle_ponto",
  leads: "can_access_premium_leads",
  digitacao: "can_access_digitacao",
  "digitacao-agibank": "can_access_portflow",
  sms: "can_access_sms",
  whatsapp: "can_access_whatsapp",
  voicer: "can_access_voicer",
  notas: "can_access_notas",
  telefonia: "can_access_telefonia",
  reaproveitamento: "can_access_reaproveitamento",
  finances: "can_access_financas",
  "commission-table": "can_access_tabela_comissoes",
  commissions: "can_access_minhas_comissoes",
  "reuse-alerts": "can_access_alertas",
  "performance-report": "can_access_relatorio_desempenho",
  collaborative: "can_access_colaborativo",
  documents: "can_access_documentos",
  "proposal-generator": "can_access_gerador_propostas",
  "activate-leads": "can_access_activate_leads",
  "my-clients": "can_access_meus_clientes",
  televendas: "can_access_televendas",
  "televendas-manage": "can_access_gestao_televendas",
};

export const PROFILE_FLAG_TO_MODULE = Object.fromEntries(
  Object.entries(MODULE_TO_PROFILE_FLAG).map(([moduleKey, profileFlag]) => [profileFlag, moduleKey])
) as Record<string, string>;
