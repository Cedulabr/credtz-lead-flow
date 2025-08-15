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
      clients: {
        Row: {
          birth_date: string | null
          contact: string | null
          convenio: string | null
          convenio_id: number | null
          cpf: string
          created_at: string | null
          created_by_id: string | null
          email: string | null
          id: number
          name: string
          organization_id: number | null
          phone: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          contact?: string | null
          convenio?: string | null
          convenio_id?: number | null
          cpf: string
          created_at?: string | null
          created_by_id?: string | null
          email?: string | null
          id?: number
          name: string
          organization_id?: number | null
          phone: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          contact?: string | null
          convenio?: string | null
          convenio_id?: number | null
          cpf?: string
          created_at?: string | null
          created_by_id?: string | null
          email?: string | null
          id?: number
          name?: string
          organization_id?: number | null
          phone?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_convenio_id_fkey"
            columns: ["convenio_id"]
            isOneToOne: false
            referencedRelation: "convenios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          commission_percentage: number
          created_at: string | null
          created_by_id: string | null
          description: string | null
          id: number
          is_active: boolean | null
          minimum_value: number | null
          organization_id: number | null
          product_name: string
          updated_at: string | null
        }
        Insert: {
          commission_percentage: number
          created_at?: string | null
          created_by_id?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          minimum_value?: number | null
          organization_id?: number | null
          product_name: string
          updated_at?: string | null
        }
        Update: {
          commission_percentage?: number
          created_at?: string | null
          created_by_id?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          minimum_value?: number | null
          organization_id?: number | null
          product_name?: string
          updated_at?: string | null
        }
        Relationships: []
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
            foreignKeyName: "form_submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
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
      lead_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          lead_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          lead_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          lead_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          lead_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          lead_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_attachments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
          created_at: string | null
          email: string | null
          id: string
          level: Database["public"]["Enums"]["user_level"] | null
          name: string | null
          organization_id: number | null
          pix_key: string | null
          role: Database["public"]["Enums"]["app_role"]
          sector: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          level?: Database["public"]["Enums"]["user_level"] | null
          name?: string | null
          organization_id?: number | null
          pix_key?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          sector?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          level?: Database["public"]["Enums"]["user_level"] | null
          name?: string | null
          organization_id?: number | null
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
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      check_daily_lead_limit: {
        Args: { user_id_param: string }
        Returns: number
      }
      create_admin_profile: {
        Args: { user_email: string; user_name?: string }
        Returns: string
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
