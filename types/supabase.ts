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
      agent_knowledge_base_files: {
        Row: {
          agent_id: string
          created_at: string
          file_id: string
          linked_by_user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          file_id: string
          linked_by_user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          file_id?: string
          linked_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_knowledge_base_files_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_knowledge_base_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_knowledge_base_files_linked_by_user_id_fkey"
            columns: ["linked_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      knowledge_base_files: {
        Row: {
          bucket: string
          created_at: string
          id: string
          link_status: Database["public"]["Enums"]["kb_file_link_status"]
          mime_type: string
          name: string
          owner_user_id: string | null
          summary_generated_at: string | null
          summary_model: string | null
          summary_text: string | null
          scope: Database["public"]["Enums"]["kb_file_scope"]
          size_bytes: number
          storage_path: string
          updated_at: string
          uploaded_by_user_id: string
        }
        Insert: {
          bucket?: string
          created_at?: string
          id?: string
          link_status?: Database["public"]["Enums"]["kb_file_link_status"]
          mime_type: string
          name: string
          owner_user_id?: string | null
          summary_generated_at?: string | null
          summary_model?: string | null
          summary_text?: string | null
          scope?: Database["public"]["Enums"]["kb_file_scope"]
          size_bytes: number
          storage_path: string
          updated_at?: string
          uploaded_by_user_id: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          link_status?: Database["public"]["Enums"]["kb_file_link_status"]
          mime_type?: string
          name?: string
          owner_user_id?: string | null
          summary_generated_at?: string | null
          summary_model?: string | null
          summary_text?: string | null
          scope?: Database["public"]["Enums"]["kb_file_scope"]
          size_bytes?: number
          storage_path?: string
          updated_at?: string
          uploaded_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_files_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_files_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      saved_memories: {
        Row: {
          archived_at: string | null
          category: Database["public"]["Enums"]["memory_category"]
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          last_referenced_at: string | null
          priority: Database["public"]["Enums"]["memory_priority"]
          source: Database["public"]["Enums"]["memory_source"]
          source_chat_id: string | null
          status: Database["public"]["Enums"]["memory_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          category?: Database["public"]["Enums"]["memory_category"]
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_referenced_at?: string | null
          priority?: Database["public"]["Enums"]["memory_priority"]
          source?: Database["public"]["Enums"]["memory_source"]
          source_chat_id?: string | null
          status?: Database["public"]["Enums"]["memory_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          category?: Database["public"]["Enums"]["memory_category"]
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_referenced_at?: string | null
          priority?: Database["public"]["Enums"]["memory_priority"]
          source?: Database["public"]["Enums"]["memory_source"]
          source_chat_id?: string | null
          status?: Database["public"]["Enums"]["memory_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_memories_source_chat_id_fkey"
            columns: ["source_chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_memories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_memory_revisions: {
        Row: {
          action: Database["public"]["Enums"]["memory_revision_action"]
          actor_user_id: string
          created_at: string
          id: number
          memory_id: string | null
          next_value: Json | null
          previous_value: Json | null
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["memory_revision_action"]
          actor_user_id: string
          created_at?: string
          id?: number
          memory_id?: string | null
          next_value?: Json | null
          previous_value?: Json | null
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["memory_revision_action"]
          actor_user_id?: string
          created_at?: string
          id?: number
          memory_id?: string | null
          next_value?: Json | null
          previous_value?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_memory_revisions_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_memory_revisions_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "saved_memories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_memory_revisions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          answer_preference: string | null
          avatar_url: string | null
          created_at: string
          favorite_agent_ids: string[]
          full_name: string | null
          id: string
          reference_chat_history: boolean
          reference_saved_memories: boolean
          role: string
          updated_at: string
        }
        Insert: {
          answer_preference?: string | null
          avatar_url?: string | null
          created_at?: string
          favorite_agent_ids?: string[]
          full_name?: string | null
          id: string
          reference_chat_history?: boolean
          reference_saved_memories?: boolean
          role?: string
          updated_at?: string
        }
        Update: {
          answer_preference?: string | null
          avatar_url?: string | null
          created_at?: string
          favorite_agent_ids?: string[]
          full_name?: string | null
          id?: string
          reference_chat_history?: boolean
          reference_saved_memories?: boolean
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
      kb_file_link_status: "unlinked" | "linked-to-agent"
      kb_file_scope: "admin" | "user"
      memory_category:
        | "identity"
        | "preference"
        | "communication-style"
        | "work-context"
        | "project-context"
        | "agent-preference"
        | "constraint"
        | "other"
      memory_priority: "core" | "standard" | "background"
      memory_revision_action:
        | "created"
        | "updated"
        | "archived"
        | "deleted"
        | "restored"
      memory_source: "explicit-user" | "assistant-inferred" | "manual-panel"
      memory_status: "active" | "archived" | "deleted"
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
      kb_file_link_status: ["unlinked", "linked-to-agent"],
      kb_file_scope: ["admin", "user"],
    },
  },
} as const
