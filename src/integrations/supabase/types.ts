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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      facebook_auto_posts: {
        Row: {
          created_at: string
          current_count: number
          description: string
          hashtags: string | null
          id: string
          interval_hours: number
          last_result: Json | null
          max_posts: number
          next_post_at: string
          page_access_token: string
          page_id: string
          page_name: string | null
          post_type: string
          posts_per_interval: number
          status: string
          title: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          current_count?: number
          description: string
          hashtags?: string | null
          id?: string
          interval_hours?: number
          last_result?: Json | null
          max_posts?: number
          next_post_at?: string
          page_access_token: string
          page_id: string
          page_name?: string | null
          post_type?: string
          posts_per_interval?: number
          status?: string
          title?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          current_count?: number
          description?: string
          hashtags?: string | null
          id?: string
          interval_hours?: number
          last_result?: Json | null
          max_posts?: number
          next_post_at?: string
          page_access_token?: string
          page_id?: string
          page_name?: string | null
          post_type?: string
          posts_per_interval?: number
          status?: string
          title?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          account_indices: number[]
          created_at: string
          id: string
          platform: string
          results: Json | null
          scheduled_at: string
          status: string
          tweet_text: string | null
          video_path: string | null
        }
        Insert: {
          account_indices?: number[]
          created_at?: string
          id?: string
          platform?: string
          results?: Json | null
          scheduled_at: string
          status?: string
          tweet_text?: string | null
          video_path?: string | null
        }
        Update: {
          account_indices?: number[]
          created_at?: string
          id?: string
          platform?: string
          results?: Json | null
          scheduled_at?: string
          status?: string
          tweet_text?: string | null
          video_path?: string | null
        }
        Relationships: []
      }
      short_url_clicks: {
        Row: {
          code: string
          count: number
          day: string
          id: string
        }
        Insert: {
          code: string
          count?: number
          day?: string
          id?: string
        }
        Update: {
          code?: string
          count?: number
          day?: string
          id?: string
        }
        Relationships: []
      }
      short_urls: {
        Row: {
          click_count: number | null
          code: string
          created_at: string | null
          id: string
          original_url: string
        }
        Insert: {
          click_count?: number | null
          code: string
          created_at?: string | null
          id?: string
          original_url: string
        }
        Update: {
          click_count?: number | null
          code?: string
          created_at?: string | null
          id?: string
          original_url?: string
        }
        Relationships: []
      }
      threads_auto_posts: {
        Row: {
          created_at: string
          current_count: number
          id: string
          interval_hours: number
          last_result: Json | null
          max_posts: number
          media_type: string
          media_url: string | null
          next_post_at: string
          posts_per_interval: number
          status: string
          text: string
          topic: string | null
        }
        Insert: {
          created_at?: string
          current_count?: number
          id?: string
          interval_hours?: number
          last_result?: Json | null
          max_posts?: number
          media_type?: string
          media_url?: string | null
          next_post_at?: string
          posts_per_interval?: number
          status?: string
          text: string
          topic?: string | null
        }
        Update: {
          created_at?: string
          current_count?: number
          id?: string
          interval_hours?: number
          last_result?: Json | null
          max_posts?: number
          media_type?: string
          media_url?: string | null
          next_post_at?: string
          posts_per_interval?: number
          status?: string
          text?: string
          topic?: string | null
        }
        Relationships: []
      }
      user_smart_links: {
        Row: {
          clicks: number
          created_at: string
          description: string | null
          destination_url: string
          id: string
          metadata: Json
          slug: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          description?: string | null
          destination_url: string
          id?: string
          metadata?: Json
          slug: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clicks?: number
          created_at?: string
          description?: string | null
          destination_url?: string
          id?: string
          metadata?: Json
          slug?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      youtube_tokens: {
        Row: {
          access_token: string
          channel_id: string | null
          channel_title: string | null
          client_id: string | null
          created_at: string
          id: string
          refresh_token: string
          token_expiry: string
        }
        Insert: {
          access_token: string
          channel_id?: string | null
          channel_title?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          refresh_token: string
          token_expiry: string
        }
        Update: {
          access_token?: string
          channel_id?: string | null
          channel_title?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          refresh_token?: string
          token_expiry?: string
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
