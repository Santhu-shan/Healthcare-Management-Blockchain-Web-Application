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
      access_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          resource_id: string | null
          resource_type: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          resource_id?: string | null
          resource_type: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          resource_id?: string | null
          resource_type?: string
          user_id?: string
        }
        Relationships: []
      }
      alert_logs: {
        Row: {
          acknowledged: boolean
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          id: string
          message: string
          patient_id: string
          severity: string
          vital_id: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          id?: string
          message: string
          patient_id: string
          severity: string
          vital_id: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          patient_id?: string
          severity?: string
          vital_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_logs_vital_id_fkey"
            columns: ["vital_id"]
            isOneToOne: false
            referencedRelation: "vitals"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          created_at: string
          doctor_id: string | null
          id: string
          notes: string | null
          patient_id: string
          reason: string
          status: string
          tx_hash: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          created_at?: string
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          reason: string
          status?: string
          tx_hash?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          created_at?: string
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          reason?: string
          status?: string
          tx_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount_usd: number
          appointment_id: string | null
          created_at: string
          description: string
          eth_amount: string | null
          from_address: string | null
          id: string
          paid_at: string | null
          patient_id: string
          status: string
          to_address: string | null
          tx_hash: string | null
        }
        Insert: {
          amount_usd: number
          appointment_id?: string | null
          created_at?: string
          description: string
          eth_amount?: string | null
          from_address?: string | null
          id?: string
          paid_at?: string | null
          patient_id: string
          status?: string
          to_address?: string | null
          tx_hash?: string | null
        }
        Update: {
          amount_usd?: number
          appointment_id?: string | null
          created_at?: string
          description?: string
          eth_amount?: string | null
          from_address?: string | null
          id?: string
          paid_at?: string | null
          patient_id?: string
          status?: string
          to_address?: string | null
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      blockchain_audit_trail: {
        Row: {
          action: string
          block_id: string | null
          created_at: string
          id: string
          integrity_verified: boolean
          ip_address: string | null
          performed_by: string | null
          user_agent: string | null
          verification_hash: string | null
        }
        Insert: {
          action: string
          block_id?: string | null
          created_at?: string
          id?: string
          integrity_verified?: boolean
          ip_address?: string | null
          performed_by?: string | null
          user_agent?: string | null
          verification_hash?: string | null
        }
        Update: {
          action?: string
          block_id?: string | null
          created_at?: string
          id?: string
          integrity_verified?: boolean
          ip_address?: string | null
          performed_by?: string | null
          user_agent?: string | null
          verification_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blockchain_audit_trail_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blockchain_records"
            referencedColumns: ["id"]
          },
        ]
      }
      blockchain_records: {
        Row: {
          block_number: number
          consensus_status: string
          created_at: string
          current_hash: string
          data_summary: Json
          id: string
          patient_id: string
          previous_hash: string
          validated_by: string[] | null
          validation_time_ms: number | null
          vital_id: string
        }
        Insert: {
          block_number: number
          consensus_status?: string
          created_at?: string
          current_hash: string
          data_summary: Json
          id?: string
          patient_id: string
          previous_hash: string
          validated_by?: string[] | null
          validation_time_ms?: number | null
          vital_id: string
        }
        Update: {
          block_number?: number
          consensus_status?: string
          created_at?: string
          current_hash?: string
          data_summary?: Json
          id?: string
          patient_id?: string
          previous_hash?: string
          validated_by?: string[] | null
          validation_time_ms?: number | null
          vital_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blockchain_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blockchain_records_vital_id_fkey"
            columns: ["vital_id"]
            isOneToOne: false
            referencedRelation: "vitals"
            referencedColumns: ["id"]
          },
        ]
      }
      blockchain_transactions: {
        Row: {
          block_number: number | null
          created_at: string
          data_hash: string
          from_address: string
          gas_used: string | null
          id: string
          patient_id: string
          status: string
          tx_hash: string
          verified: boolean | null
          verified_at: string | null
          vital_id: string | null
          vitals_summary: Json
        }
        Insert: {
          block_number?: number | null
          created_at?: string
          data_hash: string
          from_address: string
          gas_used?: string | null
          id?: string
          patient_id: string
          status?: string
          tx_hash: string
          verified?: boolean | null
          verified_at?: string | null
          vital_id?: string | null
          vitals_summary: Json
        }
        Update: {
          block_number?: number | null
          created_at?: string
          data_hash?: string
          from_address?: string
          gas_used?: string | null
          id?: string
          patient_id?: string
          status?: string
          tx_hash?: string
          verified?: boolean | null
          verified_at?: string | null
          vital_id?: string | null
          vitals_summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "blockchain_transactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blockchain_transactions_vital_id_fkey"
            columns: ["vital_id"]
            isOneToOne: false
            referencedRelation: "vitals"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          access_type: string
          blockchain_tx_hash: string | null
          created_at: string
          doctor_id: string
          expires_at: string | null
          granted_at: string
          id: string
          patient_id: string
          revoked_at: string | null
          status: string
        }
        Insert: {
          access_type?: string
          blockchain_tx_hash?: string | null
          created_at?: string
          doctor_id: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          patient_id: string
          revoked_at?: string | null
          status?: string
        }
        Update: {
          access_type?: string
          blockchain_tx_hash?: string | null
          created_at?: string
          doctor_id?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          patient_id?: string
          revoked_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          department: string
          id: string
          is_active: boolean
          license_number: string
          name: string
          specialization: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          department: string
          id?: string
          is_active?: boolean
          license_number: string
          name: string
          specialization: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          department?: string
          id?: string
          is_active?: boolean
          license_number?: string
          name?: string
          specialization?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_alert_id: string | null
          related_patient_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_alert_id?: string | null
          related_patient_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_alert_id?: string | null
          related_patient_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_patient_id_fkey"
            columns: ["related_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_doctor_assignments: {
        Row: {
          assigned_at: string
          doctor_id: string
          id: string
          is_primary: boolean
          patient_id: string
        }
        Insert: {
          assigned_at?: string
          doctor_id: string
          id?: string
          is_primary?: boolean
          patient_id: string
        }
        Update: {
          assigned_at?: string
          doctor_id?: string
          id?: string
          is_primary?: boolean
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_doctor_assignments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_doctor_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          admission_date: string
          age: number
          assigned_doctor_id: string | null
          created_at: string
          diagnosis: string | null
          gender: string
          id: string
          name: string
          room_number: string
          user_id: string | null
        }
        Insert: {
          admission_date?: string
          age: number
          assigned_doctor_id?: string | null
          created_at?: string
          diagnosis?: string | null
          gender: string
          id?: string
          name: string
          room_number: string
          user_id?: string | null
        }
        Update: {
          admission_date?: string
          age?: number
          assigned_doctor_id?: string | null
          created_at?: string
          diagnosis?: string | null
          gender?: string
          id?: string
          name?: string
          room_number?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_assigned_doctor_id_fkey"
            columns: ["assigned_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          blockchain_hash: string | null
          created_at: string
          doctor_id: string
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          medicine_name: string
          notes: string | null
          patient_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          blockchain_hash?: string | null
          created_at?: string
          doctor_id: string
          dosage: string
          end_date?: string | null
          frequency: string
          id?: string
          medicine_name: string
          notes?: string | null
          patient_id: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          blockchain_hash?: string | null
          created_at?: string
          doctor_id?: string
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          medicine_name?: string
          notes?: string | null
          patient_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
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
          updated_at: string
          wallet_address: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
          wallet_address?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vitals: {
        Row: {
          blood_pressure_diastolic: number | null
          blood_pressure_systolic: number | null
          heart_rate: number
          id: string
          patient_id: string
          recorded_at: string
          respiratory_rate: number | null
          spo2: number
          status: string
          temperature: number
        }
        Insert: {
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          heart_rate: number
          id?: string
          patient_id: string
          recorded_at?: string
          respiratory_rate?: number | null
          spo2: number
          status?: string
          temperature: number
        }
        Update: {
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          heart_rate?: number
          id?: string
          patient_id?: string
          recorded_at?: string
          respiratory_rate?: number | null
          spo2?: number
          status?: string
          temperature?: number
        }
        Relationships: [
          {
            foreignKeyName: "vitals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_to_patient: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      is_authorized: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "doctor" | "admin" | "pending" | "patient"
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
      app_role: ["doctor", "admin", "pending", "patient"],
    },
  },
} as const
