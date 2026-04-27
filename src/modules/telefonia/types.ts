export interface NormPhone {
  id?: string;
  ddd: string | null;
  numero: string | null;
  numero_completo: string | null;
  tipo: "celular" | "fixo" | null;
  tem_whatsapp: boolean | null;
  procon: boolean | null;
  operadora: string | null;
  flhot: boolean | null;
  assinante: boolean | null;
  posicao: number | null;
}

export interface ConsultaResponse {
  status: "success" | "not_found" | "auth_error" | "no_access" | "quota_exceeded" | "error";
  cached?: boolean;
  from_cache?: boolean;
  consulta_id?: string;
  resultado?: any;
  telefones?: NormPhone[];
  nome_retornado?: string | null;
  error?: string | null;
  cached_at?: string;
}
