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
      barcode_cache: {
        Row: {
          barcode: string
          calories_kcal: number
          created_at: string
          health_score: number
          product_name: string
          rating: string
          result: Json
          summary: string | null
          updated_at: string
        }
        Insert: {
          barcode: string
          calories_kcal: number
          created_at?: string
          health_score: number
          product_name: string
          rating: string
          result: Json
          summary?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string
          calories_kcal?: number
          created_at?: string
          health_score?: number
          product_name?: string
          rating?: string
          result?: Json
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      consumption: {
        Row: {
          calories_kcal: number
          consumed_at: string
          id: string
          product_name: string | null
          scan_id: string | null
          user_id: string
        }
        Insert: {
          calories_kcal?: number
          consumed_at?: string
          id?: string
          product_name?: string | null
          scan_id?: string | null
          user_id: string
        }
        Update: {
          calories_kcal?: number
          consumed_at?: string
          id?: string
          product_name?: string | null
          scan_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumption_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          allergies: string | null
          created_at: string
          email: string | null
          gender: string | null
          height_cm: number | null
          id: string
          illnesses: string | null
          is_subscribed: boolean
          plan: string
          plan_expires_at: string | null
          scan_count: number
          subscription_expires_at: string | null
          username: string | null
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          allergies?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          height_cm?: number | null
          id: string
          illnesses?: string | null
          is_subscribed?: boolean
          plan?: string
          plan_expires_at?: string | null
          scan_count?: number
          subscription_expires_at?: string | null
          username?: string | null
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          allergies?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          illnesses?: string | null
          is_subscribed?: boolean
          plan?: string
          plan_expires_at?: string | null
          scan_count?: number
          subscription_expires_at?: string | null
          username?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      scan_feedback: {
        Row: {
          buy_again: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          scan_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          buy_again: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          scan_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          buy_again?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          scan_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_feedback_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          advantages: Json | null
          calories_kcal: number | null
          cautions: Json | null
          created_at: string
          disadvantages: Json | null
          health_score: number | null
          id: string
          input_text: string | null
          product_name: string | null
          rating: string | null
          result: Json | null
          scan_type: string
          summary: string | null
          user_id: string
        }
        Insert: {
          advantages?: Json | null
          calories_kcal?: number | null
          cautions?: Json | null
          created_at?: string
          disadvantages?: Json | null
          health_score?: number | null
          id?: string
          input_text?: string | null
          product_name?: string | null
          rating?: string | null
          result?: Json | null
          scan_type?: string
          summary?: string | null
          user_id: string
        }
        Update: {
          advantages?: Json | null
          calories_kcal?: number | null
          cautions?: Json | null
          created_at?: string
          disadvantages?: Json | null
          health_score?: number | null
          id?: string
          input_text?: string | null
          product_name?: string | null
          rating?: string | null
          result?: Json | null
          scan_type?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_scan_quota: {
        Args: { _uid: string }
        Returns: {
          new_count: number
          plan: string
          scan_limit: number
        }[]
      }
      get_leaderboard: {
        Args: never
        Returns: {
          avg_score: number
          scan_count: number
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_unlimited_access: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "founder" | "collaborator" | "user"
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
      app_role: ["admin", "founder", "collaborator", "user"],
    },
  },
} as const
