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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics_history: {
        Row: {
          avg_session_duration: number
          bounce_rate: number
          company_id: string
          created_at: string
          date: string
          engagement_rate: number
          new_users: number
          pages_per_session: number
          property_id: string
          returning_users: number
          sessions: number
          users: number
        }
        Insert: {
          avg_session_duration?: number
          bounce_rate?: number
          company_id: string
          created_at?: string
          date: string
          engagement_rate?: number
          new_users?: number
          pages_per_session?: number
          property_id: string
          returning_users?: number
          sessions?: number
          users?: number
        }
        Update: {
          avg_session_duration?: number
          bounce_rate?: number
          company_id?: string
          created_at?: string
          date?: string
          engagement_rate?: number
          new_users?: number
          pages_per_session?: number
          property_id?: string
          returning_users?: number
          sessions?: number
          users?: number
        }
        Relationships: []
      }
      analytics_snapshots: {
        Row: {
          age: Json
          channels: Json
          company_id: string
          countries: Json
          created_at: string
          devices: Json
          gender: Json
          granularity: string
          id: string
          keywords: Json
          period_end: string
          period_start: string
          property_id: string
          top_pages: Json
          totals: Json
          traffic_sources: Json
        }
        Insert: {
          age?: Json
          channels?: Json
          company_id: string
          countries?: Json
          created_at?: string
          devices?: Json
          gender?: Json
          granularity?: string
          id?: string
          keywords?: Json
          period_end: string
          period_start: string
          property_id: string
          top_pages?: Json
          totals?: Json
          traffic_sources?: Json
        }
        Update: {
          age?: Json
          channels?: Json
          company_id?: string
          countries?: Json
          created_at?: string
          devices?: Json
          gender?: Json
          granularity?: string
          id?: string
          keywords?: Json
          period_end?: string
          period_start?: string
          property_id?: string
          top_pages?: Json
          totals?: Json
          traffic_sources?: Json
        }
        Relationships: []
      }
      api_errors: {
        Row: {
          company_id: string
          created_at: string
          endpoint: string | null
          error_message: string | null
          id: string
          payload: Json | null
          platform: Database["public"]["Enums"]["platform_kind"] | null
          status_code: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          endpoint?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          platform?: Database["public"]["Enums"]["platform_kind"] | null
          status_code?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          endpoint?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          platform?: Database["public"]["Enums"]["platform_kind"] | null
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_errors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audience_insights: {
        Row: {
          company_id: string
          created_at: string
          id: string
          payload: Json
          period_end: string
          period_start: string
          property_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          payload?: Json
          period_end: string
          period_start: string
          property_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          payload?: Json
          period_end?: string
          period_start?: string
          property_id?: string
        }
        Relationships: []
      }
      brand_guideline_files: {
        Row: {
          created_at: string
          error_message: string | null
          file_name: string
          file_size_bytes: number | null
          file_url: string
          format: string
          guideline_id: string
          id: string
          status: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_url: string
          format: string
          guideline_id: string
          id?: string
          status?: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_url?: string
          format?: string
          guideline_id?: string
          id?: string
          status?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_guideline_files_guideline_id_fkey"
            columns: ["guideline_id"]
            isOneToOne: false
            referencedRelation: "brand_guidelines"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_guideline_workspaces: {
        Row: {
          colors: Json
          company_id: string
          confidence: number
          created_at: string
          export_format: string
          form: Json
          guideline: Json | null
          id: string
          mode: string
          phase: string
          updated_at: string
          updated_by: string | null
          website_analysis: Json | null
        }
        Insert: {
          colors?: Json
          company_id: string
          confidence?: number
          created_at?: string
          export_format?: string
          form?: Json
          guideline?: Json | null
          id?: string
          mode?: string
          phase?: string
          updated_at?: string
          updated_by?: string | null
          website_analysis?: Json | null
        }
        Update: {
          colors?: Json
          company_id?: string
          confidence?: number
          created_at?: string
          export_format?: string
          form?: Json
          guideline?: Json | null
          id?: string
          mode?: string
          phase?: string
          updated_at?: string
          updated_by?: string | null
          website_analysis?: Json | null
        }
        Relationships: []
      }
      brand_guidelines: {
        Row: {
          ai_generated_content: Json | null
          brand_admire: string | null
          brand_keywords: Json | null
          brand_name: string
          brand_personality_archetype: string | null
          brand_positioning: string | null
          brand_stage: string | null
          brand_voice_tone: Json | null
          color_preference: Json | null
          communication_style: string | null
          competitor_brand: string | null
          countries: Json | null
          created_at: string
          error_message: string | null
          id: string
          industry: string
          logo_url: string | null
          primary_audience: string | null
          region: string
          selected_export_formats: Json
          short_description: string
          slogan: string | null
          status: string
          typography: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          ai_generated_content?: Json | null
          brand_admire?: string | null
          brand_keywords?: Json | null
          brand_name: string
          brand_personality_archetype?: string | null
          brand_positioning?: string | null
          brand_stage?: string | null
          brand_voice_tone?: Json | null
          color_preference?: Json | null
          communication_style?: string | null
          competitor_brand?: string | null
          countries?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          industry: string
          logo_url?: string | null
          primary_audience?: string | null
          region: string
          selected_export_formats: Json
          short_description: string
          slogan?: string | null
          status?: string
          typography?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          ai_generated_content?: Json | null
          brand_admire?: string | null
          brand_keywords?: Json | null
          brand_name?: string
          brand_personality_archetype?: string | null
          brand_positioning?: string | null
          brand_stage?: string | null
          brand_voice_tone?: Json | null
          color_preference?: Json | null
          communication_style?: string | null
          competitor_brand?: string | null
          countries?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          industry?: string
          logo_url?: string | null
          primary_audience?: string | null
          region?: string
          selected_export_formats?: Json
          short_description?: string
          slogan?: string | null
          status?: string
          typography?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      brand_identity: {
        Row: {
          brand_goal: string | null
          business_location: string | null
          company_id: string
          created_at: string
          id: string
          target_audience: string | null
          updated_at: string
        }
        Insert: {
          brand_goal?: string | null
          business_location?: string | null
          company_id: string
          created_at?: string
          id?: string
          target_audience?: string | null
          updated_at?: string
        }
        Update: {
          brand_goal?: string | null
          business_location?: string | null
          company_id?: string
          created_at?: string
          id?: string
          target_audience?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_identity_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          demo_mode: boolean
          employee_size: string | null
          id: string
          industry: string | null
          name: string
          owner_id: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          demo_mode?: boolean
          employee_size?: string | null
          id?: string
          industry?: string | null
          name: string
          owner_id: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          demo_mode?: boolean
          employee_size?: string | null
          id?: string
          industry?: string | null
          name?: string
          owner_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_sources: {
        Row: {
          company_id: string
          created_at: string
          external_account_id: string | null
          external_account_label: string | null
          id: string
          last_error: string | null
          last_synced_at: string | null
          metadata: Json
          platform: Database["public"]["Enums"]["platform_kind"]
          scopes: string[] | null
          status: Database["public"]["Enums"]["connection_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          external_account_id?: string | null
          external_account_label?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          metadata?: Json
          platform: Database["public"]["Enums"]["platform_kind"]
          scopes?: string[] | null
          status?: Database["public"]["Enums"]["connection_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          external_account_id?: string | null
          external_account_label?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          metadata?: Json
          platform?: Database["public"]["Enums"]["platform_kind"]
          scopes?: string[] | null
          status?: Database["public"]["Enums"]["connection_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connected_sources_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ga4_properties: {
        Row: {
          account_id: string | null
          company_id: string
          created_at: string
          currency_code: string | null
          default_uri: string | null
          display_name: string | null
          id: string
          property_id: string
          time_zone: string | null
        }
        Insert: {
          account_id?: string | null
          company_id: string
          created_at?: string
          currency_code?: string | null
          default_uri?: string | null
          display_name?: string | null
          id?: string
          property_id: string
          time_zone?: string | null
        }
        Update: {
          account_id?: string | null
          company_id?: string
          created_at?: string
          currency_code?: string | null
          default_uri?: string | null
          display_name?: string | null
          id?: string
          property_id?: string
          time_zone?: string | null
        }
        Relationships: []
      }
      ga4_property_mappings: {
        Row: {
          company_id: string
          created_at: string
          property_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          property_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          property_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      google_connections: {
        Row: {
          access_token: string | null
          access_token_expires_at: string | null
          company_id: string
          connection_source: string
          created_at: string
          google_user_email: string | null
          google_user_id: string | null
          id: string
          last_error: string | null
          last_synced_at: string | null
          refresh_token_ciphertext: string | null
          refresh_token_iv: string | null
          scopes: string[]
          status: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          access_token?: string | null
          access_token_expires_at?: string | null
          company_id: string
          connection_source?: string
          created_at?: string
          google_user_email?: string | null
          google_user_id?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          refresh_token_ciphertext?: string | null
          refresh_token_iv?: string | null
          scopes?: string[]
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          access_token?: string | null
          access_token_expires_at?: string | null
          company_id?: string
          connection_source?: string
          created_at?: string
          google_user_email?: string | null
          google_user_id?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          refresh_token_ciphertext?: string | null
          refresh_token_iv?: string | null
          scopes?: string[]
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      predictions: {
        Row: {
          company_id: string
          generated_at: string
          horizon_days: number
          id: string
          mape: number | null
          metric: string
          model: string
          property_id: string
          rmse: number | null
          series: Json
        }
        Insert: {
          company_id: string
          generated_at?: string
          horizon_days: number
          id?: string
          mape?: number | null
          metric: string
          model: string
          property_id: string
          rmse?: number | null
          series?: Json
        }
        Update: {
          company_id?: string
          generated_at?: string
          horizon_days?: number
          id?: string
          mape?: number | null
          metric?: string
          model?: string
          property_id?: string
          rmse?: number | null
          series?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          theme: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          theme?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          body: string
          company_id: string
          confidence: number | null
          generated_at: string
          id: string
          kind: string
          metadata: Json
          property_id: string | null
          title: string
        }
        Insert: {
          body: string
          company_id: string
          confidence?: number | null
          generated_at?: string
          id?: string
          kind: string
          metadata?: Json
          property_id?: string | null
          title: string
        }
        Update: {
          body?: string
          company_id?: string
          confidence?: number | null
          generated_at?: string
          id?: string
          kind?: string
          metadata?: Json
          property_id?: string | null
          title?: string
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          company_id: string
          duration_ms: number | null
          finished_at: string | null
          id: string
          message: string | null
          platform: Database["public"]["Enums"]["platform_kind"]
          source_id: string | null
          started_at: string
          status: string
        }
        Insert: {
          company_id: string
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          message?: string | null
          platform: Database["public"]["Enums"]["platform_kind"]
          source_id?: string | null
          started_at?: string
          status: string
        }
        Update: {
          company_id?: string
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          message?: string | null
          platform?: Database["public"]["Enums"]["platform_kind"]
          source_id?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_logs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "connected_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          business_goal: string | null
          city: string | null
          company_name: string | null
          country: string | null
          country_code: string | null
          created_at: string
          id: string
          industry: string | null
          logo_storage_path: string | null
          logo_url: string | null
          phone_country_code: string | null
          phone_country_dial: string | null
          phone_number: string | null
          postal_code: string | null
          profile_completion_pct: number
          slogan: string | null
          street_address: string | null
          team_size: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          business_goal?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          logo_storage_path?: string | null
          logo_url?: string | null
          phone_country_code?: string | null
          phone_country_dial?: string | null
          phone_number?: string | null
          postal_code?: string | null
          profile_completion_pct?: number
          slogan?: string | null
          street_address?: string | null
          team_size?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          business_goal?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          logo_storage_path?: string | null
          logo_url?: string | null
          phone_country_code?: string | null
          phone_country_dial?: string | null
          phone_number?: string | null
          postal_code?: string | null
          profile_completion_pct?: number
          slogan?: string | null
          street_address?: string | null
          team_size?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      website_analysis: {
        Row: {
          analyzed_at: string | null
          branding: Json | null
          company_id: string
          created_at: string
          description: string | null
          error: string | null
          id: string
          links: Json | null
          markdown: string | null
          metadata: Json | null
          screenshot_url: string | null
          source_id: string | null
          status: string
          summary: string | null
          title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          analyzed_at?: string | null
          branding?: Json | null
          company_id: string
          created_at?: string
          description?: string | null
          error?: string | null
          id?: string
          links?: Json | null
          markdown?: string | null
          metadata?: Json | null
          screenshot_url?: string | null
          source_id?: string | null
          status?: string
          summary?: string | null
          title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          analyzed_at?: string | null
          branding?: Json | null
          company_id?: string
          created_at?: string
          description?: string | null
          error?: string | null
          id?: string
          links?: Json | null
          markdown?: string | null
          metadata?: Json | null
          screenshot_url?: string | null
          source_id?: string | null
          status?: string
          summary?: string | null
          title?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      connection_status:
        | "not_connected"
        | "connecting"
        | "connected"
        | "syncing"
        | "permission_expired"
        | "api_error"
      platform_kind:
        | "website"
        | "google_analytics"
        | "google_search_console"
        | "facebook"
        | "instagram"
        | "tiktok"
        | "linkedin"
        | "youtube"
        | "google_business"
        | "twitter"
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
      connection_status: [
        "not_connected",
        "connecting",
        "connected",
        "syncing",
        "permission_expired",
        "api_error",
      ],
      platform_kind: [
        "website",
        "google_analytics",
        "google_search_console",
        "facebook",
        "instagram",
        "tiktok",
        "linkedin",
        "youtube",
        "google_business",
        "twitter",
      ],
    },
  },
} as const
