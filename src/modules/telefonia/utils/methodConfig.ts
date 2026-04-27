export type Metodo = "NVBOOK_CEL_OBG_WHATS" | "NVBOOK_CEL_OBG" | "NVCHECK_JSON";

export const METODOS: Array<{
  value: Metodo;
  label: string;
  helper: string;
  icon: string;
}> = [
  {
    value: "NVBOOK_CEL_OBG_WHATS",
    label: "Celular com WhatsApp obrigatório",
    icon: "📱",
    helper: "Retorna celulares com indicação de WhatsApp, dados cadastrais e score",
  },
  {
    value: "NVBOOK_CEL_OBG",
    label: "Celular obrigatório",
    icon: "📞",
    helper: "Retorna celulares e telefones fixos com dados cadastrais",
  },
  {
    value: "NVCHECK_JSON",
    label: "Consulta completa (NVCHECK)",
    icon: "🔎",
    helper: "Consulta completa: score detalhado, empresas, PEP, endereços, pessoas ligadas",
  },
];

export function methodLabel(m?: string | null) {
  return METODOS.find((x) => x.value === m)?.label ?? m ?? "—";
}
