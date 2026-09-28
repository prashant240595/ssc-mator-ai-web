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
      account_deletion_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          status: string
          updated_at: string
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      app_flags: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          content_md: string
          cover_alt: string | null
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          job_stage: string
          meta_description: string | null
          meta_title: string | null
          post_type: string
          published: boolean
          published_at: string | null
          reading_minutes: number | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          content_md: string
          cover_alt?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          job_stage?: string
          meta_description?: string | null
          meta_title?: string | null
          post_type?: string
          published?: boolean
          published_at?: string | null
          reading_minutes?: number | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          content_md?: string
          cover_alt?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          job_stage?: string
          meta_description?: string | null
          meta_title?: string | null
          post_type?: string
          published?: boolean
          published_at?: string | null
          reading_minutes?: number | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_quiz_attempts: {
        Row: {
          answers: Json | null
          correct_count: number
          created_at: string
          id: string
          quiz_date: string
          quiz_id: string
          total_count: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          correct_count?: number
          created_at?: string
          id?: string
          quiz_date: string
          quiz_id: string
          total_count?: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          correct_count?: number
          created_at?: string
          id?: string
          quiz_date?: string
          quiz_id?: string
          total_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "daily_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_quizzes: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_type: string
          id: string
          notes: string | null
          published: boolean
          question_ids: string[]
          quiz_date: string
          quiz_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_type?: string
          id?: string
          notes?: string | null
          published?: boolean
          question_ids: string[]
          quiz_date: string
          quiz_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_type?: string
          id?: string
          notes?: string | null
          published?: boolean
          question_ids?: string[]
          quiz_date?: string
          quiz_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      exam_metadata: {
        Row: {
          correct_marks: number
          created_at: string
          created_by: string | null
          exam_name: string
          exam_summary: string | null
          exam_type: string
          id: string
          negative_marking: number
          total_time_minutes: number
          updated_at: string
        }
        Insert: {
          correct_marks?: number
          created_at?: string
          created_by?: string | null
          exam_name: string
          exam_summary?: string | null
          exam_type: string
          id?: string
          negative_marking?: number
          total_time_minutes?: number
          updated_at?: string
        }
        Update: {
          correct_marks?: number
          created_at?: string
          created_by?: string | null
          exam_name?: string
          exam_summary?: string | null
          exam_type?: string
          id?: string
          negative_marking?: number
          total_time_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string | null
          created_at: string
          group_id: string
          id: string
          message_type: string
          question_id: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          group_id: string
          id?: string
          message_type?: string
          question_id?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          group_id?: string
          id?: string
          message_type?: string
          question_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      job_drafts: {
        Row: {
          content_md: string
          created_at: string
          excerpt: string | null
          id: string
          job_stage: string
          meta_description: string | null
          meta_title: string | null
          published_post_slug: string | null
          reviewed_at: string | null
          slug: string
          source_title: string | null
          source_url: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          content_md?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          job_stage?: string
          meta_description?: string | null
          meta_title?: string | null
          published_post_slug?: string | null
          reviewed_at?: string | null
          slug: string
          source_title?: string | null
          source_url: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          content_md?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          job_stage?: string
          meta_description?: string | null
          meta_title?: string | null
          published_post_slug?: string | null
          reviewed_at?: string | null
          slug?: string
          source_title?: string | null
          source_url?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_requests: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          amount_paise: number
          created_at: string
          id: string
          merchant_txn_id: string
          plan: string
          provider: string
          provider_order_id: string
          provider_payment_id: string | null
          raw: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          id?: string
          merchant_txn_id: string
          plan?: string
          provider: string
          provider_order_id: string
          provider_payment_id?: string | null
          raw?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          id?: string
          merchant_txn_id?: string
          plan?: string
          provider?: string
          provider_order_id?: string
          provider_payment_id?: string | null
          raw?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_emoji: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          is_ai: boolean
          onboarding: Json | null
          persona: string | null
          updated_at: string
        }
        Insert: {
          avatar_emoji?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          is_ai?: boolean
          onboarding?: Json | null
          persona?: string | null
          updated_at?: string
        }
        Update: {
          avatar_emoji?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_ai?: boolean
          onboarding?: Json | null
          persona?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          category_type: string | null
          correct: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          difficulty: string | null
          exam_name: string | null
          exam_type: string | null
          explanation: Json | null
          id: string
          image_svg: string | null
          image_url: string | null
          options: Json | null
          shift_details: string | null
          source_pdf: string | null
          subject: string
          test_series_id: string | null
          text: Json | null
          topic: Json | null
          topic_name: string | null
          updated_at: string
        }
        Insert: {
          category_type?: string | null
          correct: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          difficulty?: string | null
          exam_name?: string | null
          exam_type?: string | null
          explanation?: Json | null
          id?: string
          image_svg?: string | null
          image_url?: string | null
          options?: Json | null
          shift_details?: string | null
          source_pdf?: string | null
          subject: string
          test_series_id?: string | null
          text?: Json | null
          topic?: Json | null
          topic_name?: string | null
          updated_at?: string
        }
        Update: {
          category_type?: string | null
          correct?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          difficulty?: string | null
          exam_name?: string | null
          exam_type?: string | null
          explanation?: Json | null
          id?: string
          image_svg?: string | null
          image_url?: string | null
          options?: Json | null
          shift_details?: string | null
          source_pdf?: string | null
          subject?: string
          test_series_id?: string | null
          text?: Json | null
          topic?: Json | null
          topic_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_test_series_id_fkey"
            columns: ["test_series_id"]
            isOneToOne: false
            referencedRelation: "test_series"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bookmarks: {
        Row: {
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bookmarks_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      question_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          question_id: string
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          question_id: string
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          question_id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_topics: {
        Row: {
          created_at: string
          id: string
          last_difficulty: string | null
          last_reviewed_at: string | null
          next_review_date: string
          notes: string | null
          review_count: number
          stage: number
          status: string
          subject: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_difficulty?: string | null
          last_reviewed_at?: string | null
          next_review_date?: string
          notes?: string | null
          review_count?: number
          stage?: number
          status?: string
          subject?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_difficulty?: string | null
          last_reviewed_at?: string | null
          next_review_date?: string
          notes?: string | null
          review_count?: number
          stage?: number
          status?: string
          subject?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_results: {
        Row: {
          correct_count: number
          created_at: string
          display_name: string | null
          exam_id: string
          id: string
          incorrect_count: number
          shift: string | null
          total_score: number
          unattempted_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          display_name?: string | null
          exam_id: string
          id?: string
          incorrect_count?: number
          shift?: string | null
          total_score?: number
          unattempted_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          display_name?: string | null
          exam_id?: string
          id?: string
          incorrect_count?: number
          shift?: string | null
          total_score?: number
          unattempted_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exam_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          duration_seconds: number
          ended_at: string
          id: string
          started_at: string
          subject: string | null
          topic: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds: number
          ended_at?: string
          id?: string
          started_at: string
          subject?: string | null
          topic?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          ended_at?: string
          id?: string
          started_at?: string
          subject?: string | null
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          order_id: string | null
          plan: string
          provider: string
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          order_id?: string | null
          plan?: string
          provider: string
          starts_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string | null
          plan?: string
          provider?: string
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      test_series: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          question_count: number
          source_pdf: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          question_count?: number
          source_pdf?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          question_count?: number
          source_pdf?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          details: Json
          id: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          details?: Json
          id?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          details?: Json
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          status: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message: string
          status?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          current_streak: number
          freeze_available: number
          last_activity_date: string | null
          longest_streak: number
          total_active_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          freeze_available?: number
          last_activity_date?: string | null
          longest_streak?: number
          total_active_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          freeze_available?: number
          last_activity_date?: string | null
          longest_streak?: number
          total_active_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_exam_names: {
        Args: { p_category: string }
        Returns: {
          exam_name: string
          question_count: number
        }[]
      }
      admin_list_shifts: {
        Args: { p_category: string; p_exam: string }
        Returns: {
          question_count: number
          shift: string
        }[]
      }
      admin_list_subjects: {
        Args: never
        Returns: {
          question_count: number
          subject: string
        }[]
      }
      admin_list_topics: {
        Args: { p_subject: string }
        Returns: {
          question_count: number
          topic: string
        }[]
      }
      are_partners: { Args: { _a: string; _b: string }; Returns: boolean }
      bump_user_streak: { Args: { _user_id: string }; Returns: undefined }
      fcm_anon_key: { Args: never; Returns: string }
      fcm_notify_url: { Args: never; Returns: string }
      group_member_count: { Args: { _gid: string }; Returns: number }
      is_group_member: {
        Args: { _gid: string; _uid: string }
        Returns: boolean
      }
      is_group_owner: { Args: { _gid: string; _uid: string }; Returns: boolean }
      list_exam_series: {
        Args: { p_type: string }
        Returns: {
          exam: string
          question_count: number
        }[]
      }
      list_exam_shifts: {
        Args: { p_exam: string; p_type: string }
        Returns: {
          question_count: number
          shift: string
        }[]
      }
      list_exam_years: {
        Args: { p_exam: string }
        Returns: {
          question_count: number
          year: string
        }[]
      }
      list_subjects: {
        Args: never
        Returns: {
          question_count: number
          subject: string
        }[]
      }
      list_topics: {
        Args: { p_subject: string }
        Returns: {
          question_count: number
          topic: string
        }[]
      }
      purge_old_junk: { Args: never; Returns: undefined }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
