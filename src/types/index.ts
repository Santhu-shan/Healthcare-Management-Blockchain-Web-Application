export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  room_number: string;
  admission_date: string;
  diagnosis: string | null;
  assigned_doctor_id: string | null;
  user_id: string | null;
  created_at: string;
}

export interface Vital {
  id: string;
  patient_id: string;
  heart_rate: number;
  temperature: number;
  spo2: number;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  respiratory_rate: number | null;
  status: 'NORMAL' | 'ALERT';
  recorded_at: string;
}

export interface PatientWithVitals extends Patient {
  latestVitals?: Vital;
  assignedDoctor?: Doctor;
}

export interface Doctor {
  id: string;
  user_id: string | null;
  name: string;
  specialization: string;
  license_number: string;
  department: string;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientDoctorAssignment {
  id: string;
  patient_id: string;
  doctor_id: string;
  assigned_at: string;
  is_primary: boolean;
}

export interface BlockchainRecord {
  id: string;
  block_number: number;
  previous_hash: string;
  current_hash: string;
  patient_id: string;
  vital_id: string;
  data_summary: {
    patient_name: string;
    heart_rate: number;
    temperature: number;
    spo2: number;
    blood_pressure?: string;
    respiratory_rate?: number;
    status: string;
    timestamp: string;
    nonce?: number;
    merkle_root?: string;
  };
  consensus_status: 'pending' | 'validated' | 'rejected';
  validated_by: string[] | null;
  validation_time_ms: number | null;
  created_at: string;
}

export interface BlockchainAuditTrail {
  id: string;
  block_id: string;
  action: string;
  performed_by: string | null;
  ip_address: string | null;
  user_agent: string | null;
  integrity_verified: boolean;
  verification_hash: string | null;
  created_at: string;
}

export interface AlertLog {
  id: string;
  patient_id: string;
  vital_id: string;
  alert_type: string;
  severity: 'warning' | 'critical';
  message: string;
  acknowledged: boolean;
  acknowledged_by: string | null;
  created_at: string;
}

export interface AccessLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'doctor' | 'admin' | 'pending' | 'patient';
}

export interface Consent {
  id: string;
  patient_id: string;
  doctor_id: string;
  access_type: string;
  granted_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  blockchain_tx_hash: string | null;
  status: string;
  created_at: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  blockchain_hash: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  wallet_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  appointment_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  notes: string | null;
  tx_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  description: string;
  amount_usd: number;
  eth_amount: string | null;
  tx_hash: string | null;
  from_address: string | null;
  to_address: string | null;
  status: 'pending' | 'paid' | 'cancelled';
  paid_at: string | null;
  created_at: string;
}

// Vital thresholds for intelligent health check
export const VITAL_THRESHOLDS = {
  heart_rate: { min: 60, max: 100, unit: 'bpm', critical_min: 50, critical_max: 120 },
  temperature: { min: 36.1, max: 37.2, unit: '°C', critical_min: 35.0, critical_max: 39.0 },
  spo2: { min: 95, max: 100, unit: '%', critical_min: 90, critical_max: 100 },
  blood_pressure_systolic: { min: 90, max: 120, unit: 'mmHg', critical_min: 80, critical_max: 180 },
  blood_pressure_diastolic: { min: 60, max: 80, unit: 'mmHg', critical_min: 50, critical_max: 120 },
  respiratory_rate: { min: 12, max: 20, unit: 'breaths/min', critical_min: 8, critical_max: 30 },
} as const;

// Hybrid consensus configuration
export const CONSENSUS_CONFIG = {
  trusted_nodes: ['Node-A', 'Node-B', 'Node-C'],
  min_validations: 2,
  target_validation_time_ms: 50,
  network_name: 'HealthChain Permissioned Network',
  consensus_algorithm: 'Practical Byzantine Fault Tolerance (PBFT)',
} as const;

// Blockchain security features
export const BLOCKCHAIN_SECURITY = {
  hash_algorithm: 'SHA-256',
  encryption: 'AES-256-GCM',
  key_derivation: 'PBKDF2',
  digital_signature: 'ECDSA (secp256k1)',
  features: [
    'Immutable Record Storage',
    'Cryptographic Hash Linking',
    'Distributed Consensus Validation',
    'Tamper-Evident Audit Trail',
    'Role-Based Access Control',
    'End-to-End Encryption',
  ],
} as const;

// Block structure explanation for academic purposes
export const BLOCK_STRUCTURE = {
  header: {
    block_number: 'Sequential identifier for ordering blocks',
    previous_hash: 'SHA-256 hash of the previous block (chain linkage)',
    current_hash: 'SHA-256 hash of this block\'s contents',
    timestamp: 'UTC timestamp when block was created',
    nonce: 'Number used once for validation',
    merkle_root: 'Root hash of all transactions in block',
  },
  body: {
    patient_id: 'Unique identifier of the patient',
    vital_id: 'Reference to the vitals record',
    data_summary: 'Encrypted patient vital signs data',
    consensus_status: 'Validation status (pending/validated/rejected)',
    validated_by: 'Array of node IDs that validated the block',
    validation_time_ms: 'Time taken for consensus (milliseconds)',
  },
} as const;
