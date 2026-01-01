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
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
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
      leads: {
        Row: {
          assigned_to: string | null
          banco_operacao: string | null
          company_id: string | null
          convenio: string | null
          cpf: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          origem_lead: string | null
          phone: string
          priority: string | null
          stage: string | null
          status: string | null
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
          id?: string
          name: string
          origem_lead?: string | null
          phone: string
          priority?: string | null
          stage?: string | null
          status?: string | null
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
          id?: string
          name?: string
          origem_lead?: string | null
          phone?: string
          priority?: string | null
          stage?: string | null
          status?: string | null
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
          cpf: string
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
          tipo_beneficio: string | null
          updated_at: string
        }
        Insert: {
          banco?: string | null
          convenio: string
          cpf: string
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
          tipo_beneficio?: string | null
          updated_at?: string
        }
        Update: {
          banco?: string | null
          convenio?: string
          cpf?: string
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
          tipo_beneficio?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leads_distribution: {
        Row: {
          cpf: string
          created_at: string
          distributed_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          cpf: string
          created_at?: string
          distributed_at?: string
          expires_at?: string
          id?: string
          user_id: string
        }
        Update: {
          cpf?: string
          created_at?: string
          distributed_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
          can_access_documentos: boolean | null
          can_access_gestao_televendas: boolean | null
          can_access_indicar: boolean | null
          can_access_meus_clientes: boolean | null
          can_access_minhas_comissoes: boolean | null
          can_access_premium_leads: boolean | null
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
          can_access_documentos?: boolean | null
          can_access_gestao_televendas?: boolean | null
          can_access_indicar?: boolean | null
          can_access_meus_clientes?: boolean | null
          can_access_minhas_comissoes?: boolean | null
          can_access_premium_leads?: boolean | null
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
          can_access_documentos?: boolean | null
          can_access_gestao_televendas?: boolean | null
          can_access_indicar?: boolean | null
          can_access_meus_clientes?: boolean | null
          can_access_minhas_comissoes?: boolean | null
          can_access_premium_leads?: boolean | null
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
          company_id: string | null
          convenio: string | null
          convenio_id: number | null
          cpf: string | null
          created_at: string | null
          created_by_id: string | null
          data_criacao: string | null
          id: number
          installments: number | null
          "Nome do cliente": string | null
          notes: string | null
          organization_id: number | null
          origem_lead: string | null
          pipeline_stage: string | null
          product_id: number | null
          produto: string | null
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
          company_id?: string | null
          convenio?: string | null
          convenio_id?: number | null
          cpf?: string | null
          created_at?: string | null
          created_by_id?: string | null
          data_criacao?: string | null
          id?: number
          installments?: number | null
          "Nome do cliente"?: string | null
          notes?: string | null
          organization_id?: number | null
          origem_lead?: string | null
          pipeline_stage?: string | null
          product_id?: number | null
          produto?: string | null
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
          company_id?: string | null
          convenio?: string | null
          convenio_id?: number | null
          cpf?: string | null
          created_at?: string | null
          created_by_id?: string | null
          data_criacao?: string | null
          id?: number
          installments?: number | null
          "Nome do cliente"?: string | null
          notes?: string | null
          organization_id?: number | null
          origem_lead?: string | null
          pipeline_stage?: string | null
          product_id?: number | null
          produto?: string | null
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
      televendas: {
        Row: {
          banco: string
          company_id: string | null
          cpf: string
          created_at: string
          data_venda: string
          id: string
          nome: string
          observacao: string | null
          parcela: number
          status: string
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
          data_venda: string
          id?: string
          nome: string
          observacao?: string | null
          parcela: number
          status?: string
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
          data_venda?: string
          id?: string
          nome?: string
          observacao?: string | null
          parcela?: number
          status?: string
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
      [_ in never]: never
    }
    Functions: {
      add_lead_to_blacklist: {
        Args: { blacklist_reason?: string; lead_cpf: string }
        Returns: undefined
      }
      check_baseoff_daily_limit: {
        Args: { user_id_param: string }
        Returns: number
      }
      check_daily_lead_limit: {
        Args: { user_id_param: string }
        Returns: number
      }
      check_rate_limit: {
        Args: {
          action_type_param: string
          max_attempts?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      create_admin_profile: {
        Args: { user_email: string; user_name?: string }
        Returns: string
      }
      detect_suspicious_activity: {
        Args: { time_window_minutes?: number; user_id_param: string }
        Returns: Json
      }
      get_available_banks: {
        Args: never
        Returns: {
          codigo_banco: string
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
      get_complete_schema: { Args: never; Returns: Json }
      get_user_company_ids: { Args: { _user_id: string }; Returns: string[] }
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
      update_daily_baseoff_usage: {
        Args: { leads_count_param: number; user_id_param: string }
        Returns: undefined
      }
      user_belongs_to_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      validate_cpf: { Args: { cpf_input: string }; Returns: boolean }
      validate_email: { Args: { email_input: string }; Returns: boolean }
      validate_phone: { Args: { phone_input: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "partner"
      company_role: "gestor" | "colaborador"
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
      company_role: ["gestor", "colaborador"],
      user_level: ["bronze", "prata", "ouro", "diamante"],
    },
  },
} as const
