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
          Agencia: string | null
          Bairro: string | null
          Banco: string | null
          Beneficio: string | null
          Bloqueado_Emprestimo: string | null
          CEP: string | null
          Codigo_Especie: string | null
          Conta: string | null
          CPF: string | null
          CPF_Representante: string | null
          Data_Nascimento: string | null
          DDB: string | null
          Desconto_Associacao: string | null
          DIB: string | null
          Email1: string | null
          Email2: string | null
          Email3: string | null
          Emprestimo_Ativos: string | null
          Endereco: string | null
          Idade: string | null
          Margem_Disponivel: string | null
          Margem_RCC: string | null
          Margem_RMC: string | null
          Meio_Pagamento: string | null
          Municipio: string | null
          Nome: string | null
          Nome_Mae: string | null
          Nome_Representante: string | null
          Possui_Representante: string | null
          RG: string | null
          Telefone1: string | null
          Telefone2: string | null
          Telefone3: string | null
          UF: string | null
          Valor_Beneficio: string | null
        }
        Insert: {
          Agencia?: string | null
          Bairro?: string | null
          Banco?: string | null
          Beneficio?: string | null
          Bloqueado_Emprestimo?: string | null
          CEP?: string | null
          Codigo_Especie?: string | null
          Conta?: string | null
          CPF?: string | null
          CPF_Representante?: string | null
          Data_Nascimento?: string | null
          DDB?: string | null
          Desconto_Associacao?: string | null
          DIB?: string | null
          Email1?: string | null
          Email2?: string | null
          Email3?: string | null
          Emprestimo_Ativos?: string | null
          Endereco?: string | null
          Idade?: string | null
          Margem_Disponivel?: string | null
          Margem_RCC?: string | null
          Margem_RMC?: string | null
          Meio_Pagamento?: string | null
          Municipio?: string | null
          Nome?: string | null
          Nome_Mae?: string | null
          Nome_Representante?: string | null
          Possui_Representante?: string | null
          RG?: string | null
          Telefone1?: string | null
          Telefone2?: string | null
          Telefone3?: string | null
          UF?: string | null
          Valor_Beneficio?: string | null
        }
        Update: {
          Agencia?: string | null
          Bairro?: string | null
          Banco?: string | null
          Beneficio?: string | null
          Bloqueado_Emprestimo?: string | null
          CEP?: string | null
          Codigo_Especie?: string | null
          Conta?: string | null
          CPF?: string | null
          CPF_Representante?: string | null
          Data_Nascimento?: string | null
          DDB?: string | null
          Desconto_Associacao?: string | null
          DIB?: string | null
          Email1?: string | null
          Email2?: string | null
          Email3?: string | null
          Emprestimo_Ativos?: string | null
          Endereco?: string | null
          Idade?: string | null
          Margem_Disponivel?: string | null
          Margem_RCC?: string | null
          Margem_RMC?: string | null
          Meio_Pagamento?: string | null
          Municipio?: string | null
          Nome?: string | null
          Nome_Mae?: string | null
          Nome_Representante?: string | null
          Possui_Representante?: string | null
          RG?: string | null
          Telefone1?: string | null
          Telefone2?: string | null
          Telefone3?: string | null
          UF?: string | null
          Valor_Beneficio?: string | null
        }
        Relationships: []
      }
      baseoff_allowed_banks: {
        Row: {
          codigo_banco: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          codigo_banco: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          codigo_banco?: string
          created_at?: string
          created_by?: string | null
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
          status: string
          user_id: string
          valor_parcela_max: number | null
          valor_parcela_min: number | null
        }
        Insert: {
          codigo_banco?: string | null
          id?: string
          leads_count?: number
          requested_at?: string
          status?: string
          user_id: string
          valor_parcela_max?: number | null
          valor_parcela_min?: number | null
        }
        Update: {
          codigo_banco?: string | null
          id?: string
          leads_count?: number
          requested_at?: string
          status?: string
          user_id?: string
          valor_parcela_max?: number | null
          valor_parcela_min?: number | null
        }
        Relationships: []
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
          created_at: string
          credit_value: number
          id: string
          payment_date: string | null
          payment_method: string | null
          product_type: string
          proposal_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_name: string
          client_name: string
          commission_amount: number
          commission_percentage: number
          created_at?: string
          credit_value: number
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          product_type: string
          proposal_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_name?: string
          client_name?: string
          commission_amount?: number
          commission_percentage?: number
          created_at?: string
          credit_value?: number
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          product_type?: string
          proposal_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
        Relationships: [
          {
            foreignKeyName: "form_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_processed_by_id_fkey"
            columns: ["processed_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          created_at: string | null
          created_by_id: string | null
          description: string | null
          fields: Json | null
          id: number
          is_active: boolean | null
          name: string
          organization_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_id?: string | null
          description?: string | null
          fields?: Json | null
          id?: number
          is_active?: boolean | null
          name: string
          organization_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_id?: string | null
          description?: string | null
          fields?: Json | null
          id?: number
          is_active?: boolean | null
          name?: string
          organization_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_templates_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_requests: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          name: string
          processed_at: string | null
          processed_by_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          processed_at?: string | null
          processed_by_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          processed_at?: string | null
          processed_by_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_used: boolean | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          accepted_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_used?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          accepted_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_used?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      leads: {
        Row: {
          assigned_to: string | null
          banco_operacao: string | null
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
      organizations: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: number
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          logo_url?: string | null
          name: string
          phone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
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
          company: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          level: Database["public"]["Enums"]["user_level"] | null
          name: string | null
          organization_id: number | null
          phone: string | null
          pix_key: string | null
          role: Database["public"]["Enums"]["app_role"]
          sector: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          is_active?: boolean | null
          level?: Database["public"]["Enums"]["user_level"] | null
          name?: string | null
          organization_id?: number | null
          phone?: string | null
          pix_key?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          sector?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          level?: Database["public"]["Enums"]["user_level"] | null
          name?: string | null
          organization_id?: number | null
          phone?: string | null
          pix_key?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          sector?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      propostas: {
        Row: {
          banco: string | null
          bank_id: number | null
          client_id: number | null
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
          product_id: number | null
          produto: string | null
          status: string | null
          updated_at: string | null
          valor: string | null
          value: string | null
          webhookhook: string | null
        }
        Insert: {
          banco?: string | null
          bank_id?: number | null
          client_id?: number | null
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
          product_id?: number | null
          produto?: string | null
          status?: string | null
          updated_at?: string | null
          valor?: string | null
          value?: string | null
          webhookhook?: string | null
        }
        Update: {
          banco?: string | null
          bank_id?: number | null
          client_id?: number | null
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
          product_id?: number | null
          produto?: string | null
          status?: string | null
          updated_at?: string | null
          valor?: string | null
          value?: string | null
          webhookhook?: string | null
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
            foreignKeyName: "proposals_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      user_commission_config: {
        Row: {
          bank_product_id: string
          commission_percentage: number
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_product_id: string
          commission_percentage: number
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_product_id?: string
          commission_percentage?: number
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_commission_config_bank_product_id_fkey"
            columns: ["bank_product_id"]
            isOneToOne: false
            referencedRelation: "banks_products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          organization_id: number | null
          role: string | null
          sector: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name?: string | null
          organization_id?: number | null
          role?: string | null
          sector?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          organization_id?: number | null
          role?: string | null
          sector?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          organization_id: number | null
          role: string | null
          sector: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          organization_id?: number | null
          role?: string | null
          sector?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          organization_id?: number | null
          role?: string | null
          sector?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string | null
          created_by_id: string | null
          description: string | null
          id: number
          is_active: boolean | null
          name: string
          organization_id: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by_id?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          organization_id?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          created_by_id?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          organization_id?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string | null
          id: number
          organization_id: number | null
          processed_at: string | null
          processed_by_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          webhook_sent_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: number
          organization_id?: number | null
          processed_at?: string | null
          processed_by_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_sent_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: number
          organization_id?: number | null
          processed_at?: string | null
          processed_by_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_sent_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
        Args: Record<PropertyKey, never>
        Returns: {
          codigo_banco: string
        }[]
      }
      get_available_ufs: {
        Args: Record<PropertyKey, never>
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
      get_complete_schema: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
      validate_cpf: {
        Args: { cpf_input: string }
        Returns: boolean
      }
      validate_email: {
        Args: { email_input: string }
        Returns: boolean
      }
      validate_phone: {
        Args: { phone_input: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "partner"
      user_level: "home_office_senior" | "home_office_junior"
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
      user_level: ["home_office_senior", "home_office_junior"],
    },
  },
} as const
