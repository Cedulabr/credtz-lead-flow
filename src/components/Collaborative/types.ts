export type AccessType = 'admin' | 'operator' | 'readonly';
export type LinkCategory = 'banco' | 'governo' | 'parceiros' | 'marketing' | 'ferramentas' | 'outros';

export interface CollaborativePassword {
  id: string;
  system_name: string;
  access_url: string | null;
  login_user: string | null;
  encrypted_password: string;
  access_type: AccessType;
  responsible_id: string | null;
  observations: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  responsible?: { name: string; email: string } | null;
  creator?: { name: string; email: string } | null;
}

export interface CollaborativeLink {
  id: string;
  name: string;
  category: LinkCategory;
  url: string;
  description: string | null;
  is_active: boolean;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface CollaborativeSystem {
  id: string;
  name: string;
  purpose: string | null;
  main_url: string | null;
  environment: string;
  integrations: string[] | null;
  technical_notes: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface CollaborativeProcess {
  id: string;
  title: string;
  content: string | null;
  attachments: any;
  version: number;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface CollaborativeDocument {
  id: string;
  name: string;
  file_url: string | null;
  file_type: string | null;
  description: string | null;
  category: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  user_id: string | null;
  details: any;
  created_at: string;
  user?: { name: string; email: string } | null;
}

export interface Comment {
  id: string;
  table_name: string;
  record_id: string;
  content: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  user?: { name: string; email: string } | null;
}

export const LINK_CATEGORIES: { value: LinkCategory; label: string }[] = [
  { value: 'banco', label: 'Banco' },
  { value: 'governo', label: 'Governo' },
  { value: 'parceiros', label: 'Parceiros' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'ferramentas', label: 'Ferramentas' },
  { value: 'outros', label: 'Outros' },
];

export const ACCESS_TYPES: { value: AccessType; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'operator', label: 'Operador' },
  { value: 'readonly', label: 'Somente Leitura' },
];
