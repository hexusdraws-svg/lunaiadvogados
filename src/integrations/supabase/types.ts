export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: "super_admin" | "admin" | "professional";
          company_id: string | null;
          status: "pending" | "active" | "suspended";
          professional_role:
            | "lawyer"
            | "assistant"
            | "receptionist"
            | "accountant"
            | "secretary"
            | null;
          contacto: string | null;
          phone_country_code: string | null;
          phone_number: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string | null;
          role?: "super_admin" | "admin" | "professional";
          company_id?: string | null;
          status?: "pending" | "active" | "suspended" | "inactive";
          professional_role?:
            | "lawyer"
            | "assistant"
            | "receptionist"
            | "accountant"
            | "secretary"
            | null;
          contacto?: string | null;
          phone_country_code?: string | null;
          phone_number?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: "super_admin" | "admin" | "professional";
          company_id?: string | null;
          status?: "pending" | "active" | "suspended" | "inactive";
          professional_role?:
            | "lawyer"
            | "assistant"
            | "receptionist"
            | "accountant"
            | "secretary"
            | null;
          contacto?: string | null;
          phone_country_code?: string | null;
          phone_number?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          assinatura_url: string | null;
          cidade: string | null;
          created_at: string;
          email: string | null;
          endereco: string | null;
          id: string;
          logo_url: string | null;
          nome: string;
          nuit: string | null;
          pais: string | null;
          status: "active" | "suspended" | "cancelled";
          telefone: string | null;
          updated_at: string;
          website: string | null;
          language: string | null;
          currency: string | null;
          timezone: string | null;
          date_format: string | null;
          company_type: "office" | "freelancer";
        };
        Insert: {
          assinatura_url?: string | null;
          cidade?: string | null;
          created_at?: string;
          email?: string | null;
          endereco?: string | null;
          id?: string;
          logo_url?: string | null;
          nome: string;
          nuit?: string | null;
          pais?: string | null;
          status?: "active" | "suspended" | "cancelled";
          telefone?: string | null;
          updated_at?: string;
          website?: string | null;
          language?: string | null;
          currency?: string | null;
          timezone?: string | null;
          date_format?: string | null;
          company_type?: "office" | "freelancer";
        };
        Update: {
          assinatura_url?: string | null;
          cidade?: string | null;
          created_at?: string;
          email?: string | null;
          endereco?: string | null;
          id?: string;
          logo_url?: string | null;
          nome?: string;
          nuit?: string | null;
          pais?: string | null;
          status?: "active" | "suspended" | "cancelled";
          telefone?: string | null;
          updated_at?: string;
          website?: string | null;
          language?: string | null;
          currency?: string | null;
          timezone?: string | null;
          date_format?: string | null;
          company_type?: "office" | "freelancer";
        };
        Relationships: [];
      };
      company_license_alerts: {
        Row: {
          id: string;
          company_id: string;
          days_remaining: number;
          title: string;
          message: string;
          is_active: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          days_remaining?: number;
          title: string;
          message: string;
          is_active?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          days_remaining?: number;
          title?: string;
          message?: string;
          is_active?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "company_license_alerts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          id: string;
          email: string;
          company_id: string;
          role: "admin" | "professional";
          status: "pending" | "accepted" | "revoked";
          token: string;
          expires_at: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          company_id: string;
          role?: "admin" | "professional";
          status?: "pending" | "accepted" | "revoked";
          token?: string;
          expires_at?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          company_id?: string;
          role?: "admin" | "professional";
          status?: "pending" | "accepted" | "revoked";
          token?: string;
          expires_at?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      contract_templates: {
        Row: {
          company_id: string | null;
          created_at: string;
          html_content: string;
          id: string;
          is_native: boolean;
          nome: string;
          tipo: string | null;
          updated_at: string;
          description: string | null;
          category: string;
          status: string;
          author_id: string | null;
          variables: string[] | null;
          is_system: boolean;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          html_content?: string;
          id?: string;
          is_native?: boolean;
          nome: string;
          tipo?: string | null;
          updated_at?: string;
          description?: string | null;
          category?: string;
          status?: string;
          author_id?: string | null;
          variables?: string[] | null;
          is_system?: boolean;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          html_content?: string;
          id?: string;
          is_native?: boolean;
          nome?: string;
          tipo?: string | null;
          updated_at?: string;
          description?: string | null;
          category?: string;
          status?: string;
          author_id?: string | null;
          variables?: string[] | null;
          is_system?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "contract_templates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      contracts: {
        Row: {
          cliente_data: Json;
          cliente_nome: string | null;
          cliente_id: string | null;
          processo_id: string | null;
          company_id: string | null;
          created_at: string;
          updated_at: string | null;
          html_final: string;
          id: string;
          nome: string | null;
          numero: string | null;
          status: string;
          template_id: string | null;
          template_nome: string | null;
          tipo: string | null;
          variables: Json;
        };
        Insert: {
          cliente_data?: Json;
          cliente_nome?: string | null;
          cliente_id?: string | null;
          processo_id?: string | null;
          company_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
          html_final?: string;
          id?: string;
          nome?: string | null;
          numero?: string | null;
          status?: string;
          template_id?: string | null;
          template_nome?: string | null;
          tipo?: string | null;
          variables?: Json;
        };
        Update: {
          cliente_data?: Json;
          cliente_nome?: string | null;
          cliente_id?: string | null;
          processo_id?: string | null;
          company_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
          html_final?: string;
          id?: string;
          nome?: string | null;
          numero?: string | null;
          status?: string;
          template_id?: string | null;
          template_nome?: string | null;
          tipo?: string | null;
          variables?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracts_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "contract_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracts_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracts_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      financial_transactions: {
        Row: {
          id: string;
          description: string;
          amount: number;
          client_id: string | null;
          client_name: string | null;
          professional_id: string | null;
          professional_name: string | null;
          transaction_type: string;
          status: string;
          due_date: string;
          payment_date: string | null;
          frequency: string;
          attachment_url: string | null;
          attachment_type: string | null;
          payment_method: string | null;
          company_id: string | null;
          process_id: string | null;
          expense_category: string | null;
          fee_split_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          description: string;
          amount: number;
          client_id?: string | null;
          client_name?: string | null;
          professional_id?: string | null;
          professional_name?: string | null;
          transaction_type: string;
          status?: string;
          due_date: string;
          payment_date?: string | null;
          frequency?: string;
          attachment_url?: string | null;
          attachment_type?: string | null;
          payment_method?: string | null;
          company_id?: string | null;
          process_id?: string | null;
          expense_category?: string | null;
          fee_split_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          description?: string;
          amount?: number;
          client_id?: string | null;
          client_name?: string | null;
          professional_id?: string | null;
          professional_name?: string | null;
          transaction_type?: string;
          status?: string;
          due_date?: string;
          payment_date?: string | null;
          frequency?: string;
          attachment_url?: string | null;
          attachment_type?: string | null;
          payment_method?: string | null;
          company_id?: string;
          process_id?: string | null;
          expense_category?: string | null;
          fee_split_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financial_transactions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_transactions_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_transactions_professional_id_fkey";
            columns: ["professional_id"];
            isOneToOne: false;
            referencedRelation: "profissionais";
            referencedColumns: ["id"];
          },
        ];
      };
      company_payment_methods: {
        Row: {
          id: string;
          company_id: string | null;
          method_key: string;
          method_label: string;
          is_active: boolean;
          display_order: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          method_key: string;
          method_label: string;
          is_active?: boolean;
          display_order?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          method_key?: string;
          method_label?: string;
          is_active?: boolean;
          display_order?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_payment_methods_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_subscriptions: {
        Row: {
          id: string;
          company_id: string;
          plan: string;
          amount: number;
          frequency: string;
          payment_method: string | null;
          start_date: string;
          next_due_date: string;
          status: string;
          paid_at: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          plan?: string;
          amount?: number;
          frequency?: string;
          payment_method?: string | null;
          start_date?: string;
          next_due_date?: string;
          status?: string;
          paid_at?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          plan?: string;
          amount?: number;
          frequency?: string;
          payment_method?: string | null;
          start_date?: string;
          next_due_date?: string;
          status?: string;
          paid_at?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      process_timeline: {
        Row: {
          id: string;
          company_id: string;
          case_id: string;
          user_id: string;
          event: string;
          description: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          case_id: string;
          user_id: string;
          event: string;
          description?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          case_id?: string;
          user_id?: string;
          event?: string;
          description?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "process_timeline_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "process_timeline_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "process_timeline_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      processos: {
        Row: {
          id: string;
          company_id: string | null;
          numero: string;
          cliente_id: string | null;
          cliente_nome: string | null;
          tipo: string;
          status: string;
          descricao: string | null;
          responsavel_id: string | null;
          created_by: string | null;
          colaboradores: string[] | null;
          tribunal: string | null;
          cidade: string | null;
          provincia: string | null;
          juiz: string | null;
          parte_contraria: string | null;
          advogado_parte_contraria: string | null;
          valor_causa: number | null;
          prioridade: string | null;
          etiquetas: string[] | null;
          observacoes_gerais: string | null;
          ultima_movimentacao: string | null;
          proxima_audiencia: string | null;
          deadline_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          numero?: string;
          cliente_id?: string | null;
          cliente_nome?: string | null;
          tipo: string;
          status?: string;
          descricao?: string | null;
          responsavel_id?: string | null;
          created_by?: string | null;
          colaboradores?: string[] | null;
          etiquetas?: string[] | null;
          observacoes_gerais?: string | null;
          tribunal?: string | null;
          cidade?: string | null;
          provincia?: string | null;
          juiz?: string | null;
          parte_contraria?: string | null;
          advogado_parte_contraria?: string | null;
          valor_causa?: number | null;
          prioridade?: string | null;
          ultima_movimentacao?: string | null;
          proxima_audiencia?: string | null;
          deadline_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          numero?: string;
          cliente_id?: string | null;
          cliente_nome?: string | null;
          tipo?: string;
          status?: string;
          descricao?: string | null;
          responsavel_id?: string | null;
          created_by?: string | null;
          colaboradores?: string[] | null;
          etiquetas?: string[] | null;
          observacoes_gerais?: string | null;
          tribunal?: string | null;
          cidade?: string | null;
          provincia?: string | null;
          juiz?: string | null;
          parte_contraria?: string | null;
          advogado_parte_contraria?: string | null;
          valor_causa?: number | null;
          prioridade?: string | null;
          ultima_movimentacao?: string | null;
          proxima_audiencia?: string | null;
          deadline_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processos_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "processos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "processos_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      hearings: {
        Row: {
          id: string;
          company_id: string | null;
          case_id: string;
          responsible_professional_id: string;
          hearing_date: string;
          hearing_time: string;
          court_name: string;
          courtroom: string | null;
          judge_name: string | null;
          city: string;
          address: string | null;
          notes: string | null;
          status: string;
          reminder_date: string | null;
          reminder_time: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          enable_legal_guidance: boolean;
          case_type: string | null;
          case_description: string | null;
          people_involved: string | null;
          expected_outcome: string | null;
          legal_notes: string | null;
          legal_guidance_status: string;
          legal_guidance_generated_at: string | null;
          legal_guidance_document: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          case_id: string;
          responsible_professional_id: string;
          hearing_date: string;
          hearing_time: string;
          court_name: string;
          courtroom?: string | null;
          judge_name?: string | null;
          city: string;
          address?: string | null;
          notes?: string | null;
          status?: string;
          reminder_date?: string | null;
          reminder_time?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          enable_legal_guidance?: boolean;
          case_type?: string | null;
          case_description?: string | null;
          people_involved?: string | null;
          expected_outcome?: string | null;
          legal_notes?: string | null;
          legal_guidance_status?: string;
          legal_guidance_generated_at?: string | null;
          legal_guidance_document?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          case_id?: string;
          responsible_professional_id?: string;
          hearing_date?: string;
          hearing_time?: string;
          court_name?: string;
          courtroom?: string | null;
          judge_name?: string | null;
          city?: string;
          address?: string | null;
          notes?: string | null;
          status?: string;
          reminder_date?: string | null;
          reminder_time?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          enable_legal_guidance?: boolean;
          case_type?: string | null;
          case_description?: string | null;
          people_involved?: string | null;
          expected_outcome?: string | null;
          legal_notes?: string | null;
          legal_guidance_status?: string;
          legal_guidance_generated_at?: string | null;
          legal_guidance_document?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hearings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hearings_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hearings_responsible_professional_id_fkey";
            columns: ["responsible_professional_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      legal_guidance: {
        Row: {
          id: string;
          company_id: string | null;
          hearing_id: string;
          process_id: string | null;
          status: string;
          summary: string | null;
          legal_analysis: string | null;
          recommended_strategy: string | null;
          probable_questions: unknown | null;
          jurisprudence: unknown | null;
          important_points: unknown | null;
          next_steps: unknown | null;
          audio_url: string | null;
          generated_by: string | null;
          model_used: string | null;
          tokens_used: number | null;
          generation_time: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          hearing_id: string;
          process_id?: string | null;
          status?: string;
          summary?: string | null;
          legal_analysis?: string | null;
          recommended_strategy?: string | null;
          probable_questions?: unknown | null;
          jurisprudence?: unknown | null;
          important_points?: unknown | null;
          next_steps?: unknown | null;
          audio_url?: string | null;
          generated_by?: string | null;
          model_used?: string | null;
          tokens_used?: number | null;
          generation_time?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          hearing_id?: string;
          process_id?: string | null;
          status?: string;
          summary?: string | null;
          legal_analysis?: string | null;
          recommended_strategy?: string | null;
          probable_questions?: unknown | null;
          jurisprudence?: unknown | null;
          important_points?: unknown | null;
          next_steps?: unknown | null;
          audio_url?: string | null;
          generated_by?: string | null;
          model_used?: string | null;
          tokens_used?: number | null;
          generation_time?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "legal_guidance_hearing_id_fkey";
            columns: ["hearing_id"];
            isOneToOne: false;
            referencedRelation: "hearings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "legal_guidance_process_id_fkey";
            columns: ["process_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
        ];
      };
      processo_etapas: {
        Row: {
          id: string;
          processo_id: string;
          titulo: string;
          descricao: string | null;
          status: string;
          observacoes: string | null;
          responsavel_id: string | null;
          tarefas: string | null;
          data_prevista: string | null;
          ordem: number;
          company_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          processo_id: string;
          titulo: string;
          descricao?: string | null;
          status?: string;
          observacoes?: string | null;
          responsavel_id?: string | null;
          tarefas?: string | null;
          data_prevista?: string | null;
          ordem?: number;
          company_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          processo_id?: string;
          titulo?: string;
          descricao?: string | null;
          status?: string;
          observacoes?: string | null;
          responsavel_id?: string | null;
          tarefas?: string | null;
          data_prevista?: string | null;
          ordem?: number;
          company_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processo_etapas_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "processo_etapas_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      processo_documentos: {
        Row: {
          id: string;
          processo_id: string;
          etapa_id: string | null;
          nome_ficheiro: string;
          arquivo_url: string;
          tipo_ficheiro: string | null;
          categoria: string | null;
          uploaded_by: string | null;
          company_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          processo_id: string;
          etapa_id?: string | null;
          nome_ficheiro: string;
          arquivo_url: string;
          tipo_ficheiro?: string | null;
          categoria?: string | null;
          uploaded_by?: string | null;
          company_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          processo_id?: string;
          etapa_id?: string | null;
          nome_ficheiro?: string;
          arquivo_url?: string;
          tipo_ficheiro?: string | null;
          categoria?: string | null;
          uploaded_by?: string | null;
          company_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processo_documentos_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "processo_documentos_etapa_id_fkey";
            columns: ["etapa_id"];
            isOneToOne: false;
            referencedRelation: "processo_etapas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "processo_documentos_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      processo_historico: {
        Row: {
          id: string;
          processo_id: string;
          etapa_id: string | null;
          tarefa_id: string | null;
          tipo: string;
          descricao: string;
          company_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          processo_id: string;
          etapa_id?: string | null;
          tarefa_id?: string | null;
          tipo: string;
          descricao: string;
          company_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          processo_id?: string;
          etapa_id?: string | null;
          tarefa_id?: string | null;
          tipo?: string;
          descricao?: string;
          company_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processo_historico_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "processo_historico_etapa_id_fkey";
            columns: ["etapa_id"];
            isOneToOne: false;
            referencedRelation: "processo_etapas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "processo_historico_tarefa_id_fkey";
            columns: ["tarefa_id"];
            isOneToOne: false;
            referencedRelation: "processo_tarefas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "processo_historico_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      tarefas: {
        Row: {
          id: string;
          company_id: string | null;
          processo_id: string | null;
          client_id: string | null;
          title: string;
          description: string | null;
          task_date: string;
          reminder_date: string;
          reminder_time: string;
          phone_country_code: string | null;
          phone_number: string | null;
          task_time: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          processo_id?: string | null;
          client_id?: string | null;
          title: string;
          description?: string | null;
          task_date: string;
          reminder_date: string;
          reminder_time?: string;
          phone_country_code?: string | null;
          phone_number?: string | null;
          task_time?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          processo_id?: string | null;
          client_id?: string | null;
          title?: string;
          description?: string | null;
          task_date?: string;
          reminder_date?: string;
          reminder_time?: string;
          phone_country_code?: string | null;
          phone_number?: string | null;
          task_time?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tarefas_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tarefas_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tarefas_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      tarefas: {
        Row: {
          id: string;
          company_id: string | null;
          processo_id: string | null;
          client_id: string | null;
          title: string;
          description: string | null;
          task_date: string;
          reminder_date: string;
          reminder_time: string;
          phone_country_code: string | null;
          phone_number: string | null;
          task_time: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          processo_id?: string | null;
          client_id?: string | null;
          title: string;
          description?: string | null;
          task_date: string;
          reminder_date: string;
          reminder_time?: string;
          phone_country_code?: string | null;
          phone_number?: string | null;
          task_time?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          processo_id?: string | null;
          client_id?: string | null;
          title?: string;
          description?: string | null;
          task_date?: string;
          reminder_date?: string;
          reminder_time?: string;
          phone_country_code?: string | null;
          phone_number?: string | null;
          task_time?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tarefas_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tarefas_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tarefas_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      profissionais: {
        Row: {
          id: string;
          nome: string;
          cargo: string | null;
          contacto: string | null;
          email: string | null;
          company_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          cargo?: string | null;
          contacto?: string | null;
          email?: string | null;
          company_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          cargo?: string | null;
          contacto?: string | null;
          email?: string | null;
          company_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profissionais_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      case_collaborators: {
        Row: {
          id: string;
          company_id: string;
          case_id: string;
          professional_id: string;
          invited_by: string | null;
          accepted: boolean;
          accepted_at: string | null;
          rejected_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          case_id: string;
          professional_id: string;
          invited_by?: string | null;
          accepted?: boolean;
          accepted_at?: string | null;
          rejected_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          case_id?: string;
          professional_id?: string;
          invited_by?: string | null;
          accepted?: boolean;
          accepted_at?: string | null;
          rejected_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "case_collaborators_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_collaborators_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_collaborators_professional_id_fkey";
            columns: ["professional_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_collaborators_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      clientes: {
        Row: {
          id: string;
          nome: string;
          documento: string | null;
          contacto: string | null;
          email: string | null;
          endereco: string | null;
          nacionalidade: string | null;
          tipo_documento: string | null;
          local_emissao: string | null;
          data_emissao: string | null;
          data_validade: string | null;
          cidade: string | null;
          provincia: string | null;
          pais: string | null;
          naturalidade: string | null;
          estado_civil: string | null;
          profissao: string | null;
          data_nascimento: string | null;
          observacoes: string | null;
          empresa: string | null;
          estado: string;
          created_by: string | null;
          company_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          documento?: string | null;
          contacto?: string | null;
          email?: string | null;
          endereco?: string | null;
          nacionalidade?: string | null;
          tipo_documento?: string | null;
          local_emissao?: string | null;
          data_emissao?: string | null;
          data_validade?: string | null;
          cidade?: string | null;
          bairro?: string | null;
          provincia?: string | null;
          pais?: string | null;
          naturalidade?: string | null;
          estado_civil?: string | null;
          profissao?: string | null;
          data_nascimento?: string | null;
          observacoes?: string | null;
          empresa?: string | null;
          estado?: string;
          created_by?: string | null;
          company_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          documento?: string | null;
          contacto?: string | null;
          email?: string | null;
          endereco?: string | null;
          nacionalidade?: string | null;
          tipo_documento?: string | null;
          local_emissao?: string | null;
          data_emissao?: string | null;
          data_validade?: string | null;
          cidade?: string | null;
          bairro?: string | null;
          provincia?: string | null;
          pais?: string | null;
          naturalidade?: string | null;
          estado_civil?: string | null;
          profissao?: string | null;
          data_nascimento?: string | null;
          observacoes?: string | null;
          empresa?: string | null;
          estado?: string;
          created_by?: string | null;
          company_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clientes_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      process_hidden_users: {
        Row: {
          id: string;
          process_id: string;
          user_id: string;
          hidden_at: string;
        };
        Insert: {
          id?: string;
          process_id: string;
          user_id: string;
          hidden_at?: string;
        };
        Update: {
          id?: string;
          process_id?: string;
          user_id?: string;
          hidden_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "process_hidden_users_process_id_fkey";
            columns: ["process_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "process_hidden_users_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      process_collaboration_invites: {
        Row: {
          id: string;
          company_id: string;
          process_id: string;
          invited_by: string | null;
          invited_professional: string;
          status: "pending" | "accepted" | "rejected";
          invitation_type: "process_collaboration";
          message: string | null;
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          process_id: string;
          invited_by?: string | null;
          invited_professional: string;
          status?: "pending" | "accepted" | "rejected";
          invitation_type?: "process_collaboration";
          message?: string | null;
          created_at?: string;
          responded_at?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          process_id?: string;
          invited_by?: string | null;
          invited_professional?: string;
          status?: "pending" | "accepted" | "rejected";
          invitation_type?: "process_collaboration";
          message?: string | null;
          created_at?: string;
          responded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "process_collaboration_invites_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "process_collaboration_invites_process_id_fkey";
            columns: ["process_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "process_collaboration_invites_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "process_collaboration_invites_invited_professional_fkey";
            columns: ["invited_professional"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_logs: {
        Row: {
          id: string;
          event: string;
          company_id: string;
          user_id: string;
          payload: Json;
          sent: boolean;
          status: number | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event: string;
          company_id: string;
          user_id: string;
          payload?: Json;
          sent?: boolean;
          status?: number | null;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event?: string;
          company_id?: string;
          user_id?: string;
          payload?: Json;
          sent?: boolean;
          status?: number | null;
          error?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_logs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "webhook_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          title: string;
          message: string;
          type: "info" | "warning" | "error" | "success" | "reminder";
          entity_type:
            | "case"
            | "hearing"
            | "task"
            | "document"
            | "client"
            | "user"
            | "system"
            | null;
          entity_id: string | null;
          is_read: boolean;
          read_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          title: string;
          message: string;
          type?: "info" | "warning" | "error" | "success" | "reminder";
          entity_type?:
            | "case"
            | "hearing"
            | "task"
            | "document"
            | "client"
            | "user"
            | "system"
            | null;
          entity_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: "info" | "warning" | "error" | "success" | "reminder";
          entity_type?:
            | "case"
            | "hearing"
            | "task"
            | "document"
            | "client"
            | "user"
            | "system"
            | null;
          entity_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      agenda_events: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          description: string | null;
          event_date: string;
          event_time: string | null;
          location: string | null;
          notes: string | null;
          event_type: string;
          status: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          description?: string | null;
          event_date: string;
          event_time?: string | null;
          location?: string | null;
          notes?: string | null;
          event_type?: string;
          status?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          title?: string;
          description?: string | null;
          event_date?: string;
          event_time?: string | null;
          location?: string | null;
          notes?: string | null;
          event_type?: string;
          status?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agenda_events_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [key: string]: never;
    };
    Functions: {
      next_contract_number: { Args: { _company_id: string }; Returns: string };
      next_processo_number: { Args: { _company_id: string }; Returns: string };
    };
    Enums: {
      [key: string]: never;
    };
    CompositeTypes: {
      [key: string]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

