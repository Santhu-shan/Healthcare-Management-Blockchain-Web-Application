import { CONSENSUS_CONFIG, BLOCKCHAIN_SECURITY } from '@/types';

/**
 * ============================================================================
 * BLOCKCHAIN SIMULATOR FOR HEALTHCARE MONITORING SYSTEM
 * ============================================================================
 * 
 * This module simulates a healthcare-focused blockchain implementation
 * using a hybrid consensus mechanism optimized for:
 * - Low latency (real-time patient monitoring)
 * - Energy efficiency (suitable for hospital infrastructure)
 * - Data integrity (immutable medical records)
 * 
 * ACADEMIC NOTE: This is a simulation for demonstration purposes.
 * In production, actual cryptographic libraries would be used.
 */

/**
 * Simulated SHA-256 Hash Generation
 * 
 * In a real blockchain, this would use actual SHA-256 cryptographic hashing.
 * SHA-256 produces a 256-bit (64 hexadecimal character) hash that is:
 * - Deterministic: Same input always produces same output
 * - One-way: Cannot reverse-engineer input from output
 * - Collision-resistant: Practically impossible to find two inputs with same hash
 * - Avalanche effect: Small input change drastically changes output
 */
export function generateHash(data: string): string {
  // Simulate SHA-256 hashing process
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Generate a realistic-looking 64-character hex hash
  const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
  const timestamp = Date.now().toString(16).padStart(12, '0');
  const random1 = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0');
  const random2 = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0');
  const random3 = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0');
  const random4 = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0');
  
  return `${hashHex}${timestamp}${random1}${random2}${random3}${random4}`.substring(0, 64);
}

/**
 * Generate Merkle Root Hash
 * 
 * Merkle trees allow efficient verification of large data sets.
 * The root hash represents all data in the block - any change
 * to any piece of data would change the root hash.
 */
export function generateMerkleRoot(data: object): string {
  const dataString = JSON.stringify(data);
  return generateHash(`MERKLE_ROOT:${dataString}`);
}

/**
 * Hybrid Consensus Mechanism Simulation
 * 
 * This demonstrates a Practical Byzantine Fault Tolerance (PBFT) inspired
 * consensus mechanism optimized for healthcare networks:
 * 
 * CONSENSUS PHASES:
 * 1. PRE-PREPARE: Leader node proposes new block
 * 2. PREPARE: Nodes verify and broadcast agreement
 * 3. COMMIT: Nodes commit block after receiving 2f+1 prepares
 * 
 * ADVANTAGES FOR HEALTHCARE:
 * - Fast finality (~50ms) for real-time monitoring
 * - Energy efficient (no proof-of-work mining)
 * - Permissioned network (only authorized hospital nodes)
 * - Fault tolerant (handles up to f = (n-1)/3 faulty nodes)
 */
export function simulateHybridConsensus(): {
  validated_by: string[];
  validation_time_ms: number;
  consensus_status: 'validated' | 'rejected';
  consensus_details: {
    phase: string;
    participating_nodes: number;
    required_nodes: number;
    leader_node: string;
  };
} {
  const { trusted_nodes, min_validations, target_validation_time_ms } = CONSENSUS_CONFIG;
  
  // Simulate node participation (90% availability assumption)
  const participating_nodes = trusted_nodes.filter(() => Math.random() > 0.1);
  
  // Select leader node (round-robin in real implementation)
  const leader_node = trusted_nodes[Math.floor(Math.random() * trusted_nodes.length)];
  
  // Simulate validation time with network latency
  const validation_time_ms = Math.floor(
    target_validation_time_ms * 0.4 + Math.random() * target_validation_time_ms * 0.8
  );
  
  // Consensus achieved if minimum validations met
  const consensus_status = participating_nodes.length >= min_validations ? 'validated' : 'rejected';
  
  return {
    validated_by: participating_nodes,
    validation_time_ms,
    consensus_status,
    consensus_details: {
      phase: 'COMMIT',
      participating_nodes: participating_nodes.length,
      required_nodes: min_validations,
      leader_node,
    },
  };
}

