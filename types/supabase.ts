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
      agents: {
        Row: {
          base_model: string
          category: string | null
          created_at: string
          description: string | null
          icon: string
          id: string
          is_builtin: boolean
          name: string
          system_prompt: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          base_model?: string
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_builtin?: boolean
          name: string
          system_prompt: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          base_model?: string
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_builtin?: boolean
          name?: string
          system_prompt?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      billing_tiers: {
        Row: {
          annual_price_usd: number
          custom_agent_limit: number | null
          display_name: string
          features: Json
          monthly_message_limit: number | null
          monthly_price_usd: number
          monthly_request_limit: number | null
          plan: string
          updated_at: string
        }
        Insert: {
          annual_price_usd: number
          custom_agent_limit?: number | null
          display_name: string
          features?: Json
          monthly_message_limit?: number | null
          monthly_price_usd: number
          monthly_request_limit?: number | null
          plan: string
          updated_at?: string
        }
        Update: {
          annual_price_usd?: number
          custom_agent_limit?: number | null
          display_name?: string
          features?: Json
          monthly_message_limit?: number | null
          monthly_price_usd?: number
          monthly_request_limit?: number | null
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_trash_tokens: {
        Row: {
          assistant_content: string | null
          chat_id: string
          created_at: string
          id: number
          reason: string
          turn_key: string
          user_content: string | null
          user_id: string
        }
        Insert: {
          assistant_content?: string | null
          chat_id: string
          created_at?: string
          id?: number
          reason: string
          turn_key: string
          user_content?: string | null
          user_id: string
        }
        Update: {
          assistant_content?: string | null
          chat_id?: string
          created_at?: string
          id?: number
          reason?: string
          turn_key?: string
          user_content?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_turn_pairs: {
        Row: {
          assistant_content: string
          chat_id: string
          created_at: string
          turn_key: string
          user_content: string
          user_id: string
          user_parts: Json | null
        }
        Insert: {
          assistant_content: string
          chat_id: string
          created_at?: string
          turn_key: string
          user_content: string
          user_id: string
          user_parts?: Json | null
        }
        Update: {
          assistant_content?: string
          chat_id?: string
          created_at?: string
          turn_key?: string
          user_content?: string
          user_id?: string
          user_parts?: Json | null
        }
        Relationships: []
      }
      chats: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          model: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          model?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          model?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          parts: Json | null
          role: string
          user_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          parts?: Json | null
          role: string
          user_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          parts?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_interval: string | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          assistant_message_chars: number
          billing_interval: string | null
          chat_id: string | null
          created_at: string
          event_key: string
          event_type: string
          metadata: Json
          model: string
          occurred_at: string
          plan: string
          request_count: number
          request_trigger: string | null
          source: string
          turn_key: string | null
          user_id: string
          user_message_chars: number
        }
        Insert: {
          assistant_message_chars?: number
          billing_interval?: string | null
          chat_id?: string | null
          created_at?: string
          event_key: string
          event_type: string
          metadata?: Json
          model: string
          occurred_at?: string
          plan: string
          request_count?: number
          request_trigger?: string | null
          source: string
          turn_key?: string | null
          user_id: string
          user_message_chars?: number
        }
        Update: {
          assistant_message_chars?: number
          billing_interval?: string | null
          chat_id?: string | null
          created_at?: string
          event_key?: string
          event_type?: string
          metadata?: Json
          model?: string
          occurred_at?: string
          plan?: string
          request_count?: number
          request_trigger?: string | null
          source?: string
          turn_key?: string | null
          user_id?: string
          user_message_chars?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      persist_chat_turn_pair: {
        Args: {
          p_assistant_content: string
          p_chat_id: string
          p_turn_key: string
          p_user_content: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
