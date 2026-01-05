export type PersonType = 'pf' | 'pj';
export type DocumentStatus = 'pending' | 'sent' | 'approved' | 'rejected';
export type UserDataStatus = 'incomplete' | 'in_review' | 'approved' | 'rejected';

export interface UserData {
  id: string;
  user_id: string;
  person_type: PersonType;
  
  // Common fields
  full_name: string | null;
  phone: string | null;
  personal_email: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  
  // PF fields
  cpf: string | null;
  rg: string | null;
  birth_date: string | null;
  marital_status: string | null;
  
  // PJ fields
  cnpj: string | null;
  trade_name: string | null;
  legal_representative: string | null;
  legal_representative_cpf: string | null;
  
  // Address
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  
  // Status
  status: UserDataStatus;
  
  // Internal observations
  internal_observations: string | null;
  
  // Audit
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface UserDocument {
  id: string;
  user_id: string;
  document_type: string;
  document_name: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  version: number;
  status: DocumentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserDataHistory {
  id: string;
  user_data_id: string;
  changed_by: string | null;
  action: string;
  changes: any;
  created_at: string;
}

export const documentTypes = {
  pf: [
    { value: 'rg_cnh', label: 'RG ou CNH' },
    { value: 'residence_proof', label: 'Comprovante de Residência' },
    { value: 'enrollment_proof', label: 'Comprovante de Matrícula / Vínculo' },
    { value: 'other', label: 'Outros' },
  ],
  pj: [
    { value: 'social_contract', label: 'Contrato Social' },
    { value: 'residence_proof', label: 'Comprovante de Residência' },
    { value: 'other', label: 'Outros' },
  ],
};

export const maritalStatusOptions = [
  { value: 'single', label: 'Solteiro(a)' },
  { value: 'married', label: 'Casado(a)' },
  { value: 'divorced', label: 'Divorciado(a)' },
  { value: 'widowed', label: 'Viúvo(a)' },
  { value: 'other', label: 'Outro' },
];

export const pixKeyTypeOptions = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'random', label: 'Chave Aleatória' },
];

export const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];