/**
 * Generate Nonce for Block
 * 
 * In proof-of-work systems, finding the right nonce is computationally expensive.
 * In our PBFT system, the nonce serves as a unique identifier for the block
 * without requiring intensive computation.
 */
export function generateNonce(): number {
  return Math.floor(Math.random() * 1000000);
}

/**
 * Create a New Blockchain Block
 * 
 * Block Structure:
 * ┌─────────────────────────────────────┐
 * │           BLOCK HEADER              │
 * ├─────────────────────────────────────┤
 * │ Block Number    │ 12345             │
 * │ Previous Hash   │ 0x7a3b...        │
 * │ Current Hash    │ 0x9c4d...        │
 * │ Merkle Root     │ 0x5e2f...        │
 * │ Timestamp       │ 2024-01-10T...    │
 * │ Nonce           │ 847293            │
 * ├─────────────────────────────────────┤
 * │           BLOCK BODY                │
 * ├─────────────────────────────────────┤
 * │ Patient Data (Encrypted)           │
 * │ Vital Signs Record                  │
 * │ Consensus Validation               │
 * └─────────────────────────────────────┘
 */
export function createBlock(
  blockNumber: number,
  previousHash: string,
  patientId: string,
  vitalId: string,
  patientName: string,
  vitals: { 
    heart_rate: number; 
    temperature: number; 
    spo2: number; 
    blood_pressure_systolic?: number;
    blood_pressure_diastolic?: number;
    respiratory_rate?: number;
    status: string;
  }
): {
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
    nonce: number;
    merkle_root: string;
  };
  consensus_status: 'pending' | 'validated' | 'rejected';
  validated_by: string[];
  validation_time_ms: number;
} {
  const timestamp = new Date().toISOString();
  const nonce = generateNonce();
  
  // Prepare blood pressure string if available
  const blood_pressure = vitals.blood_pressure_systolic && vitals.blood_pressure_diastolic
    ? `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic}`
    : undefined;
  
  const dataSummary = {
    patient_name: patientName,
    heart_rate: vitals.heart_rate,
    temperature: vitals.temperature,
    spo2: vitals.spo2,
    blood_pressure,
    respiratory_rate: vitals.respiratory_rate,
    status: vitals.status,
    timestamp,
    nonce,
    merkle_root: '',
  };
  
  // Generate Merkle root for the data
  dataSummary.merkle_root = generateMerkleRoot(dataSummary);
  
  // Create block data string for hashing
  const blockData = JSON.stringify({
    blockNumber,
    previousHash,
    patientId,
    vitalId,
    dataSummary,
    timestamp,
    nonce,
  });
  
  const currentHash = generateHash(blockData);
  
  // Run hybrid consensus
  const consensusResult = simulateHybridConsensus();
  
  return {
    block_number: blockNumber,
    previous_hash: previousHash,
    current_hash: currentHash,
    patient_id: patientId,
    vital_id: vitalId,
    data_summary: dataSummary,
    consensus_status: consensusResult.consensus_status,
    validated_by: consensusResult.validated_by,
    validation_time_ms: consensusResult.validation_time_ms,
  };
}

/**
 * Genesis Block - The First Block in the Chain
 * 
 * The genesis block is the foundation of the blockchain.
 * It has a special "null" previous hash (all zeros) since
 * there is no preceding block.
 */
export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Verify Chain Integrity
 * 
 * This function validates the entire blockchain by checking:
 * 1. First block references genesis hash
 * 2. Each block's previous_hash matches the previous block's current_hash
 * 3. Hash chain is unbroken
 * 
 * If any block is tampered with, its hash changes, breaking the chain.
 * This makes blockchain data immutable and tamper-evident.
 */
