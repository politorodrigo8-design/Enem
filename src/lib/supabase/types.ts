export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          target_course: string | null;
          target_university: string | null;
          target_score: number | null;
          previous_score: number | null;
          weekly_hours: number | null;
          available_days: string | null;
          perceived_difficulties: Json;
          access_level: "unpaid" | "paid" | "beta" | "admin";
          access_expires_at: string | null;
          beta_tester: boolean;
          onboarding_completed: boolean;
          study_preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          email: string;
          target_course?: string | null;
          target_university?: string | null;
          target_score?: number | null;
          previous_score?: number | null;
          weekly_hours?: number | null;
          available_days?: string | null;
          perceived_difficulties?: Json;
          access_level?: "unpaid" | "paid" | "beta" | "admin";
          access_expires_at?: string | null;
          beta_tester?: boolean;
          onboarding_completed?: boolean;
          study_preferences?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      subjects: {
        Row: { id: string; name: string; area: string; slug: string };
        Insert: { id?: string; name: string; area: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["subjects"]["Insert"]>;
      };
      topics: {
        Row: {
          id: string;
          subject_id: string;
          name: string;
          slug: string;
          historical_recurrence: number;
          priority_weight: number;
          difficulty_level: string;
          strategic_importance: number;
        };
        Insert: {
          id?: string;
          subject_id: string;
          name: string;
          slug: string;
          historical_recurrence?: number;
          priority_weight?: number;
          difficulty_level: string;
          strategic_importance?: number;
        };
        Update: Partial<Database["public"]["Tables"]["topics"]["Insert"]>;
      };
      questions: {
        Row: {
          id: string;
          statement: string;
          subject_id: string;
          topic_id: string;
          difficulty: string;
          language: string | null;
          year: number;
          source: string;
          source_url: string | null;
          exam_name: string;
          exam_color: string | null;
          question_number: number | null;
          is_demo: boolean;
          is_official: boolean;
          is_authorial: boolean;
          is_inspired: boolean;
          exam_edition: string | null;
          exam_day: string | null;
          discipline: string | null;
          subtopic: string | null;
          competence: string | null;
          skill: string | null;
          content_recurrence: string | null;
          charge_pattern: string | null;
          estimated_priority: string;
          priority_score: number;
          confidence_level: string | null;
          priority_reason: string | null;
          official_source: string | null;
          official_exam_url: string | null;
          official_answer_key_url: string | null;
          priority_is_educational_estimate: boolean;
          last_editorial_review_at: string | null;
          editorial_reviewer: string | null;
          reviewed: boolean;
          review_status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          editorial_notes: string | null;
          source_verified: boolean;
          answer_verified: boolean;
          media_verified: boolean;
          media_required: boolean;
          classification_version: string;
          recurrence_category: string;
          explanation: string;
          correct_option: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          statement: string;
          subject_id: string;
          topic_id: string;
          difficulty: string;
          language?: string | null;
          year: number;
          source: string;
          source_url?: string | null;
          exam_name?: string;
          exam_color?: string | null;
          question_number?: number | null;
          is_demo?: boolean;
          is_official?: boolean;
          is_authorial?: boolean;
          is_inspired?: boolean;
          exam_edition?: string | null;
          exam_day?: string | null;
          discipline?: string | null;
          subtopic?: string | null;
          competence?: string | null;
          skill?: string | null;
          content_recurrence?: string | null;
          charge_pattern?: string | null;
          estimated_priority?: string;
          priority_score?: number;
          confidence_level?: string | null;
          priority_reason?: string | null;
          official_source?: string | null;
          official_exam_url?: string | null;
          official_answer_key_url?: string | null;
          priority_is_educational_estimate?: boolean;
          last_editorial_review_at?: string | null;
          editorial_reviewer?: string | null;
          reviewed?: boolean;
          review_status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          editorial_notes?: string | null;
          source_verified?: boolean;
          answer_verified?: boolean;
          media_verified?: boolean;
          media_required?: boolean;
          classification_version?: string;
          recurrence_category?: string;
          explanation: string;
          correct_option: string;
        };
        Update: Partial<Database["public"]["Tables"]["questions"]["Insert"]>;
      };
      question_options: {
        Row: { id: string; question_id: string; option_key: string; option_text: string };
        Insert: { id?: string; question_id: string; option_key: string; option_text: string };
        Update: Partial<Database["public"]["Tables"]["question_options"]["Insert"]>;
      };
      question_media: {
        Row: {
          id: string;
          question_id: string;
          media_type: string;
          url: string;
          alt_text: string | null;
          caption: string | null;
          source_pdf: string | null;
          source_page: number | null;
          width: number | null;
          height: number | null;
          sort_order: number;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          media_type?: string;
          url: string;
          alt_text?: string | null;
          caption?: string | null;
          source_pdf?: string | null;
          source_page?: number | null;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
          verified?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["question_media"]["Insert"]>;
      };
      user_question_answers: {
        Row: {
          id: string;
          user_id: string;
          question_id: string;
          practice_session_id: string | null;
          selected_option: string;
          is_correct: boolean;
          response_time_seconds: number;
          answered_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_id: string;
          practice_session_id?: string | null;
          selected_option: string;
          is_correct: boolean;
          response_time_seconds?: number;
        };
        Update: Partial<Database["public"]["Tables"]["user_question_answers"]["Insert"]>;
      };
      practice_sessions: {
        Row: {
          id: string;
          user_id: string;
          source: "question_bank" | "review" | "high_priority";
          focus_mode: string;
          session_size: string;
          filters: Json;
          question_ids: string[];
          current_index: number;
          answered_count: number;
          correct_count: number;
          wrong_count: number;
          status: "Em andamento" | "Finalizado" | "Abandonado";
          started_at: string;
          finished_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source?: "question_bank" | "review" | "high_priority";
          focus_mode?: string;
          session_size?: string;
          filters?: Json;
          question_ids?: string[];
          current_index?: number;
          answered_count?: number;
          correct_count?: number;
          wrong_count?: number;
          status?: "Em andamento" | "Finalizado" | "Abandonado";
          started_at?: string;
          finished_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["practice_sessions"]["Insert"]>;
      };
      user_question_reviews: {
        Row: {
          id: string;
          user_id: string;
          question_id: string;
          mastered: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: { id?: string; user_id: string; question_id: string; mastered?: boolean };
        Update: Partial<Database["public"]["Tables"]["user_question_reviews"]["Insert"]>;
      };
      simulations: {
        Row: {
          id: string;
          title: string;
          description: string;
          duration_minutes: number;
          difficulty: string;
          status: string;
          created_by: string | null;
          is_generated: boolean;
          criteria: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          duration_minutes: number;
          difficulty: string;
          status?: string;
          created_by?: string | null;
          is_generated?: boolean;
          criteria?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["simulations"]["Insert"]>;
      };
      simulation_questions: {
        Row: { id: string; simulation_id: string; question_id: string; position: number };
        Insert: { id?: string; simulation_id: string; question_id: string; position: number };
        Update: Partial<Database["public"]["Tables"]["simulation_questions"]["Insert"]>;
      };
      user_simulations: {
        Row: {
          id: string;
          user_id: string;
          simulation_id: string;
          started_at: string;
          finished_at: string | null;
          total_questions: number;
          correct_answers: number;
          score_percentage: number;
          status: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          simulation_id: string;
          total_questions?: number;
          correct_answers?: number;
          score_percentage?: number;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_simulations"]["Insert"]> & {
          finished_at?: string | null;
        };
      };
      user_simulation_answers: {
        Row: {
          id: string;
          user_simulation_id: string;
          question_id: string;
          selected_option: string;
          is_correct: boolean;
          response_time_seconds: number;
        };
        Insert: {
          id?: string;
          user_simulation_id: string;
          question_id: string;
          selected_option: string;
          is_correct: boolean;
          response_time_seconds?: number;
        };
        Update: Partial<Database["public"]["Tables"]["user_simulation_answers"]["Insert"]>;
      };
      study_plans: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          status: string;
          created_at: string;
        };
        Insert: { id?: string; user_id: string; week_start: string; status?: string };
        Update: Partial<Database["public"]["Tables"]["study_plans"]["Insert"]>;
      };
      study_plan_items: {
        Row: {
          id: string;
          study_plan_id: string;
          topic_id: string;
          scheduled_date: string;
          duration_minutes: number;
          question_goal: number;
          completed: boolean;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          study_plan_id: string;
          topic_id: string;
          scheduled_date: string;
          duration_minutes: number;
          question_goal: number;
          completed?: boolean;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["study_plan_items"]["Insert"]>;
      };
      user_topic_performance: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string;
          total_answers: number;
          correct_answers: number;
          accuracy_percentage: number;
          priority_score: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id: string;
          total_answers?: number;
          correct_answers?: number;
          accuracy_percentage?: number;
          priority_score?: number;
        };
        Update: Partial<Database["public"]["Tables"]["user_topic_performance"]["Insert"]>;
      };
      credit_accounts: {
        Row: {
          user_id: string;
          balance: number;
          monthly_allowance: number;
          cycle_started_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          balance?: number;
          monthly_allowance?: number;
          cycle_started_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["credit_accounts"]["Insert"]>;
      };
      credit_ledger: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          balance_after: number;
          reason:
            | "initial_allowance"
            | "essay_correction"
            | "essay_refund"
            | "manual_adjustment"
            | "training_reward"
            | "simulation_reward"
            | "study_plan_reward"
            | "purchase"
            | "purchase_refund"
            | "ai_question_explanation"
            | "ai_performance_analysis"
            | "ai_study_plan"
            | "ai_credit_refund"
            | "weekly_essay_topic";
          reference_type: string | null;
          reference_id: string | null;
          related_ledger_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          balance_after: number;
          reason:
            | "initial_allowance"
            | "essay_correction"
            | "essay_refund"
            | "manual_adjustment"
            | "training_reward"
            | "simulation_reward"
            | "study_plan_reward"
            | "purchase"
            | "purchase_refund"
            | "ai_question_explanation"
            | "ai_performance_analysis"
            | "ai_study_plan"
            | "ai_credit_refund"
            | "weekly_essay_topic";
          reference_type?: string | null;
          reference_id?: string | null;
          related_ledger_id?: string | null;
          metadata?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["credit_ledger"]["Insert"]>;
      };
      essay_submissions: {
        Row: {
          id: string;
          user_id: string;
          client_token: string | null;
          idempotency_key: string | null;
          theme: string;
          delivery_type: "online" | "upload";
          essay_text: string | null;
          file_name: string | null;
          file_size: number | null;
          file_type: string | null;
          storage_bucket: string | null;
          storage_path: string | null;
          word_count: number;
          credit_cost: number;
          status:
            | "uploading"
            | "pending"
            | "in_review"
            | "completed"
            | "cancelled"
            | "upload_failed";
          file_count: number;
          student_note: string | null;
          debit_ledger_id: string | null;
          assigned_admin_id: string | null;
          assigned_at: string | null;
          scores: Json | null;
          feedback: Json | null;
          reviewer_notes: string | null;
          refunded_by: string | null;
          refunded_at: string | null;
          refund_ledger_id: string | null;
          cancellation_reason: string | null;
          upload_failed_at: string | null;
          upload_failure_reason: string | null;
          submitted_at: string;
          created_at: string;
          completed_at: string | null;
          completed_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_token?: string | null;
          idempotency_key?: string | null;
          theme: string;
          delivery_type: "online" | "upload";
          essay_text?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          file_type?: string | null;
          storage_bucket?: string | null;
          storage_path?: string | null;
          word_count?: number;
          credit_cost?: number;
          status?:
            | "uploading"
            | "pending"
            | "in_review"
            | "completed"
            | "cancelled"
            | "upload_failed";
          file_count?: number;
          student_note?: string | null;
          debit_ledger_id?: string | null;
          assigned_admin_id?: string | null;
          assigned_at?: string | null;
          scores?: Json | null;
          feedback?: Json | null;
          reviewer_notes?: string | null;
          refunded_by?: string | null;
          refunded_at?: string | null;
          refund_ledger_id?: string | null;
          cancellation_reason?: string | null;
          upload_failed_at?: string | null;
          upload_failure_reason?: string | null;
          submitted_at?: string;
          created_at?: string;
          completed_at?: string | null;
          completed_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["essay_submissions"]["Insert"]>;
      };
      essay_submission_files: {
        Row: {
          id: string;
          submission_id: string;
          user_id: string;
          storage_bucket: string;
          storage_path: string;
          page_order: number;
          mime_type: "application/pdf" | "image/png" | "image/jpeg";
          size_bytes: number;
          original_name: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          user_id: string;
          storage_bucket?: string;
          storage_path: string;
          page_order: number;
          mime_type: "application/pdf" | "image/png" | "image/jpeg";
          size_bytes: number;
          original_name?: string | null;
          uploaded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["essay_submission_files"]["Insert"]>;
      };
      essay_submission_events: {
        Row: {
          id: string;
          submission_id: string;
          actor_id: string | null;
          event_type:
            | "submitted"
            | "status_changed"
            | "correction_saved"
            | "cancelled"
            | "credits_refunded";
          from_status: string | null;
          to_status: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          actor_id?: string | null;
          event_type:
            | "submitted"
            | "status_changed"
            | "correction_saved"
            | "cancelled"
            | "credits_refunded";
          from_status?: string | null;
          to_status?: string | null;
          metadata?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["essay_submission_events"]["Insert"]>;
      };
      essay_correction_results: {
        Row: {
          id: string;
          submission_id: string;
          general_text: string | null;
          result_storage_bucket: string | null;
          result_storage_path: string | null;
          created_by: string | null;
          completed_at: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          general_text?: string | null;
          result_storage_bucket?: string | null;
          result_storage_path?: string | null;
          created_by?: string | null;
          completed_at?: string | null;
          published_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["essay_correction_results"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          product_name: string;
          slug: string;
          regular_price_cents: number;
          sale_price_cents: number | null;
          sale_starts_at: string | null;
          sale_ends_at: string | null;
          access_valid_until: string;
          active: boolean;
          launch_ready: boolean;
          checkout_provider: "mercado_pago" | "stripe" | "manual";
          product_kind: "access" | "credit_package";
          credit_amount: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_name: string;
          slug: string;
          regular_price_cents: number;
          sale_price_cents?: number | null;
          sale_starts_at?: string | null;
          sale_ends_at?: string | null;
          access_valid_until: string;
          active?: boolean;
          launch_ready?: boolean;
          checkout_provider?: "mercado_pago" | "stripe" | "manual";
          product_kind?: "access" | "credit_package";
          credit_amount?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          amount_cents: number;
          currency: "BRL";
          status:
            | "pending"
            | "approved"
            | "rejected"
            | "cancelled"
            | "refunded"
            | "expired"
            | "charged_back";
          provider: "mercado_pago" | "stripe" | "manual";
          provider_order_id: string | null;
          checkout_url: string | null;
          created_at: string;
          updated_at: string;
          paid_at: string | null;
          expires_at: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          amount_cents: number;
          currency?: "BRL";
          status?:
            | "pending"
            | "approved"
            | "rejected"
            | "cancelled"
            | "refunded"
            | "expired"
            | "charged_back";
          provider?: "mercado_pago" | "stripe" | "manual";
          provider_order_id?: string | null;
          checkout_url?: string | null;
          paid_at?: string | null;
          expires_at?: string | null;
          metadata?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      payment_events: {
        Row: {
          id: string;
          order_id: string | null;
          provider: "mercado_pago" | "stripe" | "manual";
          provider_event_id: string;
          event_type: string;
          payload_hash: string;
          processed: boolean;
          processing_error: string | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          provider: "mercado_pago" | "stripe" | "manual";
          provider_event_id: string;
          event_type: string;
          payload_hash: string;
          processed?: boolean;
          processing_error?: string | null;
          processed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["payment_events"]["Insert"]>;
      };
      beta_applications: {
        Row: {
          id: string;
          user_id: string | null;
          full_name: string;
          email: string;
          city: string;
          school_year: string;
          previous_score: number | null;
          target_course: string;
          main_difficulty: string;
          whatsapp: string | null;
          contact_authorized: boolean;
          comments: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          full_name: string;
          email: string;
          city: string;
          school_year: string;
          previous_score?: number | null;
          target_course: string;
          main_difficulty: string;
          whatsapp?: string | null;
          contact_authorized?: boolean;
          comments?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["beta_applications"]["Insert"]>;
      };
      beta_feedback: {
        Row: {
          id: string;
          user_id: string;
          feedback_type: "erro" | "sugestao" | "duvida" | "elogio";
          route: string;
          message: string;
          message_hash: string;
          rating: number;
          easy_to_understand: boolean | null;
          client_created_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          feedback_type: "erro" | "sugestao" | "duvida" | "elogio";
          route: string;
          message: string;
          rating: number;
          easy_to_understand?: boolean | null;
          client_created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["beta_feedback"]["Insert"]>;
      };
      product_events: {
        Row: {
          id: string;
          user_id: string | null;
          event_name: string;
          route: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_name: string;
          route?: string | null;
          metadata?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["product_events"]["Insert"]>;
      };
      radar_methodology_versions: {
        Row: {
          id: string;
          methodology_version: string;
          source: string;
          analyzed_period: string | null;
          exam_count: number;
          question_count: number;
          last_updated_at: string;
          reviewed_by: string | null;
          notes: string | null;
          is_demo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          methodology_version: string;
          source: string;
          analyzed_period?: string | null;
          exam_count?: number;
          question_count?: number;
          last_updated_at?: string;
          reviewed_by?: string | null;
          notes?: string | null;
          is_demo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["radar_methodology_versions"]["Insert"]>;
      };
      rate_limit_buckets: {
        Row: {
          operation: string;
          identifier_hash: string;
          window_start: string;
          expires_at: string;
          count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          operation: string;
          identifier_hash: string;
          window_start?: string;
          expires_at: string;
          count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["rate_limit_buckets"]["Insert"]>;
      };
    };
    Functions: {
      grant_paid_access_for_order: {
        Args: { target_order_id: string };
        Returns: undefined;
      };
      ensure_credit_account: {
        Args: { target_user_id: string };
        Returns: Database["public"]["Tables"]["credit_accounts"]["Row"];
      };
      spend_ai_credits: {
        Args: {
          input_operation: string;
          input_cost: number;
          input_reference_type?: string | null;
          input_reference_id?: string | null;
          input_metadata?: Json;
        };
        Returns: Database["public"]["Tables"]["credit_ledger"]["Row"];
      };
      reserve_ai_credits: {
        Args: {
          input_operation: string;
          input_reference_type?: string | null;
          input_reference_id?: string | null;
          input_metadata?: Json;
        };
        Returns: Database["public"]["Tables"]["credit_ledger"]["Row"];
      };
      confirm_ai_credit_reservation: {
        Args: {
          input_ledger_id: string;
          input_metadata?: Json;
        };
        Returns: Database["public"]["Tables"]["credit_ledger"]["Row"];
      };
      refund_ai_credit_reservation: {
        Args: {
          input_ledger_id: string;
          input_reason?: string | null;
        };
        Returns: Database["public"]["Tables"]["credit_ledger"]["Row"];
      };
      unlock_weekly_essay_topic: {
        Args: {
          input_topic_id: string;
          input_topic_title?: string | null;
        };
        Returns: Database["public"]["Tables"]["credit_ledger"]["Row"];
      };
      consume_rate_limit: {
        Args: {
          input_operation: string;
          input_identifier_hash: string;
          input_limit: number;
          input_window_seconds: number;
        };
        Returns: Array<{
          allowed: boolean;
          retry_after_seconds: number;
          remaining: number;
        }>;
      };
      delete_expired_rate_limits: {
        Args: Record<string, never>;
        Returns: number;
      };
      is_admin: {
        Args: { user_id?: string };
        Returns: boolean;
      };
      submit_essay_for_correction: {
        Args: {
          input_client_token: string;
          input_theme: string;
          input_delivery_type: string;
          input_essay_text?: string | null;
          input_file_name?: string | null;
          input_file_size?: number | null;
          input_file_type?: string | null;
          input_storage_bucket?: string | null;
          input_storage_path?: string | null;
          input_student_note?: string | null;
        };
        Returns: string;
      };
      initiate_essay_submission: {
        Args: {
          input_idempotency_key: string;
          input_theme?: string | null;
          input_student_note?: string | null;
          input_expected_file_count?: number | null;
        };
        Returns: Array<{
          submission_id: string;
          submission_status: string;
          already_confirmed: boolean;
        }>;
      };
      confirm_essay_submission: {
        Args: {
          input_submission_id: string;
          input_idempotency_key: string;
          input_expected_file_count: number;
        };
        Returns: string;
      };
      mark_essay_upload_failed: {
        Args: {
          input_submission_id: string;
          input_idempotency_key: string;
          input_reason?: string | null;
        };
        Returns: undefined;
      };
      admin_set_essay_in_review: {
        Args: { input_submission_id: string };
        Returns: undefined;
      };
      admin_claim_essay_submission: {
        Args: { input_submission_id: string };
        Returns: undefined;
      };
      admin_release_essay_submission: {
        Args: { input_submission_id: string };
        Returns: undefined;
      };
      admin_transfer_essay_submission: {
        Args: {
          input_submission_id: string;
          input_target_admin_id: string;
        };
        Returns: undefined;
      };
      admin_complete_essay_submission: {
        Args: { input_submission_id: string };
        Returns: undefined;
      };
      admin_cancel_essay_submission: {
        Args: { input_submission_id: string; input_reason?: string | null };
        Returns: undefined;
      };
      admin_mark_abandoned_essay_uploads: {
        Args: { input_older_than?: string };
        Returns: Array<{ submission_id: string; storage_path: string | null }>;
      };
      revoke_paid_access_for_order: {
        Args: { target_order_id: string; target_status?: string };
        Returns: undefined;
      };
      has_platform_access: {
        Args: { user_id?: string };
        Returns: boolean;
      };
      has_full_access: {
        Args: { user_id?: string };
        Returns: boolean;
      };
    };
  };
};
