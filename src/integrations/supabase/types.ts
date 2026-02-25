export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      activate_leads: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          data_proxima_operacao: string | null
          has_quality_issues: boolean | null
          id: string
          motivo_recusa: string | null
          nome: string
          origem: string
          produto: string | null
          proxima_acao: string | null
          quality_issues: Json | null
          sanitized: boolean | null
          sanitized_at: string | null
          segunda_tentativa: boolean | null
          segunda_tentativa_at: string | null
          segunda_tentativa_by: string | null
          simulation_id: string | null
          simulation_status: string | null
          status: string
          telefone: string
          ultima_interacao: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_proxima_operacao?: string | null
          has_quality_issues?: boolean | null
          id?: string
          motivo_recusa?: string | null
          nome: string
          origem?: string
          produto?: string | null
          proxima_acao?: string | null
          quality_issues?: Json | null
          sanitized?: boolean | null
          sanitized_at?: string | null
          segunda_tentativa?: boolean | null
          segunda_tentativa_at?: string | null
          segunda_tentativa_by?: string | null
          simulation_id?: string | null
          simulation_status?: string | null
          status?: string
          telefone: string
          ultima_interacao?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_proxima_operacao?: string | null
          has_quality_issues?: boolean | null
          id?: string
          motivo_recusa?: string | null
          nome?: string
          origem?: string
          produto?: string | null
          proxima_acao?: string | null
          quality_issues?: Json | null
          sanitized?: boolean | null
          sanitized_at?: string | null
          segunda_tentativa?: boolean | null
          segunda_tentativa_at?: string | null
          segunda_tentativa_by?: string | null
          simulation_id?: string | null
          simulation_status?: string | null
          status?: string
          telefone?: string
          ultima_interacao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activate_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activate_leads_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "activate_leads_simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      activate_leads_blacklist: {
        Row: {
          blacklisted_at: string | null
          blacklisted_by: string | null
          cpf: string | null
          created_at: string | null
          expires_at: string
          id: string
          nome: string | null
          original_lead_id: string | null
          reason: string
          telefone: string
        }
        Insert: {
          blacklisted_at?: string | null
          blacklisted_by?: string | null
          cpf?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          nome?: string | null
          original_lead_id?: string | null
          reason: string
          telefone: string
        }
        Update: {
          blacklisted_at?: string | null
          blacklisted_by?: string | null
          cpf?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          nome?: string | null
          original_lead_id?: string | null
          reason?: string
          telefone?: string
        }
        Relationships: [
          {
            foreignKeyName: "activate_leads_blacklist_original_lead_id_fkey"
            columns: ["original_lead_id"]
            isOneToOne: false
            referencedRelation: "activate_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      activate_leads_contact_proofs: {
        Row: {
          attempt_number: number
          created_at: string
          file_name: string
          id: string
          lead_id: string
          notes: string | null
          proof_type: string
          proof_url: string
          user_id: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          file_name: string
          id?: string
          lead_id: string
          notes?: string | null
          proof_type: string
          proof_url: string
          user_id: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          file_name?: string
          id?: string
          lead_id?: string
          notes?: string | null
          proof_type?: string
          proof_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activate_leads_contact_proofs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "activate_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      activate_leads_distribution: {
        Row: {
          created_at: string
          distributed_at: string
          id: string
          lead_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          distributed_at?: string
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          distributed_at?: string
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activate_leads_distribution_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "activate_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      activate_leads_duplicate_logs: {
        Row: {
          action: string
          action_details: Json | null
          duplicate_id: string | null
          duplicate_lead_id: string | null
          id: string
          original_lead_id: string | null
          performed_at: string
          performed_by: string
        }
        Insert: {
          action: string
          action_details?: Json | null
          duplicate_id?: string | null
          duplicate_lead_id?: string | null
          id?: string
          original_lead_id?: string | null
          performed_at?: string
          performed_by: string
        }
        Update: {
          action?: string
          action_details?: Json | null
          duplicate_id?: string | null
          duplicate_lead_id?: string | null
          id?: string
          original_lead_id?: string | null
          performed_at?: string
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "activate_leads_duplicate_logs_duplicate_id_fkey"
            columns: ["duplicate_id"]
            isOneToOne: false
            referencedRelation: "activate_leads_duplicates"
            referencedColumns: ["id"]
          },
        ]
      }
      activate_leads_duplicates: {
        Row: {
          created_at: string
          duplicate_lead_id: string
          id: string
          match_type: string
          original_lead_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          similarity_score: number
          status: string
        }
        Insert: {
          created_at?: string
          duplicate_lead_id: string
          id?: string
          match_type: string
          original_lead_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_score?: number
          status?: string
        }
        Update: {
          created_at?: string
          duplicate_lead_id?: string
          id?: string
          match_type?: string
          original_lead_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_score?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "activate_leads_duplicates_duplicate_lead_id_fkey"
            columns: ["duplicate_lead_id"]
            isOneToOne: false
            referencedRelation: "activate_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activate_leads_duplicates_original_lead_id_fkey"
            columns: ["original_lead_id"]
            isOneToOne: false
            referencedRelation: "activate_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      activate_leads_history: {
        Row: {
          action_type: string
          created_at: string
          from_status: string | null
          id: string
          lead_id: string
          metadata: Json | null
          notes: string | null
          to_status: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          from_status?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          notes?: string | null
          to_status?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          from_status?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          notes?: string | null
          to_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activate_leads_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "activate_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      activate_leads_notifications: {
        Row: {
          created_at: string
          gestor_id: string | null
          id: string
          is_notified: boolean | null
          lead_id: string
          notification_type: string
          notified_at: string | null
          scheduled_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gestor_id?: string | null
          id?: string
          is_notified?: boolean | null
          lead_id: string
          notification_type: string
          notified_at?: string | null
          scheduled_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          gestor_id?: string | null
          id?: string
          is_notified?: boolean | null
          lead_id?: string
          notification_type?: string
          notified_at?: string | null
          scheduled_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activate_leads_notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "activate_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      activate_leads_simulation_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          lead_id: string
          message: string
          simulation_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          lead_id: string
          message: string
          simulation_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          lead_id?: string
          message?: string
          simulation_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activate_leads_simulation_notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "activate_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activate_leads_simulation_notifications_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "activate_leads_simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      activate_leads_simulations: {
        Row: {
          banco: string | null
          completed_at: string | null
          completed_by: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          parcela: number | null
          produto: string | null
          requested_at: string
          requested_by: string
          status: string
          updated_at: string
          valor_liberado: number | null
        }
        Insert: {
          banco?: string | null
          completed_at?: string | null
          completed_by?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          parcela?: number | null
          produto?: string | null
          requested_at?: string
          requested_by: string
          status?: string
          updated_at?: string
          valor_liberado?: number | null
        }
        Update: {
          banco?: string | null
          completed_at?: string | null
          completed_by?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          parcela?: number | null
          produto?: string | null
          requested_at?: string
          requested_by?: string
          status?: string
          updated_at?: string
          valor_liberado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activate_leads_simulations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "activate_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by_id: string | null
          id: number
          is_active: boolean | null
          organization_id: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by_id?: string | null
          id?: number
          is_active?: boolean | null
          organization_id?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by_id?: string | null
          id?: number
          is_active?: boolean | null
          organization_id?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      app_users: {
        Row: {
          company_id: string | null
          cpf: string
          created_at: string | null
          id: string
          idade: number | null
          nome: string | null
          telefone: string
          tipo_convenio: string | null
          ultimo_acesso: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          cpf: string
          created_at?: string | null
          id?: string
          idade?: number | null
          nome?: string | null
          telefone: string
          tipo_convenio?: string | null
          ultimo_acesso?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          cpf?: string
          created_at?: string | null
          id?: string
          idade?: number | null
          nome?: string | null
          telefone?: string
          tipo_convenio?: string | null
          ultimo_acesso?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          id: string
          operation: string
          record_id: string | null
          table_name: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          operation: string
          record_id?: string | null
          table_name: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          operation?: string
          record_id?: string | null
          table_name?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_reuse_settings: {
        Row: {
          bank_name: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          reuse_months: number
          updated_at: string
        }
        Insert: {
          bank_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          reuse_months?: number
          updated_at?: string
        }
        Update: {
          bank_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          reuse_months?: number
          updated_at?: string
        }
        Relationships: []
      }
      banks: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
          price: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
          price?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
          price?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      banks_products: {
        Row: {
          bank_name: string
          base_commission_percentage: number
          created_at: string
          id: string
          is_active: boolean | null
          product_name: string
          term: string | null
          updated_at: string
        }
        Insert: {
          bank_name: string
          base_commission_percentage: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          product_name: string
          term?: string | null
          updated_at?: string
        }
        Update: {
          bank_name?: string
          base_commission_percentage?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          product_name?: string
          term?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      baseoff: {
        Row: {
          banco: string
          cpf: string
          created_at: string
          id: string
          margem_disponivel: string | null
          municipio: string | null
          nome: string
          telefone1: string | null
          telefone2: string | null
          telefone3: string | null
          uf: string | null
          updated_at: string
          valor_beneficio: string | null
        }
        Insert: {
          banco: string
          cpf: string
          created_at?: string
          id?: string
          margem_disponivel?: string | null
          municipio?: string | null
          nome: string
          telefone1?: string | null
          telefone2?: string | null
          telefone3?: string | null
          uf?: string | null
          updated_at?: string
          valor_beneficio?: string | null
        }
        Update: {
          banco?: string
          cpf?: string
          created_at?: string
          id?: string
          margem_disponivel?: string | null
          municipio?: string | null
          nome?: string
          telefone1?: string | null
          telefone2?: string | null
          telefone3?: string | null
          uf?: string | null
          updated_at?: string
          valor_beneficio?: string | null
        }
        Relationships: []
      }
      baseoff_active_clients: {
        Row: {
          assigned_at: string
          client_id: string
          cpf: string
          created_at: string
          id: string
          notes: string | null
          status: string
          status_updated_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          cpf: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          status_updated_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          cpf?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          status_updated_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "baseoff_active_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "baseoff_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      baseoff_allowed_banks: {
        Row: {
          codigo_banco: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          codigo_banco: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          codigo_banco?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      baseoff_clients: {
        Row: {
          agencia_pagto: string | null
          bairro: string | null
          bairro_1: string | null
          banco_pagto: string | null
          banco_rcc: string | null
          banco_rmc: string | null
          bloqueio: string | null
          cep: string | null
          cep_1: string | null
          cidade_1: string | null
          conta_corrente: string | null
          cpf: string
          created_at: string
          data_nascimento: string | null
          ddb: string | null
          dib: string | null
          email_1: string | null
          email_2: string | null
          email_3: string | null
          endereco: string | null
          esp: string | null
          id: string
          import_batch_id: string | null
          imported_by: string | null
          logr_complemento_1: string | null
          logr_nome_1: string | null
          logr_numero_1: string | null
          logr_tipo_1: string | null
          logr_titulo_1: string | null
          meio_pagto: string | null
          mr: number | null
          municipio: string | null
          naturalidade: string | null
          nb: string
          nome: string
          nome_mae: string | null
          nome_pai: string | null
          orgao_pagador: string | null
          pensao_alimenticia: string | null
          representante: string | null
          sexo: string | null
          status_beneficio: string | null
          tel_cel_1: string | null
          tel_cel_2: string | null
          tel_cel_3: string | null
          tel_fixo_1: string | null
          tel_fixo_2: string | null
          tel_fixo_3: string | null
          uf: string | null
          uf_1: string | null
          updated_at: string
          valor_rcc: number | null
          valor_rmc: number | null
        }
        Insert: {
          agencia_pagto?: string | null
          bairro?: string | null
          bairro_1?: string | null
          banco_pagto?: string | null
          banco_rcc?: string | null
          banco_rmc?: string | null
          bloqueio?: string | null
          cep?: string | null
          cep_1?: string | null
          cidade_1?: string | null
          conta_corrente?: string | null
          cpf: string
          created_at?: string
          data_nascimento?: string | null
          ddb?: string | null
          dib?: string | null
          email_1?: string | null
          email_2?: string | null
          email_3?: string | null
          endereco?: string | null
          esp?: string | null
          id?: string
          import_batch_id?: string | null
          imported_by?: string | null
          logr_complemento_1?: string | null
          logr_nome_1?: string | null
          logr_numero_1?: string | null
          logr_tipo_1?: string | null
          logr_titulo_1?: string | null
          meio_pagto?: string | null
          mr?: number | null
          municipio?: string | null
          naturalidade?: string | null
          nb: string
          nome: string
          nome_mae?: string | null
          nome_pai?: string | null
          orgao_pagador?: string | null
          pensao_alimenticia?: string | null
          representante?: string | null
          sexo?: string | null
          status_beneficio?: string | null
          tel_cel_1?: string | null
          tel_cel_2?: string | null
          tel_cel_3?: string | null
          tel_fixo_1?: string | null
          tel_fixo_2?: string | null
          tel_fixo_3?: string | null
          uf?: string | null
          uf_1?: string | null
          updated_at?: string
          valor_rcc?: number | null
          valor_rmc?: number | null
        }
        Update: {
          agencia_pagto?: string | null
          bairro?: string | null
          bairro_1?: string | null
          banco_pagto?: string | null
          banco_rcc?: string | null
          banco_rmc?: string | null
          bloqueio?: string | null
          cep?: string | null
          cep_1?: string | null
          cidade_1?: string | null
          conta_corrente?: string | null
          cpf?: string
          created_at?: string
          data_nascimento?: string | null
          ddb?: string | null
          dib?: string | null
          email_1?: string | null
          email_2?: string | null
          email_3?: string | null
          endereco?: string | null
          esp?: string | null
          id?: string
          import_batch_id?: string | null
          imported_by?: string | null
          logr_complemento_1?: string | null
          logr_nome_1?: string | null
          logr_numero_1?: string | null
          logr_tipo_1?: string | null
          logr_titulo_1?: string | null
          meio_pagto?: string | null
          mr?: number | null
          municipio?: string | null
          naturalidade?: string | null
          nb?: string
          nome?: string
          nome_mae?: string | null
          nome_pai?: string | null
          orgao_pagador?: string | null
          pensao_alimenticia?: string | null
          representante?: string | null
          sexo?: string | null
          status_beneficio?: string | null
          tel_cel_1?: string | null
          tel_cel_2?: string | null
          tel_cel_3?: string | null
          tel_fixo_1?: string | null
          tel_fixo_2?: string | null
          tel_fixo_3?: string | null
          uf?: string | null
          uf_1?: string | null
          updated_at?: string
          valor_rcc?: number | null
          valor_rmc?: number | null
        }
        Relationships: []
      }
      baseoff_contracts: {
        Row: {
          banco_emprestimo: string
          client_id: string
          competencia: string | null
          competencia_final: string | null
          contrato: string
          cpf: string
          created_at: string
          data_averbacao: string | null
          id: string
          inicio_desconto: string | null
          prazo: number | null
          saldo: number | null
          situacao_emprestimo: string | null
          taxa: number | null
          tipo_emprestimo: string | null
          updated_at: string
          vl_emprestimo: number | null
          vl_parcela: number | null
        }
        Insert: {
          banco_emprestimo: string
          client_id: string
          competencia?: string | null
          competencia_final?: string | null
          contrato: string
          cpf: string
          created_at?: string
          data_averbacao?: string | null
          id?: string
          inicio_desconto?: string | null
          prazo?: number | null
          saldo?: number | null
          situacao_emprestimo?: string | null
          taxa?: number | null
          tipo_emprestimo?: string | null
          updated_at?: string
          vl_emprestimo?: number | null
          vl_parcela?: number | null
        }
        Update: {
          banco_emprestimo?: string
          client_id?: string
          competencia?: string | null
          competencia_final?: string | null
          contrato?: string
          cpf?: string
          created_at?: string
          data_averbacao?: string | null
          id?: string
          inicio_desconto?: string | null
          prazo?: number | null
          saldo?: number | null
          situacao_emprestimo?: string | null
          taxa?: number | null
          tipo_emprestimo?: string | null
          updated_at?: string
          vl_emprestimo?: number | null
          vl_parcela?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "baseoff_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "baseoff_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      baseoff_import_batches: {
        Row: {
          completed_at: string | null
          created_at: string
          error_count: number
          error_details: Json | null
          file_name: string
          id: string
          imported_by: string
          status: string
          success_count: number
          total_records: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_count?: number
          error_details?: Json | null
          file_name: string
          id?: string
          imported_by: string
          status?: string
          success_count?: number
          total_records?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_count?: number
          error_details?: Json | null
          file_name?: string
          id?: string
          imported_by?: string
          status?: string
          success_count?: number
          total_records?: number
        }
        Relationships: []
      }
      baseoff_lead_tracking: {
        Row: {
          cpf: string
          created_at: string
          future_contact_date: string | null
          id: string
          offered_value: number | null
          rejection_notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cpf: string
          created_at?: string
          future_contact_date?: string | null
          id?: string
          offered_value?: number | null
          rejection_notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cpf?: string
          created_at?: string
          future_contact_date?: string | null
          id?: string
          offered_value?: number | null
          rejection_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      baseoff_notifications: {
        Row: {
          cpf: string
          created_at: string
          gestor_id: string | null
          id: string
          is_notified: boolean | null
          notified_at: string | null
          scheduled_date: string
          tracking_id: string | null
          user_id: string
        }
        Insert: {
          cpf: string
          created_at?: string
          gestor_id?: string | null
          id?: string
          is_notified?: boolean | null
          notified_at?: string | null
          scheduled_date: string
          tracking_id?: string | null
          user_id: string
        }
        Update: {
          cpf?: string
          created_at?: string
          gestor_id?: string | null
          id?: string
          is_notified?: boolean | null
          notified_at?: string | null
          scheduled_date?: string
          tracking_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "baseoff_notifications_tracking_id_fkey"
            columns: ["tracking_id"]
            isOneToOne: false
            referencedRelation: "baseoff_lead_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      baseoff_requests: {
        Row: {
          codigo_banco: string | null
          id: string
          leads_count: number
          requested_at: string
          user_id: string
        }
        Insert: {
          codigo_banco?: string | null
          id?: string
          leads_count?: number
          requested_at?: string
          user_id: string
        }
        Update: {
          codigo_banco?: string | null
          id?: string
          leads_count?: number
          requested_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_deletion_requests: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          proposta_id: number
          reason: string
          requested_at: string | null
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          proposta_id: number
          reason: string
          requested_at?: string | null
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          proposta_id?: number
          reason?: string
          requested_at?: string | null
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_deletion_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_deletion_requests_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_cpf: string
          client_name: string
          company_id: string | null
          created_at: string
          document_type: string
          file_name: string
          file_url: string
          id: string
          origin: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          client_cpf: string
          client_name: string
          company_id?: string | null
          created_at?: string
          document_type: string
          file_name: string
          file_url: string
          id?: string
          origin?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          client_cpf?: string
          client_name?: string
          company_id?: string | null
          created_at?: string
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          origin?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_interactions: {
        Row: {
          created_at: string
          from_status: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          notes: string | null
          proposta_id: number
          to_status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          from_status?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          notes?: string | null
          proposta_id: number
          to_status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          from_status?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          notes?: string | null
          proposta_id?: number
          to_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_interactions_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      client_leads: {
        Row: {
          app_user_id: string | null
          classificacao: string | null
          company_id: string | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
          id: string
          nome: string
          parcelas_restantes: number | null
          possui_emprestimo: boolean | null
          potencial_valor: number | null
          resultado_texto: string | null
          score: number | null
          status: string | null
          telefone: string
          tipo_beneficio: string | null
          updated_at: string | null
          valor_parcela: number | null
        }
        Insert: {
          app_user_id?: string | null
          classificacao?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          id?: string
          nome: string
          parcelas_restantes?: number | null
          possui_emprestimo?: boolean | null
          potencial_valor?: number | null
          resultado_texto?: string | null
          score?: number | null
          status?: string | null
          telefone: string
          tipo_beneficio?: string | null
          updated_at?: string | null
          valor_parcela?: number | null
        }
        Update: {
          app_user_id?: string | null
          classificacao?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          id?: string
          nome?: string
          parcelas_restantes?: number | null
          possui_emprestimo?: boolean | null
          potencial_valor?: number | null
          resultado_texto?: string | null
          score?: number | null
          status?: string | null
          telefone?: string
          tipo_beneficio?: string | null
          updated_at?: string | null
          valor_parcela?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_leads_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_reuse_alerts: {
        Row: {
          alert_date: string
          bank_name: string
          client_cpf: string | null
          client_name: string
          client_phone: string | null
          company_id: string | null
          created_at: string
          gestor_id: string | null
          id: string
          notes: string | null
          notified_at: string | null
          payment_date: string
          proposta_id: number
          reuse_months: number
          status: string
          televendas_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_date: string
          bank_name: string
          client_cpf?: string | null
          client_name: string
          client_phone?: string | null
          company_id?: string | null
          created_at?: string
          gestor_id?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          payment_date: string
          proposta_id: number
          reuse_months: number
          status?: string
          televendas_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_date?: string
          bank_name?: string
          client_cpf?: string | null
          client_name?: string
          client_phone?: string | null
          company_id?: string | null
          created_at?: string
          gestor_id?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          payment_date?: string
          proposta_id?: number
          reuse_months?: number
          status?: string
          televendas_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_reuse_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_reuse_alerts_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_reuse_alerts_televendas_id_fkey"
            columns: ["televendas_id"]
            isOneToOne: false
            referencedRelation: "televendas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          beneficio: string | null
          contatos: Json | null
          cpf: string
          created_at: string | null
          dt_nascimento: string | null
          id: string
          idade: number | null
          margem: number | null
          nome: string | null
          updated_at: string | null
          vl_beneficio: number | null
        }
        Insert: {
          beneficio?: string | null
          contatos?: Json | null
          cpf: string
          created_at?: string | null
          dt_nascimento?: string | null
          id?: string
          idade?: number | null
          margem?: number | null
          nome?: string | null
          updated_at?: string | null
          vl_beneficio?: number | null
        }
        Update: {
          beneficio?: string | null
          contatos?: Json | null
          cpf?: string
          created_at?: string | null
          dt_nascimento?: string | null
          id?: string
          idade?: number | null
          margem?: number | null
          nome?: string | null
          updated_at?: string | null
          vl_beneficio?: number | null
        }
        Relationships: []
      }
      collaborative_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      collaborative_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          record_id: string
          table_name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          record_id: string
          table_name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          record_id?: string
          table_name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      collaborative_documents: {
        Row: {
          category: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          file_type: string | null
          file_url: string | null
          id: string
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_links: {
        Row: {
          category:
            | Database["public"]["Enums"]["collaborative_link_category"]
            | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          updated_by: string | null
          url: string
        }
        Insert: {
          category?:
            | Database["public"]["Enums"]["collaborative_link_category"]
            | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          updated_by?: string | null
          url: string
        }
        Update: {
          category?:
            | Database["public"]["Enums"]["collaborative_link_category"]
            | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          updated_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_password_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          encrypted_password: string
          id: string
          password_id: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          encrypted_password: string
          id?: string
          password_id?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          encrypted_password?: string
          id?: string
          password_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_password_history_password_id_fkey"
            columns: ["password_id"]
            isOneToOne: false
            referencedRelation: "collaborative_passwords"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_passwords: {
        Row: {
          access_type:
            | Database["public"]["Enums"]["collaborative_access_type"]
            | null
          access_url: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          encrypted_password: string
          id: string
          login_user: string | null
          observations: string | null
          responsible_id: string | null
          system_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          access_type?:
            | Database["public"]["Enums"]["collaborative_access_type"]
            | null
          access_url?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          encrypted_password: string
          id?: string
          login_user?: string | null
          observations?: string | null
          responsible_id?: string | null
          system_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          access_type?:
            | Database["public"]["Enums"]["collaborative_access_type"]
            | null
          access_url?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          encrypted_password?: string
          id?: string
          login_user?: string | null
          observations?: string | null
          responsible_id?: string | null
          system_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_passwords_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_processes: {
        Row: {
          attachments: Json | null
          company_id: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          title: string
          updated_at: string | null
          updated_by: string | null
          version: number | null
        }
        Insert: {
          attachments?: Json | null
          company_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Update: {
          attachments?: Json | null
          company_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_processes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_systems: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          environment: string | null
          id: string
          integrations: string[] | null
          main_url: string | null
          name: string
          purpose: string | null
          technical_notes: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          environment?: string | null
          id?: string
          integrations?: string[] | null
          main_url?: string | null
          name: string
          purpose?: string | null
          technical_notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          environment?: string | null
          id?: string
          integrations?: string[] | null
          main_url?: string | null
          name?: string
          purpose?: string | null
          technical_notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_systems_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          bank_name: string
          calculation_model: string
          commission_type: string
          commission_value: number
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          operation_type: string | null
          product_name: string
          secondary_commission_value: number | null
          updated_at: string
          user_level: string
        }
        Insert: {
          bank_name: string
          calculation_model?: string
          commission_type?: string
          commission_value?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          operation_type?: string | null
          product_name: string
          secondary_commission_value?: number | null
          updated_at?: string
          user_level?: string
        }
        Update: {
          bank_name?: string
          calculation_model?: string
          commission_type?: string
          commission_value?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          operation_type?: string | null
          product_name?: string
          secondary_commission_value?: number | null
          updated_at?: string
          user_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_table: {
        Row: {
          bank_name: string
          commission_percentage: number
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          product_name: string
          table_name: string | null
          term: string | null
          updated_at: string | null
          user_percentage: number
          user_percentage_profile: string | null
        }
        Insert: {
          bank_name: string
          commission_percentage: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          product_name: string
          table_name?: string | null
          term?: string | null
          updated_at?: string | null
          user_percentage: number
          user_percentage_profile?: string | null
        }
        Update: {
          bank_name?: string
          commission_percentage?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          product_name?: string
          table_name?: string | null
          term?: string | null
          updated_at?: string | null
          user_percentage?: number
          user_percentage_profile?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          bank_name: string
          client_name: string
          commission_amount: number
          commission_percentage: number
          company_id: string | null
          cpf: string | null
          created_at: string
          credit_value: number
          id: string
          payment_date: string | null
          payment_method: string | null
          product_type: string
          proposal_date: string | null
          proposal_number: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_name: string
          client_name: string
          commission_amount: number
          commission_percentage: number
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          credit_value: number
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          product_type: string
          proposal_date?: string | null
          proposal_number?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_name?: string
          client_name?: string
          commission_amount?: number
          commission_percentage?: number
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          credit_value?: number
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          product_type?: string
          proposal_date?: string | null
          proposal_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cnpj: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string | null
          created_by: string | null
          dominio: string | null
          id: string
          instagram_handle: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string
          nome_aplicativo: string | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          cnpj?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          created_by?: string | null
          dominio?: string | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          nome_aplicativo?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          cnpj?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          created_by?: string | null
          dominio?: string | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          nome_aplicativo?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      contact_notifications: {
        Row: {
          created_at: string
          gestor_id: string | null
          id: string
          is_notified: boolean | null
          notified_at: string | null
          proposta_id: number
          scheduled_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gestor_id?: string | null
          id?: string
          is_notified?: boolean | null
          notified_at?: string | null
          proposta_id: number
          scheduled_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          gestor_id?: string | null
          id?: string
          is_notified?: boolean | null
          notified_at?: string | null
          proposta_id?: number
          scheduled_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notifications_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          cliente_id: string | null
          data_atualizacao: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          id_banco: string | null
          id_contrato: string | null
          quant_parcelas: number | null
          tipo: string | null
          vl_emprestimo: number | null
          vl_parcela: number | null
        }
        Insert: {
          cliente_id?: string | null
          data_atualizacao?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          id_banco?: string | null
          id_contrato?: string | null
          quant_parcelas?: number | null
          tipo?: string | null
          vl_emprestimo?: number | null
          vl_parcela?: number | null
        }
        Update: {
          cliente_id?: string | null
          data_atualizacao?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          id_banco?: string | null
          id_contrato?: string | null
          quant_parcelas?: number | null
          tipo?: string | null
          vl_emprestimo?: number | null
          vl_parcela?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      convenios: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
          price: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
          price?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
          price?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      credits_history: {
        Row: {
          action: string
          admin_id: string
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          admin_id: string
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_limits: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          max_leads_per_day: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          max_leads_per_day?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          max_leads_per_day?: number
          updated_at?: string
        }
        Relationships: []
      }
      education_content: {
        Row: {
          ativo: boolean | null
          audio_url: string | null
          categoria: string
          company_id: string | null
          created_at: string | null
          descricao: string | null
          id: string
          ordem: number | null
          titulo: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          ativo?: boolean | null
          audio_url?: string | null
          categoria: string
          company_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          ordem?: number | null
          titulo: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          ativo?: boolean | null
          audio_url?: string | null
          categoria?: string
          company_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          ordem?: number | null
          titulo?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "education_content_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          description: string
          due_date: string
          id: string
          is_recurring: boolean | null
          is_recurring_active: boolean | null
          notes: string | null
          parent_transaction_id: string | null
          payment_date: string | null
          recurring_day: number | null
          responsible_id: string | null
          status: string
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          description: string
          due_date: string
          id?: string
          is_recurring?: boolean | null
          is_recurring_active?: boolean | null
          notes?: string | null
          parent_transaction_id?: string | null
          payment_date?: string | null
          recurring_day?: number | null
          responsible_id?: string | null
          status?: string
          type?: string
          updated_at?: string
          value: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string
          id?: string
          is_recurring?: boolean | null
          is_recurring_active?: boolean | null
          notes?: string | null
          parent_transaction_id?: string | null
          payment_date?: string | null
          recurring_day?: number | null
          responsible_id?: string | null
          status?: string
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          client_id: number | null
          created_at: string | null
          form_data: Json | null
          id: number
          organization_id: number | null
          processed_at: string | null
          processed_by_id: string | null
          status: string | null
          template_id: number | null
          updated_at: string | null
        }
        Insert: {
          client_id?: number | null
          created_at?: string | null
          form_data?: Json | null
          id?: number
          organization_id?: number | null
          processed_at?: string | null
          processed_by_id?: string | null
          status?: string | null
          template_id?: number | null
          updated_at?: string | null
        }
        Update: {
          client_id?: number | null
          created_at?: string | null
          form_data?: Json | null
          id?: number
          organization_id?: number | null
          processed_at?: string | null
          processed_by_id?: string | null
          status?: string | null
          template_id?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gestor_inactivity_notifications: {
        Row: {
          company_id: string | null
          created_at: string | null
          days_inactive: number
          gestor_id: string
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          last_lead_request: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          days_inactive: number
          gestor_id: string
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          last_lead_request?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          days_inactive?: number
          gestor_id?: string
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          last_lead_request?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gestor_inactivity_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          chunk_metadata: Json | null
          completed_at: string | null
          created_at: string
          current_chunk: number | null
          duplicate_count: number | null
          error_count: number | null
          error_log: Json | null
          file_hash: string | null
          file_name: string
          file_path: string | null
          file_size_bytes: number
          id: string
          last_processed_offset: number | null
          metadata: Json | null
          module: string
          processed_rows: number | null
          processing_ended_at: string | null
          processing_started_at: string | null
          started_at: string | null
          status: string
          success_count: number | null
          total_rows: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chunk_metadata?: Json | null
          completed_at?: string | null
          created_at?: string
          current_chunk?: number | null
          duplicate_count?: number | null
          error_count?: number | null
          error_log?: Json | null
          file_hash?: string | null
          file_name: string
          file_path?: string | null
          file_size_bytes?: number
          id?: string
          last_processed_offset?: number | null
          metadata?: Json | null
          module?: string
          processed_rows?: number | null
          processing_ended_at?: string | null
          processing_started_at?: string | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          total_rows?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chunk_metadata?: Json | null
          completed_at?: string | null
          created_at?: string
          current_chunk?: number | null
          duplicate_count?: number | null
          error_count?: number | null
          error_log?: Json | null
          file_hash?: string | null
          file_name?: string
          file_path?: string | null
          file_size_bytes?: number
          id?: string
          last_processed_offset?: number | null
          metadata?: Json | null
          module?: string
          processed_rows?: number | null
          processing_ended_at?: string | null
          processing_started_at?: string | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          total_rows?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          company_id: string | null
          created_at: string
          duplicate_count: number
          error_count: number
          error_details: Json | null
          file_hash: string | null
          file_name: string
          file_size_bytes: number | null
          id: string
          imported_by: string
          module: string
          status: string
          success_count: number
          total_records: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          duplicate_count?: number
          error_count?: number
          error_details?: Json | null
          file_hash?: string | null
          file_name: string
          file_size_bytes?: number | null
          id?: string
          imported_by: string
          module: string
          status?: string
          success_count?: number
          total_records?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          duplicate_count?: number
          error_count?: number
          error_details?: Json | null
          file_hash?: string | null
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          imported_by?: string
          module?: string
          status?: string
          success_count?: number
          total_records?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          is_used: boolean
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          is_used?: boolean
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      lead_alerts: {
        Row: {
          alert_type: string
          created_at: string
          executed: boolean | null
          executed_at: string | null
          id: string
          lead_id: string | null
          notes: string | null
          scheduled_date: string
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          executed?: boolean | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          scheduled_date: string
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          executed?: boolean | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          scheduled_date?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_alerts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_inactivity_settings: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          inactivity_days: number
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          inactivity_days?: number
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          inactivity_days?: number
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_inactivity_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_qualification_scores: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string
          pergunta: string
          pontos: number | null
          resposta: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id: string
          pergunta: string
          pontos?: number | null
          resposta?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string
          pergunta?: string
          pontos?: number | null
          resposta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_qualification_scores_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "client_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_requests: {
        Row: {
          banco: string | null
          convenio: string | null
          id: string
          leads_count: number
          produto: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          banco?: string | null
          convenio?: string | null
          id?: string
          leads_count?: number
          produto?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          banco?: string | null
          convenio?: string | null
          id?: string
          leads_count?: number
          produto?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_simulations: {
        Row: {
          banco: string | null
          completed_at: string | null
          completed_by: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          parcela: number | null
          produto: string | null
          requested_at: string
          requested_by: string
          simulation_file_name: string | null
          simulation_file_url: string | null
          status: string
          updated_at: string
          valor_liberado: number | null
        }
        Insert: {
          banco?: string | null
          completed_at?: string | null
          completed_by?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          parcela?: number | null
          produto?: string | null
          requested_at?: string
          requested_by: string
          simulation_file_name?: string | null
          simulation_file_url?: string | null
          status?: string
          updated_at?: string
          valor_liberado?: number | null
        }
        Update: {
          banco?: string | null
          completed_at?: string | null
          completed_by?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          parcela?: number | null
          produto?: string | null
          requested_at?: string
          requested_by?: string
          simulation_file_name?: string | null
          simulation_file_url?: string | null
          status?: string
          updated_at?: string
          valor_liberado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_simulations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          banco_operacao: string | null
          company_id: string | null
          convenio: string | null
          cpf: string
          created_at: string | null
          created_by: string | null
          future_contact_date: string | null
          history: Json | null
          id: string
          is_rework: boolean | null
          name: string
          notes: string | null
          origem_lead: string | null
          original_status: string | null
          phone: string
          phone2: string | null
          priority: string | null
          rejection_bank: string | null
          rejection_description: string | null
          rejection_offered_value: number | null
          rejection_reason: string | null
          requested_at: string | null
          requested_by: string | null
          rework_date: string | null
          simulation_id: string | null
          simulation_status: string | null
          stage: string | null
          status: string | null
          tag: string | null
          updated_at: string | null
          valor_operacao: number | null
        }
        Insert: {
          assigned_to?: string | null
          banco_operacao?: string | null
          company_id?: string | null
          convenio?: string | null
          cpf: string
          created_at?: string | null
          created_by?: string | null
          future_contact_date?: string | null
          history?: Json | null
          id?: string
          is_rework?: boolean | null
          name: string
          notes?: string | null
          origem_lead?: string | null
          original_status?: string | null
          phone: string
          phone2?: string | null
          priority?: string | null
          rejection_bank?: string | null
          rejection_description?: string | null
          rejection_offered_value?: number | null
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          rework_date?: string | null
          simulation_id?: string | null
          simulation_status?: string | null
          stage?: string | null
          status?: string | null
          tag?: string | null
          updated_at?: string | null
          valor_operacao?: number | null
        }
        Update: {
          assigned_to?: string | null
          banco_operacao?: string | null
          company_id?: string | null
          convenio?: string | null
          cpf?: string
          created_at?: string | null
          created_by?: string | null
          future_contact_date?: string | null
          history?: Json | null
          id?: string
          is_rework?: boolean | null
          name?: string
          notes?: string | null
          origem_lead?: string | null
          original_status?: string | null
          phone?: string
          phone2?: string | null
          priority?: string | null
          rejection_bank?: string | null
          rejection_description?: string | null
          rejection_offered_value?: number | null
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          rework_date?: string | null
          simulation_id?: string | null
          simulation_status?: string | null
          stage?: string | null
          status?: string | null
          tag?: string | null
          updated_at?: string | null
          valor_operacao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "lead_simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_blacklist: {
        Row: {
          cpf: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          reason: string | null
        }
        Insert: {
          cpf: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          cpf?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      leads_database: {
        Row: {
          banco: string | null
          convenio: string
          cpf: string | null
          cpf_added_at: string | null
          cpf_added_by: string | null
          created_at: string
          data_nascimento: string | null
          id: string
          idade: number | null
          is_available: boolean
          name: string
          parcela: number | null
          parcelas_em_aberto: number | null
          parcelas_pagas: number | null
          phone: string
          phone2: string | null
          tag: string | null
          tipo_beneficio: string | null
          updated_at: string
        }
        Insert: {
          banco?: string | null
          convenio: string
          cpf?: string | null
          cpf_added_at?: string | null
          cpf_added_by?: string | null
          created_at?: string
          data_nascimento?: string | null
          id?: string
          idade?: number | null
          is_available?: boolean
          name: string
          parcela?: number | null
          parcelas_em_aberto?: number | null
          parcelas_pagas?: number | null
          phone: string
          phone2?: string | null
          tag?: string | null
          tipo_beneficio?: string | null
          updated_at?: string
        }
        Update: {
          banco?: string | null
          convenio?: string
          cpf?: string | null
          cpf_added_at?: string | null
          cpf_added_by?: string | null
          created_at?: string
          data_nascimento?: string | null
          id?: string
          idade?: number | null
          is_available?: boolean
          name?: string
          parcela?: number | null
          parcelas_em_aberto?: number | null
          parcelas_pagas?: number | null
          phone?: string
          phone2?: string | null
          tag?: string | null
          tipo_beneficio?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leads_distribution: {
        Row: {
          cpf: string | null
          created_at: string
          distributed_at: string
          expires_at: string
          id: string
          lead_id: string | null
          user_id: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          distributed_at?: string
          expires_at?: string
          id?: string
          lead_id?: string | null
          user_id: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          distributed_at?: string
          expires_at?: string
          id?: string
          lead_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_distribution_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_database"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_indicados: {
        Row: {
          company_id: string | null
          convenio: string
          cpf: string
          created_at: string
          created_by: string
          id: string
          nome: string
          observacoes: string | null
          status: string
          telefone: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          convenio: string
          cpf: string
          created_at?: string
          created_by: string
          id?: string
          nome: string
          observacoes?: string | null
          status?: string
          telefone: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          convenio?: string
          cpf?: string
          created_at?: string
          created_by?: string
          id?: string
          nome?: string
          observacoes?: string | null
          status?: string
          telefone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_indicados_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          company_id: string
          created_at: string
          file_name: string
          file_url: string
          id: string
          name: string
          payment_date: string
          transaction_id: string
          uploaded_by: string
        }
        Insert: {
          company_id: string
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          name: string
          payment_date: string
          transaction_id: string
          uploaded_by: string
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          name?: string
          payment_date?: string
          transaction_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_history: {
        Row: {
          changed_by: string
          created_at: string
          from_stage: string | null
          id: string
          notes: string | null
          proposta_id: number
          to_stage: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          proposta_id: number
          to_stage: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          proposta_id?: number
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_history_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
          price: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
          price?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
          price?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          can_access_activate_leads: boolean | null
          can_access_alertas: boolean | null
          can_access_baseoff_consulta: boolean | null
          can_access_colaborativo: boolean | null
          can_access_controle_ponto: boolean | null
          can_access_documentos: boolean | null
          can_access_financas: boolean | null
          can_access_gerador_propostas: boolean | null
          can_access_gestao_televendas: boolean | null
          can_access_indicar: boolean | null
          can_access_meus_clientes: boolean | null
          can_access_minhas_comissoes: boolean | null
          can_access_premium_leads: boolean | null
          can_access_relatorio_desempenho: boolean | null
          can_access_sms: boolean | null
          can_access_tabela_comissoes: boolean | null
          can_access_televendas: boolean | null
          can_access_whatsapp: boolean | null
          company: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          leads_premium_enabled: boolean | null
          level: Database["public"]["Enums"]["user_level"] | null
          name: string | null
          organization_id: number | null
          phone: string | null
          pix_key: string | null
          role: Database["public"]["Enums"]["app_role"]
          sector: string | null
          sms_enabled: boolean | null
          updated_at: string | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          can_access_activate_leads?: boolean | null
          can_access_alertas?: boolean | null
          can_access_baseoff_consulta?: boolean | null
          can_access_colaborativo?: boolean | null
          can_access_controle_ponto?: boolean | null
          can_access_documentos?: boolean | null
          can_access_financas?: boolean | null
          can_access_gerador_propostas?: boolean | null
          can_access_gestao_televendas?: boolean | null
          can_access_indicar?: boolean | null
          can_access_meus_clientes?: boolean | null
          can_access_minhas_comissoes?: boolean | null
          can_access_premium_leads?: boolean | null
          can_access_relatorio_desempenho?: boolean | null
          can_access_sms?: boolean | null
          can_access_tabela_comissoes?: boolean | null
          can_access_televendas?: boolean | null
          can_access_whatsapp?: boolean | null
          company?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          is_active?: boolean | null
          leads_premium_enabled?: boolean | null
          level?: Database["public"]["Enums"]["user_level"] | null
          name?: string | null
          organization_id?: number | null
          phone?: string | null
          pix_key?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          sector?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          can_access_activate_leads?: boolean | null
          can_access_alertas?: boolean | null
          can_access_baseoff_consulta?: boolean | null
          can_access_colaborativo?: boolean | null
          can_access_controle_ponto?: boolean | null
          can_access_documentos?: boolean | null
          can_access_financas?: boolean | null
          can_access_gerador_propostas?: boolean | null
          can_access_gestao_televendas?: boolean | null
          can_access_indicar?: boolean | null
          can_access_meus_clientes?: boolean | null
          can_access_minhas_comissoes?: boolean | null
          can_access_premium_leads?: boolean | null
          can_access_relatorio_desempenho?: boolean | null
          can_access_sms?: boolean | null
          can_access_tabela_comissoes?: boolean | null
          can_access_televendas?: boolean | null
          can_access_whatsapp?: boolean | null
          company?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          leads_premium_enabled?: boolean | null
          level?: Database["public"]["Enums"]["user_level"] | null
          name?: string | null
          organization_id?: number | null
          phone?: string | null
          pix_key?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          sector?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      propostas: {
        Row: {
          assigned_to: string | null
          banco: string | null
          bank_id: number | null
          client_id: number | null
          client_status: string | null
          company_id: string | null
          convenio: string | null
          convenio_id: number | null
          cpf: string | null
          created_at: string | null
          created_by_id: string | null
          data_criacao: string | null
          future_contact_date: string | null
          id: number
          installments: number | null
          last_contact_date: string | null
          "Nome do cliente": string | null
          notes: string | null
          organization_id: number | null
          origem_lead: string | null
          pipeline_stage: string | null
          product_id: number | null
          produto: string | null
          rejection_description: string | null
          rejection_offered_value: number | null
          rejection_reason: string | null
          status: string | null
          telefone: string | null
          updated_at: string | null
          valor: string | null
          valor_proposta: number | null
          value: string | null
          webhookhook: string | null
          whatsapp: string | null
        }
        Insert: {
          assigned_to?: string | null
          banco?: string | null
          bank_id?: number | null
          client_id?: number | null
          client_status?: string | null
          company_id?: string | null
          convenio?: string | null
          convenio_id?: number | null
          cpf?: string | null
          created_at?: string | null
          created_by_id?: string | null
          data_criacao?: string | null
          future_contact_date?: string | null
          id?: number
          installments?: number | null
          last_contact_date?: string | null
          "Nome do cliente"?: string | null
          notes?: string | null
          organization_id?: number | null
          origem_lead?: string | null
          pipeline_stage?: string | null
          product_id?: number | null
          produto?: string | null
          rejection_description?: string | null
          rejection_offered_value?: number | null
          rejection_reason?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
          valor?: string | null
          valor_proposta?: number | null
          value?: string | null
          webhookhook?: string | null
          whatsapp?: string | null
        }
        Update: {
          assigned_to?: string | null
          banco?: string | null
          bank_id?: number | null
          client_id?: number | null
          client_status?: string | null
          company_id?: string | null
          convenio?: string | null
          convenio_id?: number | null
          cpf?: string | null
          created_at?: string | null
          created_by_id?: string | null
          data_criacao?: string | null
          future_contact_date?: string | null
          id?: number
          installments?: number | null
          last_contact_date?: string | null
          "Nome do cliente"?: string | null
          notes?: string | null
          organization_id?: number | null
          origem_lead?: string | null
          pipeline_stage?: string | null
          product_id?: number | null
          produto?: string | null
          rejection_description?: string | null
          rejection_offered_value?: number | null
          rejection_reason?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
          valor?: string | null
          valor_proposta?: number | null
          value?: string | null
          webhookhook?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_convenio_id_fkey"
            columns: ["convenio_id"]
            isOneToOne: false
            referencedRelation: "convenios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_type: string
          count: number
          created_at: string
          id: string
          user_id: string
          window_start: string
        }
        Insert: {
          action_type: string
          count?: number
          created_at?: string
          id?: string
          user_id: string
          window_start?: string
        }
        Update: {
          action_type?: string
          count?: number
          created_at?: string
          id?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      registrodiariobaseoff: {
        Row: {
          created_at: string
          data_registro: string
          id: string
          quantidade_leads: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_registro?: string
          id?: string
          quantidade_leads?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_registro?: string
          id?: string
          quantidade_leads?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_proposals: {
        Row: {
          client_name: string
          client_phone: string
          company_id: string | null
          contracts: Json
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_name: string
          client_phone: string
          company_id?: string | null
          contracts?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_name?: string
          client_phone?: string
          company_id?: string | null
          contracts?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_proposals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          lead_id: string
          message: string
          simulation_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          lead_id: string
          message: string
          simulation_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          lead_id?: string
          message?: string
          simulation_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_notifications_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "lead_simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_campaigns: {
        Row: {
          company_id: string | null
          completed_at: string | null
          contact_list_id: string | null
          created_at: string
          created_by: string
          delivered_count: number | null
          failed_count: number | null
          id: string
          message_content: string
          name: string
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string
          template_id: string | null
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          completed_at?: string | null
          contact_list_id?: string | null
          created_at?: string
          created_by: string
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          message_content: string
          name: string
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          completed_at?: string | null
          contact_list_id?: string | null
          created_at?: string
          created_by?: string
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          message_content?: string
          name?: string
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_campaigns_contact_list_id_fkey"
            columns: ["contact_list_id"]
            isOneToOne: false
            referencedRelation: "sms_contact_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sms_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_contact_lists: {
        Row: {
          company_id: string | null
          contact_count: number | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          contact_count?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          contact_count?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_contact_lists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_contacts: {
        Row: {
          created_at: string
          id: string
          list_id: string
          metadata: Json | null
          name: string | null
          phone: string
          source: string | null
          source_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          metadata?: Json | null
          name?: string | null
          phone: string
          source?: string | null
          source_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          metadata?: Json | null
          name?: string | null
          phone?: string
          source?: string | null
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_contacts_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "sms_contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_history: {
        Row: {
          campaign_id: string | null
          company_id: string | null
          contact_name: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          message: string
          phone: string
          provider_message_id: string | null
          sent_at: string | null
          sent_by: string
          status: string
        }
        Insert: {
          campaign_id?: string | null
          company_id?: string | null
          contact_name?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          phone: string
          provider_message_id?: string | null
          sent_at?: string | null
          sent_by: string
          status?: string
        }
        Update: {
          campaign_id?: string | null
          company_id?: string | null
          contact_name?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          phone?: string
          provider_message_id?: string | null
          sent_at?: string | null
          sent_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sms_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          phone: string
          sent_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          phone: string
          sent_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          phone?: string
          sent_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          company_id: string | null
          content: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      televendas: {
        Row: {
          banco: string
          company_id: string | null
          cpf: string
          created_at: string
          data_cancelamento: string | null
          data_pagamento: string | null
          data_venda: string
          edit_count: number | null
          id: string
          last_sync_at: string | null
          last_sync_by: string | null
          lead_id: string | null
          motivo_pendencia: string | null
          motivo_pendencia_descricao: string | null
          nome: string
          observacao: string | null
          parcela: number
          previsao_saldo: string | null
          prioridade_operacional: string
          saldo_devedor: number | null
          simulation_data: Json | null
          simulation_file_url: string | null
          status: string
          status_bancario: string | null
          status_proposta: string | null
          status_proposta_updated_at: string | null
          status_updated_at: string | null
          status_updated_by: string | null
          telefone: string
          tipo_operacao: string
          troco: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          banco: string
          company_id?: string | null
          cpf: string
          created_at?: string
          data_cancelamento?: string | null
          data_pagamento?: string | null
          data_venda: string
          edit_count?: number | null
          id?: string
          last_sync_at?: string | null
          last_sync_by?: string | null
          lead_id?: string | null
          motivo_pendencia?: string | null
          motivo_pendencia_descricao?: string | null
          nome: string
          observacao?: string | null
          parcela: number
          previsao_saldo?: string | null
          prioridade_operacional?: string
          saldo_devedor?: number | null
          simulation_data?: Json | null
          simulation_file_url?: string | null
          status?: string
          status_bancario?: string | null
          status_proposta?: string | null
          status_proposta_updated_at?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          telefone: string
          tipo_operacao: string
          troco?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          banco?: string
          company_id?: string | null
          cpf?: string
          created_at?: string
          data_cancelamento?: string | null
          data_pagamento?: string | null
          data_venda?: string
          edit_count?: number | null
          id?: string
          last_sync_at?: string | null
          last_sync_by?: string | null
          lead_id?: string | null
          motivo_pendencia?: string | null
          motivo_pendencia_descricao?: string | null
          nome?: string
          observacao?: string | null
          parcela?: number
          previsao_saldo?: string | null
          prioridade_operacional?: string
          saldo_devedor?: number | null
          simulation_data?: Json | null
          simulation_file_url?: string | null
          status?: string
          status_bancario?: string | null
          status_proposta?: string | null
          status_proposta_updated_at?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          telefone?: string
          tipo_operacao?: string
          troco?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "televendas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "televendas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      televendas_banks: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      televendas_edit_history: {
        Row: {
          edited_at: string
          edited_by: string
          fields_changed: string[]
          id: string
          new_data: Json
          original_data: Json
          televendas_id: string
        }
        Insert: {
          edited_at?: string
          edited_by: string
          fields_changed: string[]
          id?: string
          new_data: Json
          original_data: Json
          televendas_id: string
        }
        Update: {
          edited_at?: string
          edited_by?: string
          fields_changed?: string[]
          id?: string
          new_data?: Json
          original_data?: Json
          televendas_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "televendas_edit_history_televendas_id_fkey"
            columns: ["televendas_id"]
            isOneToOne: false
            referencedRelation: "televendas"
            referencedColumns: ["id"]
          },
        ]
      }
      televendas_notifications: {
        Row: {
          created_at: string
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          message: string
          notification_type: string
          read_at: string | null
          reminder_day: number | null
          scheduled_date: string | null
          televendas_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message: string
          notification_type: string
          read_at?: string | null
          reminder_day?: number | null
          scheduled_date?: string | null
          televendas_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message?: string
          notification_type?: string
          read_at?: string | null
          reminder_day?: number | null
          scheduled_date?: string | null
          televendas_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "televendas_notifications_televendas_id_fkey"
            columns: ["televendas_id"]
            isOneToOne: false
            referencedRelation: "televendas"
            referencedColumns: ["id"]
          },
        ]
      }
      televendas_portability_reminders: {
        Row: {
          id: string
          is_urgent: boolean | null
          reminder_day: number
          sent_at: string
          televendas_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_urgent?: boolean | null
          reminder_day: number
          sent_at?: string
          televendas_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_urgent?: boolean | null
          reminder_day?: number
          sent_at?: string
          televendas_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "televendas_portability_reminders_televendas_id_fkey"
            columns: ["televendas_id"]
            isOneToOne: false
            referencedRelation: "televendas"
            referencedColumns: ["id"]
          },
        ]
      }
      televendas_status_bancario_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          from_status: string | null
          id: string
          reason: string | null
          televendas_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          from_status?: string | null
          id?: string
          reason?: string | null
          televendas_id: string
          to_status: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          from_status?: string | null
          id?: string
          reason?: string | null
          televendas_id?: string
          to_status?: string
        }
        Relationships: []
      }
      televendas_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          from_status: string | null
          id: string
          notes: string | null
          reason: string | null
          televendas_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          from_status?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          televendas_id: string
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          televendas_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "televendas_status_history_televendas_id_fkey"
            columns: ["televendas_id"]
            isOneToOne: false
            referencedRelation: "televendas"
            referencedColumns: ["id"]
          },
        ]
      }
      televendas_status_proposta_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: string | null
          id: string
          reason: string | null
          televendas_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          reason?: string | null
          televendas_id: string
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          reason?: string | null
          televendas_id?: string
          to_status?: string
        }
        Relationships: []
      }
      time_clock: {
        Row: {
          break_type_id: string | null
          city: string | null
          clock_date: string
          clock_time: string
          clock_type: Database["public"]["Enums"]["time_clock_type"]
          company_id: string | null
          created_at: string
          device_info: Json | null
          id: string
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          photo_url: string | null
          state: string | null
          status: Database["public"]["Enums"]["time_clock_status"]
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          break_type_id?: string | null
          city?: string | null
          clock_date?: string
          clock_time?: string
          clock_type: Database["public"]["Enums"]["time_clock_type"]
          company_id?: string | null
          created_at?: string
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          photo_url?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["time_clock_status"]
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          break_type_id?: string | null
          city?: string | null
          clock_date?: string
          clock_time?: string
          clock_type?: Database["public"]["Enums"]["time_clock_type"]
          company_id?: string | null
          created_at?: string
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          photo_url?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["time_clock_status"]
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_break_type_id_fkey"
            columns: ["break_type_id"]
            isOneToOne: false
            referencedRelation: "time_clock_break_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock_alerts: {
        Row: {
          alert_type: string
          company_id: string | null
          created_at: string | null
          description: string
          gestor_id: string | null
          id: string
          is_resolved: boolean | null
          notified_at: string | null
          reference_date: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          time_clock_id: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          company_id?: string | null
          created_at?: string | null
          description: string
          gestor_id?: string | null
          id?: string
          is_resolved?: boolean | null
          notified_at?: string | null
          reference_date: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          time_clock_id?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          company_id?: string | null
          created_at?: string | null
          description?: string
          gestor_id?: string | null
          id?: string
          is_resolved?: boolean | null
          notified_at?: string | null
          reference_date?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          time_clock_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_alerts_time_clock_id_fkey"
            columns: ["time_clock_id"]
            isOneToOne: false
            referencedRelation: "time_clock"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock_break_types: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_paid: boolean | null
          max_duration_minutes: number | null
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          max_duration_minutes?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          max_duration_minutes?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_break_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock_consent: {
        Row: {
          consent_date: string | null
          consent_given: boolean
          created_at: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          consent_date?: string | null
          consent_given?: boolean
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          consent_date?: string | null
          consent_given?: boolean
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      time_clock_justifications: {
        Row: {
          attachment_url: string | null
          company_id: string | null
          created_at: string | null
          description: string
          id: string
          justification_type: string
          minutes_affected: number | null
          reference_date: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          time_clock_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          company_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          justification_type: string
          minutes_affected?: number | null
          reference_date: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          time_clock_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          justification_type?: string
          minutes_affected?: number | null
          reference_date?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          time_clock_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_justifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_justifications_time_clock_id_fkey"
            columns: ["time_clock_id"]
            isOneToOne: false
            referencedRelation: "time_clock"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          performed_by: string
          reason: string | null
          time_clock_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_by: string
          reason?: string | null
          time_clock_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string
          reason?: string | null
          time_clock_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_logs_time_clock_id_fkey"
            columns: ["time_clock_id"]
            isOneToOne: false
            referencedRelation: "time_clock"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock_monthly_summary: {
        Row: {
          approved_justifications: number | null
          closed_at: string | null
          closed_by: string | null
          company_id: string | null
          created_at: string | null
          expected_minutes: number | null
          id: string
          is_closed: boolean | null
          pending_justifications: number | null
          rejected_justifications: number | null
          total_absences: number | null
          total_delay_minutes: number | null
          total_delays: number | null
          total_overtime_minutes: number | null
          total_worked_minutes: number | null
          updated_at: string | null
          user_id: string
          year_month: string
        }
        Insert: {
          approved_justifications?: number | null
          closed_at?: string | null
          closed_by?: string | null
          company_id?: string | null
          created_at?: string | null
          expected_minutes?: number | null
          id?: string
          is_closed?: boolean | null
          pending_justifications?: number | null
          rejected_justifications?: number | null
          total_absences?: number | null
          total_delay_minutes?: number | null
          total_delays?: number | null
          total_overtime_minutes?: number | null
          total_worked_minutes?: number | null
          updated_at?: string | null
          user_id: string
          year_month: string
        }
        Update: {
          approved_justifications?: number | null
          closed_at?: string | null
          closed_by?: string | null
          company_id?: string | null
          created_at?: string | null
          expected_minutes?: number | null
          id?: string
          is_closed?: boolean | null
          pending_justifications?: number | null
          rejected_justifications?: number | null
          total_absences?: number | null
          total_delay_minutes?: number | null
          total_delays?: number | null
          total_overtime_minutes?: number | null
          total_worked_minutes?: number | null
          updated_at?: string | null
          user_id?: string
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_monthly_summary_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock_schedules: {
        Row: {
          allow_overtime: boolean | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          daily_hours: number
          entry_time: string
          exit_time: string
          id: string
          is_active: boolean | null
          lunch_duration_minutes: number | null
          lunch_end: string | null
          lunch_start: string | null
          max_overtime_daily_minutes: number | null
          monthly_hours: number
          schedule_type: string
          tolerance_minutes: number
          updated_at: string | null
          user_id: string
          work_days: number[] | null
        }
        Insert: {
          allow_overtime?: boolean | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_hours?: number
          entry_time?: string
          exit_time?: string
          id?: string
          is_active?: boolean | null
          lunch_duration_minutes?: number | null
          lunch_end?: string | null
          lunch_start?: string | null
          max_overtime_daily_minutes?: number | null
          monthly_hours?: number
          schedule_type?: string
          tolerance_minutes?: number
          updated_at?: string | null
          user_id: string
          work_days?: number[] | null
        }
        Update: {
          allow_overtime?: boolean | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_hours?: number
          entry_time?: string
          exit_time?: string
          id?: string
          is_active?: boolean | null
          lunch_duration_minutes?: number | null
          lunch_end?: string | null
          lunch_start?: string | null
          max_overtime_daily_minutes?: number | null
          monthly_hours?: number
          schedule_type?: string
          tolerance_minutes?: number
          updated_at?: string | null
          user_id?: string
          work_days?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock_settings: {
        Row: {
          allow_manual_adjustment: boolean | null
          block_duplicate_clock: boolean | null
          company_id: string | null
          created_at: string
          default_entry_time: string | null
          default_exit_time: string | null
          id: string
          require_location: boolean | null
          require_photo: boolean | null
          retention_years: number | null
          tolerance_minutes: number | null
          updated_at: string
        }
        Insert: {
          allow_manual_adjustment?: boolean | null
          block_duplicate_clock?: boolean | null
          company_id?: string | null
          created_at?: string
          default_entry_time?: string | null
          default_exit_time?: string | null
          id?: string
          require_location?: boolean | null
          require_photo?: boolean | null
          retention_years?: number | null
          tolerance_minutes?: number | null
          updated_at?: string
        }
        Update: {
          allow_manual_adjustment?: boolean | null
          block_duplicate_clock?: boolean | null
          company_id?: string | null
          created_at?: string
          default_entry_time?: string | null
          default_exit_time?: string | null
          id?: string
          require_location?: boolean | null
          require_photo?: boolean | null
          retention_years?: number | null
          tolerance_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_companies: {
        Row: {
          company_id: string
          company_role: Database["public"]["Enums"]["company_role"]
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          company_role?: Database["public"]["Enums"]["company_role"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          company_role?: Database["public"]["Enums"]["company_role"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          created_at: string
          credits_balance: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_balance?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_balance?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_data: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          birth_date: string | null
          cep: string | null
          city: string | null
          cnpj: string | null
          complement: string | null
          cpf: string | null
          created_at: string
          full_name: string | null
          id: string
          internal_observations: string | null
          legal_representative: string | null
          legal_representative_cpf: string | null
          marital_status: string | null
          neighborhood: string | null
          number: string | null
          person_type: Database["public"]["Enums"]["person_type"]
          personal_email: string | null
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          rg: string | null
          state: string | null
          status: Database["public"]["Enums"]["user_data_status"]
          street: string | null
          trade_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          internal_observations?: string | null
          legal_representative?: string | null
          legal_representative_cpf?: string | null
          marital_status?: string | null
          neighborhood?: string | null
          number?: string | null
          person_type?: Database["public"]["Enums"]["person_type"]
          personal_email?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          rg?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["user_data_status"]
          street?: string | null
          trade_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          internal_observations?: string | null
          legal_representative?: string | null
          legal_representative_cpf?: string | null
          marital_status?: string | null
          neighborhood?: string | null
          number?: string | null
          person_type?: Database["public"]["Enums"]["person_type"]
          personal_email?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          rg?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["user_data_status"]
          street?: string | null
          trade_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_data_history: {
        Row: {
          action: string
          changed_by: string | null
          changes: Json | null
          created_at: string
          id: string
          user_data_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          changes?: Json | null
          created_at?: string
          id?: string
          user_data_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          changes?: Json | null
          created_at?: string
          id?: string
          user_data_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_data_history_user_data_id_fkey"
            columns: ["user_data_id"]
            isOneToOne: false
            referencedRelation: "user_data"
            referencedColumns: ["id"]
          },
        ]
      }
      user_data_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_user_data_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_user_data_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_user_data_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_data_notifications_related_user_data_id_fkey"
            columns: ["related_user_data_id"]
            isOneToOne: false
            referencedRelation: "user_data"
            referencedColumns: ["id"]
          },
        ]
      }
      user_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          contact_name: string | null
          contact_phone: string
          created_at: string
          id: string
          instance_id: string | null
          last_message: string | null
          last_message_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_name?: string | null
          contact_phone: string
          created_at?: string
          id?: string
          instance_id?: string | null
          last_message?: string | null
          last_message_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string
          created_at?: string
          id?: string
          instance_id?: string | null
          last_message?: string | null
          last_message_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          created_at: string
          id: string
          instance_name: string
          instance_status: string | null
          qr_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_name: string
          instance_status?: string | null
          qr_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_name?: string
          instance_status?: string | null
          qr_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          created_at: string
          id: string
          instance_id: string | null
          message: string
          phone: string
          sent_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_id?: string | null
          message: string
          phone: string
          sent_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_id?: string | null
          message?: string
          phone?: string
          sent_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      whitelabel_config: {
        Row: {
          company_name: string | null
          created_at: string
          favicon_url: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_lead_requests: {
        Row: {
          clientes_fechados: number | null
          em_andamento: number | null
          leads_novos: number | null
          recusados: number | null
          request_date: string | null
          requested_by: string | null
          total_leads: number | null
          user_email: string | null
          user_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_activate_lead_to_blacklist: {
        Args: {
          p_cpf?: string
          p_lead_id?: string
          p_nome?: string
          p_reason?: string
          p_telefone: string
        }
        Returns: undefined
      }
      add_lead_to_blacklist: {
        Args: { blacklist_reason?: string; lead_cpf: string }
        Returns: undefined
      }
      admin_manage_credits: {
        Args: {
          credit_action: string
          credit_amount: number
          credit_reason?: string
          target_user_id: string
        }
        Returns: Json
      }
      calculate_lead_priority: {
        Args: {
          lead_created_at: string
          lead_status: string
          proxima_acao: string
          ultima_interacao: string
        }
        Returns: Json
      }
      calculate_lead_score: { Args: { p_lead_id: string }; Returns: Json }
      calculate_worked_hours: {
        Args: { p_date: string; p_user_id: string }
        Returns: {
          break_minutes: number
          delay_minutes: number
          overtime_minutes: number
          status: string
          total_minutes: number
          worked_minutes: number
        }[]
      }
      check_baseoff_daily_limit: {
        Args: { user_id_param: string }
        Returns: number
      }
      check_daily_lead_limit: {
        Args: { user_id_param: string }
        Returns: number
      }
      check_duplicate_import: {
        Args: { p_file_hash: string; p_module?: string }
        Returns: {
          is_duplicate: boolean
          original_file_name: string
          original_import_date: string
          records_imported: number
        }[]
      }
      check_month_pending_issues: {
        Args: { p_user_id: string; p_year_month: string }
        Returns: {
          has_pending: boolean
          incomplete_days: number
          missing_entries: number
          pending_justifications: number
        }[]
      }
      check_rate_limit: {
        Args: {
          action_type_param: string
          max_attempts?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      check_user_lead_inactivity: {
        Args: never
        Returns: {
          company_id: string
          days_inactive: number
          gestor_id: string
          last_lead_request: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      count_baseoff_duplicates: { Args: never; Returns: number }
      count_leads_database_duplicates: { Args: never; Returns: number }
      create_admin_profile: {
        Args: { user_email: string; user_name?: string }
        Returns: string
      }
      detect_suspicious_activity: {
        Args: { time_window_minutes?: number; user_id_param: string }
        Returns: Json
      }
      extract_phone_from_text: { Args: { input_text: string }; Returns: string }
      get_activate_leads_quality_stats: { Args: never; Returns: Json }
      get_available_banks: {
        Args: never
        Returns: {
          codigo_banco: string
        }[]
      }
      get_available_convenios: {
        Args: never
        Returns: {
          available_count: number
          convenio: string
        }[]
      }
      get_available_ddds: {
        Args: never
        Returns: {
          available_count: number
          ddd: string
        }[]
      }
      get_available_tags: {
        Args: never
        Returns: {
          available_count: number
          tag: string
        }[]
      }
      get_available_ufs: {
        Args: never
        Returns: {
          uf: string
        }[]
      }
      get_baseoff_data: {
        Args: {
          codigo_banco_filter?: string
          limite?: number
          valor_max?: number
          valor_min?: number
        }
        Returns: {
          banco: string
          cpf: string
          margem_disponivel: string
          nome: string
          telefone1: string
          valor_beneficio: string
        }[]
      }
      get_client_contracts_count: {
        Args: { client_id_param: string }
        Returns: number
      }
      get_complete_schema: { Args: never; Returns: Json }
      get_database_storage_stats: {
        Args: never
        Returns: {
          duplicate_count: number
          estimated_size: string
          table_name: string
          total_records: number
        }[]
      }
      get_televendas_sales_ranking: {
        Args: { p_company_id: string; p_end_date: string; p_start_date: string }
        Returns: {
          sales_count: number
          user_id: string
          user_name: string
        }[]
      }
      get_user_company_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_credits: { Args: { target_user_id?: string }; Returns: number }
      get_user_data_company_ids: {
        Args: { check_user_id: string }
        Returns: string[]
      }
      get_user_primary_company_id: {
        Args: { _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_safe: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_leads_from_csv: { Args: { leads_data: Json }; Returns: Json }
      is_company_gestor: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_gestor_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_global_admin: { Args: { _user_id: string }; Returns: boolean }
      merge_activate_leads: {
        Args: {
          keep_lead_id: string
          performed_by_user: string
          remove_lead_id: string
        }
        Returns: Json
      }
      normalize_cpf: { Args: { input_cpf: string }; Returns: string }
      normalize_phone: { Args: { phone_input: string }; Returns: string }
      notify_critical_televendas: { Args: never; Returns: undefined }
      process_expired_future_contacts: { Args: never; Returns: number }
      release_expired_blacklisted_leads: { Args: never; Returns: Json }
      remove_baseoff_duplicates: { Args: never; Returns: number }
      remove_leads_database_duplicates: { Args: never; Returns: number }
      request_leads: {
        Args: {
          banco_filter?: string
          convenio_filter?: string
          leads_requested?: number
          produto_filter?: string
        }
        Returns: {
          banco: string
          convenio: string
          cpf: string
          lead_id: string
          name: string
          phone: string
          tipo_beneficio: string
        }[]
      }
      request_leads_with_credits:
        | {
            Args: {
              banco_filter?: string
              convenio_filter?: string
              leads_requested?: number
              produto_filter?: string
            }
            Returns: {
              banco: string
              convenio: string
              cpf: string
              lead_id: string
              name: string
              phone: string
              tipo_beneficio: string
            }[]
          }
        | {
            Args: {
              banco_filter?: string
              convenio_filter?: string
              ddd_filter?: string[]
              leads_requested?: number
              produto_filter?: string
            }
            Returns: {
              banco: string
              convenio: string
              cpf: string
              id: string
              name: string
              phone: string
              phone2: string
            }[]
          }
        | {
            Args: {
              banco_filter?: string
              convenio_filter?: string
              ddd_filter?: string[]
              leads_requested?: number
              produto_filter?: string
              tag_filter?: string[]
            }
            Returns: {
              banco: string
              convenio: string
              cpf: string
              id: string
              name: string
              phone: string
              phone2: string
              tag: string
            }[]
          }
      sanitize_activate_lead: { Args: { lead_id: string }; Returns: Json }
      scan_activate_leads_duplicates: {
        Args: never
        Returns: {
          duplicates_found: number
          leads_with_issues: number
          total_scanned: number
        }[]
      }
      search_baseoff_clients: {
        Args: {
          search_limit?: number
          search_offset?: number
          search_term: string
        }
        Returns: {
          banco_pagto: string
          cpf: string
          created_at: string
          data_nascimento: string
          email_1: string
          esp: string
          id: string
          match_score: number
          match_type: string
          mr: number
          municipio: string
          nb: string
          nome: string
          nome_mae: string
          sexo: string
          status_beneficio: string
          tel_cel_1: string
          tel_cel_2: string
          tel_fixo_1: string
          total_count: number
          uf: string
          updated_at: string
        }[]
      }
      secure_baseoff_access: {
        Args: {
          codigo_banco_filter?: string
          limite?: number
          uf_filter?: string
        }
        Returns: {
          banco: string
          cpf: string
          margem_disponivel: string
          municipio: string
          nome: string
          telefone1: string
          telefone2: string
          telefone3: string
          uf: string
          valor_beneficio: string
        }[]
      }
      text_contains_numbers: { Args: { input_text: string }; Returns: boolean }
      trigger_duplicate_scan_after_import: {
        Args: { p_import_log_id?: string; p_module?: string }
        Returns: Json
      }
      update_daily_baseoff_usage: {
        Args: { leads_count_param: number; user_id_param: string }
        Returns: undefined
      }
      update_lead_cpf: {
        Args: { lead_id: string; new_cpf: string }
        Returns: Json
      }
      update_televendas_prioridade: { Args: never; Returns: undefined }
      user_belongs_to_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      user_in_same_company: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      validate_cpf: { Args: { cpf_input: string }; Returns: boolean }
      validate_email: { Args: { email_input: string }; Returns: boolean }
      validate_phone: { Args: { phone_input: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "partner"
      collaborative_access_type: "admin" | "operator" | "readonly"
      collaborative_link_category:
        | "banco"
        | "governo"
        | "parceiros"
        | "marketing"
        | "ferramentas"
        | "outros"
      collaborative_permission_type: "view" | "edit" | "create" | "delete"
      company_role: "gestor" | "colaborador"
      document_status: "pending" | "sent" | "approved" | "rejected"
      person_type: "pf" | "pj"
      time_clock_status: "completo" | "incompleto" | "ajustado" | "pendente"
      time_clock_type: "entrada" | "pausa_inicio" | "pausa_fim" | "saida"
      user_data_status: "incomplete" | "in_review" | "approved" | "rejected"
      user_level: "bronze" | "prata" | "ouro" | "diamante"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "partner"],
      collaborative_access_type: ["admin", "operator", "readonly"],
      collaborative_link_category: [
        "banco",
        "governo",
        "parceiros",
        "marketing",
        "ferramentas",
        "outros",
      ],
      collaborative_permission_type: ["view", "edit", "create", "delete"],
      company_role: ["gestor", "colaborador"],
      document_status: ["pending", "sent", "approved", "rejected"],
      person_type: ["pf", "pj"],
      time_clock_status: ["completo", "incompleto", "ajustado", "pendente"],
      time_clock_type: ["entrada", "pausa_inicio", "pausa_fim", "saida"],
      user_data_status: ["incomplete", "in_review", "approved", "rejected"],
      user_level: ["bronze", "prata", "ouro", "diamante"],
    },
  },
} as const