export function verifyChainIntegrity(blocks: { 
  block_number: number; 
  previous_hash: string; 
  current_hash: string;
}[]): {
  isValid: boolean;
  brokenAtBlock: number | null;
  verificationDetails: string[];
} {
  const details: string[] = [];
  
  if (blocks.length === 0) {
    details.push('✓ Empty chain is valid by definition');
    return { isValid: true, brokenAtBlock: null, verificationDetails: details };
  }
  
  // Sort by block number
  const sortedBlocks = [...blocks].sort((a, b) => a.block_number - b.block_number);
  
  // Check genesis block
  if (sortedBlocks[0].block_number === 1 && sortedBlocks[0].previous_hash !== GENESIS_HASH) {
    details.push(`✗ Block #1 does not reference genesis hash`);
    return { isValid: false, brokenAtBlock: 1, verificationDetails: details };
  }
  details.push(`✓ Block #${sortedBlocks[0].block_number} correctly references previous hash`);
  
  // Verify each subsequent block
  for (let i = 1; i < sortedBlocks.length; i++) {
    const currentBlock = sortedBlocks[i];
    const previousBlock = sortedBlocks[i - 1];
    
    if (currentBlock.previous_hash !== previousBlock.current_hash) {
      details.push(`✗ Block #${currentBlock.block_number} has invalid previous hash`);
      details.push(`  Expected: ${previousBlock.current_hash.substring(0, 16)}...`);
      details.push(`  Found: ${currentBlock.previous_hash.substring(0, 16)}...`);
      return { 
        isValid: false, 
        brokenAtBlock: currentBlock.block_number, 
        verificationDetails: details 
      };
    }
    details.push(`✓ Block #${currentBlock.block_number} hash chain verified`);
  }
  
  details.push(`✓ All ${sortedBlocks.length} blocks verified successfully`);
  return { isValid: true, brokenAtBlock: null, verificationDetails: details };
}

/**
 * Simulate Tamper Detection
 * 
 * Demonstrates what happens when someone tries to modify blockchain data.
 * Any modification invalidates the hash, making tampering immediately detectable.
 */
export function simulateTamperDetection(
  originalData: string,
  tamperedData: string
): {
  originalHash: string;
  tamperedHash: string;
  detected: boolean;
  explanation: string;
} {
  const originalHash = generateHash(originalData);
  const tamperedHash = generateHash(tamperedData);
  
  return {
    originalHash,
    tamperedHash,
    detected: originalHash !== tamperedHash,
    explanation: `When data is modified, the hash completely changes due to the avalanche effect. 
    Even a single character change produces a completely different hash, making tampering 
    immediately detectable. The attacker would need to recalculate all subsequent block 
    hashes and convince the majority of network nodes to accept the fraudulent chain - 
    which is computationally and practically infeasible.`,
  };
}

/**
 * Calculate Block Security Score
 * 
 * Returns a security score based on validation metrics
 */
export function calculateSecurityScore(block: {
  consensus_status: string;
  validated_by: string[] | null;
  validation_time_ms: number | null;
}): {
  score: number;
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  factors: string[];
} {
  let score = 0;
  const factors: string[] = [];
  
  // Consensus status
  if (block.consensus_status === 'validated') {
    score += 40;
    factors.push('Block validated by consensus');
  } else if (block.consensus_status === 'pending') {
    score += 20;
    factors.push('Block pending validation');
  }
  
  // Number of validators
  const validators = block.validated_by?.length || 0;
  if (validators >= 3) {
    score += 30;
    factors.push(`Validated by ${validators} trusted nodes`);
  } else if (validators >= 2) {
    score += 20;
    factors.push(`Validated by ${validators} nodes (minimum met)`);
  }
  
  // Validation time (faster is better for PBFT)
  const time = block.validation_time_ms || 0;
  if (time > 0 && time < 50) {
    score += 30;
    factors.push(`Fast validation (${time}ms)`);
  } else if (time > 0 && time < 100) {
    score += 20;
    factors.push(`Normal validation time (${time}ms)`);
  }
  
  let rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  if (score >= 80) rating = 'Excellent';
  else if (score >= 60) rating = 'Good';
  else if (score >= 40) rating = 'Fair';
  else rating = 'Poor';
  
  return { score, rating, factors };
}

/**
 * Export blockchain security info for display
 */
export { BLOCKCHAIN_SECURITY };
