export interface Did {
  CODIGO: number;
  VALOR_MENSAL: number;
  VALOR_INSTALACAO: number;
  CN: number;
  NUMERO: string;
  GOLD: boolean;
  SUPER_GOLD: boolean;
  DIAMANTE: boolean;
}

export interface Localidade {
  AREA_LOCAL: string;
  CN: number;
  LOCALIDADE: string;
  UF: string;
}

export interface ContratacaoResponse {
  STATUS: string;
  USUARIO: number;
  SENHA: string;
  DOMINIO: string;
}

export interface UserDid {
  id: string;
  user_id: string;
  numero: string;
  cn: number | null;
  area_local: string | null;
  codigo: number | null;
  status: string;
  sip_usuario: string | null;
  sip_senha: string | null;
  sip_dominio: string | null;
  sip_destino: string | null;
  whatsapp_configured: boolean;
  valor_mensal: number | null;
  valor_instalacao: number | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CdrRecord {
  DATA: string;
  HORA: string;
  ORIGEM: string;
  DESTINO: string;
  DURACAO: string;
  STATUS: string;
}

export interface BillingPlano {
  ID: number;
  NOME: string;
  VALOR: number;
  DESCRICAO: string;
}

export interface BillingCliente {
  ID: number;
  NOME: string;
  EMAIL: string;
  CPF_CNPJ: string;
}
