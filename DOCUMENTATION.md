# IPMS – Integrated Patient Monitoring System

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Supabase (Lovable Cloud) + Ethers.js v6  
**Live:** https://ipmbs.lovable.app

## Hybrid Consensus Model

Two-layer hybrid consensus optimized for hospital environments:

```
Layer A — Proof-of-Authority (PoA)
  Only DOCTOR / DEVICE / ADMIN roles can submitReading()
  → Creates a Pending reading on-chain

Layer B — PBFT-style Finality
  VALIDATOR addresses call approveReading(readingId)
  → Auto-finalized when approvals ≥ threshold (e.g. 2/3)
  → Emits ReadingFinalized event

Anchoring — Internal Ledger ↔ Ethereum
  anchorInternalBlock(merkleRoot) stores DB ledger hash
  on-chain for provable integrity
```

## Smart Contract: HybridPatientMonitor.sol

**File:** `public/contracts/HybridPatientMonitor.sol`  
**Compiler:** Solidity ≥ 0.8.19, EVM Paris  
**Network:** Ethereum Sepolia Testnet

**Roles:** ADMIN(1), DOCTOR(2), DEVICE(3), VALIDATOR(4) — managed via `grantRole(address, uint8)`

| Function | Access | Purpose |
|---|---|---|
| `submitReading(bytes32, bytes32, string)` | DOCTOR/DEVICE/ADMIN | Submit vitals (Layer A) |
| `approveReading(uint256)` | VALIDATOR | PBFT approval (Layer B) |
| `anchorInternalBlock(bytes32)` | OWNER | Anchor DB ledger hash |
| `getReading(uint256)` | Anyone (view) | Read on-chain reading |
| `isBlockAnchored(bytes32)` | Anyone (view) | Verify DB anchor exists |
| `getPatientReadings(bytes32, uint256, uint256)` | Anyone (view) | Paginated readings |

**Events:** ReadingSubmitted, ReadingApproved, ReadingFinalized, ReadingRejected, BlockAnchored, ConsentUpdated

**Remix Deployment:**
1. Open https://remix.ethereum.org
2. Create `HybridPatientMonitor.sol`, paste source from `public/contracts/`
3. Compiler: 0.8.19+, EVM: Paris
4. Deploy → Injected Provider (MetaMask Sepolia)
5. Constructor: `approvalThreshold_ = 2`
6. Copy address → app Settings → Contract Address

**Remix Testing:**
```
grantRole(0xVALIDATOR1, 4)   // VALIDATOR
grantRole(0xDOCTOR1, 2)      // DOCTOR
submitReading(patientIdHash, vitalsHash, '{"hr":72}')  // → readingId=1
approveReading(1)  // validator 1
approveReading(1)  // validator 2 → ReadingFinalized
getReading(1)      // status=1 (Finalized)
```

## Privacy & Hashing

- **keccak256** used consistently (matches Solidity)
- Patient IDs → `keccak256(utf8Bytes(uuid))` before on-chain storage
- Vitals → `keccak256(sorted-key JSON)`
- QR codes encode only hashed identifiers + readingId, never raw PHI

## Internal DB Ledger (blockchain_records)

Append-only audit ledger with DB triggers:
- `prevent_blockchain_update/delete` → RAISE EXCEPTION (immutable)
- `auto_chain_block` → auto-sets block_number, previous_hash, current_hash (SHA-256)
- Anchored to Ethereum via `anchorInternalBlock(merkleRoot)`

## Verification Flow (/verify)

```
QR → /verify?ph=<hash>&rid=<readingId>
  ├─ Has readingId + contract → getReading() on-chain
  │   Finalized? ✓ Verified | Pending? ⚠ Not Finalized | Missing? ✗ Not Found
  └─ Fallback → query blockchain_records by hash
```

## Database (14 tables)

| Table | Purpose |
|---|---|
| patients | Demographics (Admin/Doctor-assigned/Patient-own) |
| vitals | Vital signs |
| doctors | Doctor profiles |
| patient_doctor_assignments | Doctor-patient links |
| prescriptions | Medications |
| consents | Data access consents |
| blockchain_records | Append-only internal chain |
| blockchain_transactions | Ethereum tx log |
| blockchain_audit_trail | Audit entries |
| alert_logs | Critical health alerts |
| access_logs | Access audit trail |
| notifications | User notifications (realtime) |
| profiles | User metadata |
| user_roles | RBAC roles |

**DB Functions:** has_role, is_assigned_to_patient, is_authorized, handle_new_user, auto_chain_blockchain_record, prevent_blockchain_record_mutation

**Roles:** admin, doctor, patient, pending

## Pages (14 routes)

| Route | Access | Purpose |
|---|---|---|
| /auth | Public | Login/signup |
| /verify | Public | On-chain verification |
| /dashboard | Doctor/Admin | Overview |
| /patients | Doctor/Admin | Patient list |
| /patients/:id | Doctor/Admin | Patient detail + QR |
| /doctors | Doctor/Admin | Directory |
| /records | Doctor/Admin | Blockchain explorer |
| /blockchain | Doctor/Admin | ETH dashboard |
| /blockchain-analytics | Doctor/Admin | Integrity checks |
| /smart-contracts | Doctor/Admin | Contract source/ABI |
| /prescriptions | Doctor/Admin | Prescriptions |
| /audit-logs | Admin | Security trail |
| /patient-portal | Patient | Self-service + consent |
| /settings | Authenticated | Config |

## Hooks

useEthereum (wallet + submitReading + approveReading + anchorBlock + checkAnchored), useAuth (RBAC), useNotifications (realtime + push), useTheme

## Edge Functions

blockchain (Infura proxy), generate-report, send-integrity-alert, send-sms

## Secrets

| Secret | Status |
|---|---|
| INFURA_API_KEY | ✅ Set |
| Contract Address | localStorage (Settings page) |
| TWILIO_* | ❌ Optional |
