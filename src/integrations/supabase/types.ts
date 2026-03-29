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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      checklist_audit_logs: {
        Row: {
          action: string
          changes: Json | null
          checklist_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          checklist_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          checklist_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_audit_logs_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "compliance_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_photo_requirements: {
        Row: {
          checklist_type: string
          created_at: string | null
          id: string
          item_id: string
          minimum_photos: number | null
          photo_requirement: string
        }
        Insert: {
          checklist_type: string
          created_at?: string | null
          id?: string
          item_id: string
          minimum_photos?: number | null
          photo_requirement: string
        }
        Update: {
          checklist_type?: string
          created_at?: string | null
          id?: string
          item_id?: string
          minimum_photos?: number | null
          photo_requirement?: string
        }
        Relationships: []
      }
      clock_employees: {
        Row: {
          created_at: string
          display_name: string | null
          full_name: string
          id: string
          is_active: boolean
          linked_user_id: string | null
          pin_code: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          linked_user_id?: string | null
          pin_code?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          linked_user_id?: string | null
          pin_code?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_checklists: {
        Row: {
          checklist_date: string
          checklist_type: string
          completed_at: string | null
          completed_by: string | null
          completion_duration_minutes: number | null
          created_at: string
          data: Json | null
          flag_reason: string | null
          flagged: boolean | null
          id: string
          quality_score: string | null
          requires_owner_review: boolean | null
          signature_data: string | null
          started_at: string | null
          truck_id: string
        }
        Insert: {
          checklist_date: string
          checklist_type: string
          completed_at?: string | null
          completed_by?: string | null
          completion_duration_minutes?: number | null
          created_at?: string
          data?: Json | null
          flag_reason?: string | null
          flagged?: boolean | null
          id?: string
          quality_score?: string | null
          requires_owner_review?: boolean | null
          signature_data?: string | null
          started_at?: string | null
          truck_id: string
        }
        Update: {
          checklist_date?: string
          checklist_type?: string
          completed_at?: string | null
          completed_by?: string | null
          completion_duration_minutes?: number | null
          created_at?: string
          data?: Json | null
          flag_reason?: string | null
          flagged?: boolean | null
          id?: string
          quality_score?: string | null
          requires_owner_review?: boolean | null
          signature_data?: string | null
          started_at?: string | null
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checklists_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_checklists_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employee_documents: {
        Row: {
          created_at: string | null
          document_name: string
          document_type: string
          document_url: string
          expiration_date: string | null
          id: string
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_name: string
          document_type: string
          document_url: string
          expiration_date?: string | null
          id?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_name?: string
          document_type?: string
          document_url?: string
          expiration_date?: string | null
          id?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_onboarding: {
        Row: {
          account_number_encrypted: string | null
          account_type: string | null
          additional_withholding: number | null
          allowances: number | null
          bank_name: string | null
          clock_employee_id: string | null
          completed_at: string | null
          created_at: string | null
          direct_deposit_completed: boolean | null
          documents_completed: boolean | null
          emergency_contact_1_name: string | null
          emergency_contact_1_phone: string | null
          emergency_contact_1_relationship: string | null
          emergency_contact_2_name: string | null
          emergency_contact_2_phone: string | null
          emergency_contact_2_relationship: string | null
          emergency_contacts_completed: boolean | null
          exempt_from_withholding: boolean | null
          filing_status: string | null
          id: string
          onboarding_completed: boolean | null
          policies_completed: boolean | null
          routing_number: string | null
          updated_at: string | null
          user_id: string | null
          w4_completed: boolean | null
        }
        Insert: {
          account_number_encrypted?: string | null
          account_type?: string | null
          additional_withholding?: number | null
          allowances?: number | null
          bank_name?: string | null
          clock_employee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          direct_deposit_completed?: boolean | null
          documents_completed?: boolean | null
          emergency_contact_1_name?: string | null
          emergency_contact_1_phone?: string | null
          emergency_contact_1_relationship?: string | null
          emergency_contact_2_name?: string | null
          emergency_contact_2_phone?: string | null
          emergency_contact_2_relationship?: string | null
          emergency_contacts_completed?: boolean | null
          exempt_from_withholding?: boolean | null
          filing_status?: string | null
          id?: string
          onboarding_completed?: boolean | null
          policies_completed?: boolean | null
          routing_number?: string | null
          updated_at?: string | null
          user_id?: string | null
          w4_completed?: boolean | null
        }
        Update: {
          account_number_encrypted?: string | null
          account_type?: string | null
          additional_withholding?: number | null
          allowances?: number | null
          bank_name?: string | null
          clock_employee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          direct_deposit_completed?: boolean | null
          documents_completed?: boolean | null
          emergency_contact_1_name?: string | null
          emergency_contact_1_phone?: string | null
          emergency_contact_1_relationship?: string | null
          emergency_contact_2_name?: string | null
          emergency_contact_2_phone?: string | null
          emergency_contact_2_relationship?: string | null
          emergency_contacts_completed?: boolean | null
          exempt_from_withholding?: boolean | null
          filing_status?: string | null
          id?: string
          onboarding_completed?: boolean | null
          policies_completed?: boolean | null
          routing_number?: string | null
          updated_at?: string | null
          user_id?: string | null
          w4_completed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_onboarding_clock_employee_id_fkey"
            columns: ["clock_employee_id"]
            isOneToOne: false
            referencedRelation: "clock_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_permissions: {
        Row: {
          clock_employee_id: string
          granted: boolean
          granted_by: string | null
          id: string
          permission: string
          updated_at: string | null
        }
        Insert: {
          clock_employee_id: string
          granted?: boolean
          granted_by?: string | null
          id?: string
          permission: string
          updated_at?: string | null
        }
        Update: {
          clock_employee_id?: string
          granted?: boolean
          granted_by?: string | null
          id?: string
          permission?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_permissions_clock_employee_id_fkey"
            columns: ["clock_employee_id"]
            isOneToOne: false
            referencedRelation: "clock_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      inventory_documents: {
        Row: {
          created_at: string | null
          document_name: string
          document_type: string
          document_url: string
          id: string
          parsed_data: Json | null
          truck_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_name: string
          document_type?: string
          document_url: string
          id?: string
          parsed_data?: Json | null
          truck_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_name?: string
          document_type?: string
          document_url?: string
          id?: string
          parsed_data?: Json | null
          truck_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_documents_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category_id: string | null
          cost_per_unit: number | null
          created_at: string | null
          current_quantity: number
          id: string
          is_active: boolean | null
          low_stock_alert_sent: boolean | null
          name: string
          par_level: number
          sku: string | null
          supplier: string | null
          truck_id: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_quantity?: number
          id?: string
          is_active?: boolean | null
          low_stock_alert_sent?: boolean | null
          name: string
          par_level?: number
          sku?: string | null
          supplier?: string | null
          truck_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_quantity?: number
          id?: string
          is_active?: boolean | null
          low_stock_alert_sent?: boolean | null
          name?: string
          par_level?: number
          sku?: string | null
          supplier?: string | null
          truck_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          document_id: string | null
          id: string
          item_id: string
          notes: string | null
          performed_by: string | null
          quantity_after: number
          quantity_change: number
          transaction_type: string
          truck_id: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          item_id: string
          notes?: string | null
          performed_by?: string | null
          quantity_after: number
          quantity_change: number
          transaction_type: string
          truck_id?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          performed_by?: string | null
          quantity_after?: number
          quantity_change?: number
          transaction_type?: string
          truck_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "inventory_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_acknowledgements: {
        Row: {
          acknowledged_at: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          policy_type: string
          signature_data: string
          user_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          policy_type: string
          signature_data: string
          user_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          policy_type?: string
          signature_data?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_acknowledgements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          pin_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          pin_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          pin_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      qsce_visit_items: {
        Row: {
          created_at: string | null
          id: string
          is_compliance_item: boolean | null
          notes: string | null
          photos: Json | null
          points_awarded: number | null
          points_possible: number
          section_id: string
          visit_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_compliance_item?: boolean | null
          notes?: string | null
          photos?: Json | null
          points_awarded?: number | null
          points_possible: number
          section_id: string
          visit_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_compliance_item?: boolean | null
          notes?: string | null
          photos?: Json | null
          points_awarded?: number | null
          points_possible?: number
          section_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qsce_visit_items_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "qsce_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      qsce_visits: {
        Row: {
          action_plan_opportunities: string | null
          action_plan_strengths: string | null
          action_plan_tasks: Json | null
          city_state: string | null
          cleanliness_possible: number | null
          cleanliness_score: number | null
          compliance_issues: Json | null
          created_at: string | null
          end_time: string | null
          evaluator_id: string | null
          evaluator_signature: string | null
          franchisee_email: string | null
          franchisee_name: string | null
          franchisee_signature: string | null
          id: string
          kahala_store_number: string | null
          net_sales: string | null
          operations_possible: number | null
          operations_score: number | null
          percentage: number | null
          posted_health_score: string | null
          service_possible: number | null
          service_score: number | null
          start_time: string | null
          status: string | null
          summary_comments: string | null
          total_possible: number | null
          total_score: number | null
          truck_id: string
          updated_at: string | null
          visit_date: string
        }
        Insert: {
          action_plan_opportunities?: string | null
          action_plan_strengths?: string | null
          action_plan_tasks?: Json | null
          city_state?: string | null
          cleanliness_possible?: number | null
          cleanliness_score?: number | null
          compliance_issues?: Json | null
          created_at?: string | null
          end_time?: string | null
          evaluator_id?: string | null
          evaluator_signature?: string | null
          franchisee_email?: string | null
          franchisee_name?: string | null
          franchisee_signature?: string | null
          id?: string
          kahala_store_number?: string | null
          net_sales?: string | null
          operations_possible?: number | null
          operations_score?: number | null
          percentage?: number | null
          posted_health_score?: string | null
          service_possible?: number | null
          service_score?: number | null
          start_time?: string | null
          status?: string | null
          summary_comments?: string | null
          total_possible?: number | null
          total_score?: number | null
          truck_id: string
          updated_at?: string | null
          visit_date?: string
        }
        Update: {
          action_plan_opportunities?: string | null
          action_plan_strengths?: string | null
          action_plan_tasks?: Json | null
          city_state?: string | null
          cleanliness_possible?: number | null
          cleanliness_score?: number | null
          compliance_issues?: Json | null
          created_at?: string | null
          end_time?: string | null
          evaluator_id?: string | null
          evaluator_signature?: string | null
          franchisee_email?: string | null
          franchisee_name?: string | null
          franchisee_signature?: string | null
          id?: string
          kahala_store_number?: string | null
          net_sales?: string | null
          operations_possible?: number | null
          operations_score?: number | null
          percentage?: number | null
          posted_health_score?: string | null
          service_possible?: number | null
          service_score?: number | null
          start_time?: string | null
          status?: string | null
          summary_comments?: string | null
          total_possible?: number | null
          total_score?: number | null
          truck_id?: string
          updated_at?: string | null
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "qsce_visits_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qsce_visits_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          notification_type: string
          read_at: string | null
          recipient_employee_id: string
          sent_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          notification_type: string
          read_at?: string | null
          recipient_employee_id: string
          sent_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          recipient_employee_id?: string
          sent_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_notifications_recipient_employee_id_fkey"
            columns: ["recipient_employee_id"]
            isOneToOne: false
            referencedRelation: "clock_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      temperature_logs: {
        Row: {
          checklist_id: string | null
          corrective_action: string | null
          device_name: string
          expected_max_f: number | null
          expected_min_f: number | null
          id: string
          is_in_range: boolean | null
          recorded_at: string | null
          recorded_by: string | null
          temperature_f: number
        }
        Insert: {
          checklist_id?: string | null
          corrective_action?: string | null
          device_name: string
          expected_max_f?: number | null
          expected_min_f?: number | null
          id?: string
          is_in_range?: boolean | null
          recorded_at?: string | null
          recorded_by?: string | null
          temperature_f: number
        }
        Update: {
          checklist_id?: string | null
          corrective_action?: string | null
          device_name?: string
          expected_max_f?: number | null
          expected_min_f?: number | null
          id?: string
          is_in_range?: boolean | null
          recorded_at?: string | null
          recorded_by?: string | null
          temperature_f?: number
        }
        Relationships: [
          {
            foreignKeyName: "temperature_logs_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "compliance_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_logs_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          clock_employee_id: string | null
          clock_in: string
          clock_in_location: string | null
          clock_out: string | null
          clock_out_location: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          truck_id: string | null
        }
        Insert: {
          clock_employee_id?: string | null
          clock_in: string
          clock_in_location?: string | null
          clock_out?: string | null
          clock_out_location?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          truck_id?: string | null
        }
        Update: {
          clock_employee_id?: string | null
          clock_in?: string
          clock_in_location?: string | null
          clock_out?: string | null
          clock_out_location?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          truck_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_clock_employee_id_fkey"
            columns: ["clock_employee_id"]
            isOneToOne: false
            referencedRelation: "clock_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_email_recipients: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          email: string
          id: string
          name: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          email: string
          id?: string
          name?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          id?: string
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_email_recipients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trucks: {
        Row: {
          created_at: string
          id: string
          license_plate: string | null
          name: string
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          license_plate?: string | null
          name: string
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          license_plate?: string | null
          name?: string
          status?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      compliance_scores: {
        Row: {
          checklist_date: string | null
          completed_checklists: number | null
          completion_percentage: number | null
          failed_checklists: number | null
          flagged_checklists: number | null
          passed_checklists: number | null
          status_color: string | null
          total_checklists: number | null
          truck_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checklists_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      set_employee_pin: {
        Args: { _pin: string; _target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      user_role:
        | "owner"
        | "franchise_owner"
        | "manager"
        | "shift_lead"
        | "employee"
        | "business_manager"
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
      user_role: [
        "owner",
        "franchise_owner",
        "manager",
        "shift_lead",
        "employee",
        "business_manager",
      ],
    },
  },
} as const
