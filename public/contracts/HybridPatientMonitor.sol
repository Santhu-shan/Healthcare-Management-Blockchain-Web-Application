// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title HybridPatientMonitor
 * @notice Hybrid PoA + PBFT consensus for healthcare vital-sign monitoring
 * @dev Deploy on Sepolia via Remix (compiler ≥ 0.8.19, EVM Paris)
 *
 * ARCHITECTURE
 * ───────────
 * Layer A – Proof-of-Authority (PoA):
 *   Only addresses with DOCTOR or DEVICE role may call submitReading().
 *
 * Layer B – PBFT-style finality:
 *   VALIDATOR addresses call approveReading(). A reading is automatically
 *   finalized when approvals ≥ approvalThreshold (default 2/3 of validators).
 *
 * Additionally the contract supports:
 *   • anchorInternalBlock() – store a Merkle root / hash from the off-chain
 *     PostgreSQL ledger so its integrity is provable on-chain.
 *   • Consent management with on-chain events.
 *
 * REMIX DEPLOYMENT STEPS
 * ──────────────────────
 * 1. Open https://remix.ethereum.org
 * 2. Create HybridPatientMonitor.sol, paste this code
 * 3. Compiler → 0.8.19+, EVM → Paris
 * 4. Deploy & Run → Injected Provider (MetaMask on Sepolia)
 * 5. Deploy with constructor param: approvalThreshold_ = 2
 * 6. Copy deployed address → paste into app Settings page
 */

// ──────────────────────────────────────────────────────────────────────────────
// ROLE MANAGEMENT (lightweight AccessControl)
// ──────────────────────────────────────────────────────────────────────────────

contract HybridPatientMonitor {

    // ── Enums ────────────────────────────────────────────────────────────────
    enum Role { NONE, ADMIN, DOCTOR, DEVICE, VALIDATOR }
    enum ReadingStatus { Pending, Finalized, Rejected }

    // ── Structs ──────────────────────────────────────────────────────────────
    struct Reading {
        bytes32  patientIdHash;   // keccak256 of patient UUID – privacy-safe
        bytes32  vitalsHash;      // keccak256 of canonical vitals JSON
        uint256  timestamp;
        string   summaryCID;      // optional IPFS CID or compact JSON summary
        address  submitter;
        ReadingStatus status;
        uint256  approvalCount;
        bool     exists;
    }

    struct AnchoredBlock {
        bytes32  blockHash;       // Merkle root or hash of internal DB ledger batch
        uint256  anchoredAt;
        address  anchoredBy;
    }

    // ── State ────────────────────────────────────────────────────────────────
    address public owner;
    uint256 public approvalThreshold;  // e.g. 2 out of 3 validators

    uint256 public readingCount;
    mapping(uint256 => Reading) public readings;
    mapping(uint256 => mapping(address => bool)) public approvals; // readingId → validator → voted
    mapping(bytes32 => uint256[]) public patientReadings; // patientIdHash → readingIds

    uint256 public anchorCount;
    mapping(uint256 => AnchoredBlock) public anchors;
    mapping(bytes32 => uint256) public anchorByHash; // blockHash → anchorId (for lookup)

    mapping(address => Role) public roles;
    address[] public validators; // track validator list for threshold calc

    // ── Events ───────────────────────────────────────────────────────────────
    event RoleGranted(address indexed account, Role role);
    event RoleRevoked(address indexed account);

    event ReadingSubmitted(
        uint256 indexed readingId,
        bytes32 indexed patientIdHash,
        bytes32 vitalsHash,
        uint256 timestamp,
        address submitter
    );
    event ReadingApproved(uint256 indexed readingId, address indexed validator, uint256 approvalCount);
    event ReadingFinalized(uint256 indexed readingId, bytes32 patientIdHash, uint256 timestamp);
    event ReadingRejected(uint256 indexed readingId);

    event BlockAnchored(uint256 indexed anchorId, bytes32 blockHash, uint256 timestamp, address anchoredBy);
    event ConsentUpdated(bytes32 indexed patientIdHash, address indexed doctor, bool granted, uint256 timestamp);

    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    modifier onlyRole(Role _role) {
        require(roles[msg.sender] == _role || roles[msg.sender] == Role.ADMIN || msg.sender == owner, "Unauthorized role");
        _;
    }
    modifier onlySubmitter() {
        Role r = roles[msg.sender];
        require(r == Role.DOCTOR || r == Role.DEVICE || r == Role.ADMIN || msg.sender == owner, "Not a submitter");
        _;
    }
    modifier onlyValidator() {
        require(roles[msg.sender] == Role.VALIDATOR || msg.sender == owner, "Not a validator");
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────
    /**
     * @param approvalThreshold_ Number of validator approvals needed to finalize
     */
    constructor(uint256 approvalThreshold_) {
        require(approvalThreshold_ > 0, "Threshold must be > 0");
        owner = msg.sender;
        roles[msg.sender] = Role.ADMIN;
        approvalThreshold = approvalThreshold_;
        emit RoleGranted(msg.sender, Role.ADMIN);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ROLE MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════════

    function grantRole(address account, Role role) external onlyOwner {
        require(role != Role.NONE, "Cannot grant NONE");
        // If upgrading to VALIDATOR, track in array
        if (role == Role.VALIDATOR && roles[account] != Role.VALIDATOR) {
            validators.push(account);
        }
        roles[account] = role;
        emit RoleGranted(account, role);
    }

    function revokeRole(address account) external onlyOwner {
        if (roles[account] == Role.VALIDATOR) {
            _removeValidator(account);
        }
        roles[account] = Role.NONE;
        emit RoleRevoked(account);
    }

    function getValidatorCount() external view returns (uint256) {
        return validators.length;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // READING SUBMISSION (Layer A – PoA)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Submit a new vital-sign reading (only DOCTOR / DEVICE / ADMIN)
     * @param patientIdHash  keccak256(abi.encodePacked(patientUUID))
     * @param vitalsHash     keccak256 of canonical vitals JSON string
     * @param summaryCID     Optional human-readable summary or IPFS CID
     */
    function submitReading(
        bytes32 patientIdHash,
        bytes32 vitalsHash,
        string calldata summaryCID
    ) external onlySubmitter returns (uint256) {
        readingCount++;
        readings[readingCount] = Reading({
            patientIdHash: patientIdHash,
            vitalsHash: vitalsHash,
            timestamp: block.timestamp,
            summaryCID: summaryCID,
            submitter: msg.sender,
            status: ReadingStatus.Pending,
            approvalCount: 0,
            exists: true
        });
        patientReadings[patientIdHash].push(readingCount);

        emit ReadingSubmitted(readingCount, patientIdHash, vitalsHash, block.timestamp, msg.sender);
        return readingCount;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // READING APPROVAL (Layer B – PBFT)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Approve a pending reading. Auto-finalizes when threshold met.
     */
    function approveReading(uint256 readingId) external onlyValidator {
        Reading storage r = readings[readingId];
        require(r.exists, "Reading not found");
        require(r.status == ReadingStatus.Pending, "Not pending");
        require(!approvals[readingId][msg.sender], "Already approved");

        approvals[readingId][msg.sender] = true;
        r.approvalCount++;

        emit ReadingApproved(readingId, msg.sender, r.approvalCount);

        // Auto-finalize
        if (r.approvalCount >= approvalThreshold) {
            r.status = ReadingStatus.Finalized;
            emit ReadingFinalized(readingId, r.patientIdHash, r.timestamp);
        }
    }

    /**
     * @notice Reject a reading (owner / admin only)
     */
    function rejectReading(uint256 readingId) external onlyOwner {
        Reading storage r = readings[readingId];
        require(r.exists, "Reading not found");
        require(r.status == ReadingStatus.Pending, "Not pending");
        r.status = ReadingStatus.Rejected;
        emit ReadingRejected(readingId);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // INTERNAL BLOCK ANCHORING
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Anchor an internal DB ledger hash on-chain for integrity proof
     * @param blockHash Merkle root or hash of the latest batch of blockchain_records
     */
    function anchorInternalBlock(bytes32 blockHash) external onlyOwner returns (uint256) {
        anchorCount++;
        anchors[anchorCount] = AnchoredBlock({
            blockHash: blockHash,
            anchoredAt: block.timestamp,
            anchoredBy: msg.sender
        });
        anchorByHash[blockHash] = anchorCount;

        emit BlockAnchored(anchorCount, blockHash, block.timestamp, msg.sender);
        return anchorCount;
    }

    /**
     * @notice Check if an internal block hash has been anchored
     */
    function isBlockAnchored(bytes32 blockHash) external view returns (bool) {
        return anchorByHash[blockHash] > 0;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CONSENT (optional on-chain event logging)
    // ══════════════════════════════════════════════════════════════════════════

    function updateConsent(bytes32 patientIdHash, address doctor, bool granted) external onlyOwner {
        emit ConsentUpdated(patientIdHash, doctor, granted, block.timestamp);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GETTERS
    // ══════════════════════════════════════════════════════════════════════════

    function getReading(uint256 readingId) external view returns (
        bytes32 patientIdHash,
        bytes32 vitalsHash,
        uint256 timestamp,
        string memory summaryCID,
        address submitter,
        ReadingStatus status,
        uint256 approvalCnt
    ) {
        Reading memory r = readings[readingId];
        require(r.exists, "Reading not found");
        return (r.patientIdHash, r.vitalsHash, r.timestamp, r.summaryCID, r.submitter, r.status, r.approvalCount);
    }

    function getPatientReadingCount(bytes32 patientIdHash) external view returns (uint256) {
        return patientReadings[patientIdHash].length;
    }

    /**
     * @notice Paginated patient readings
     */
    function getPatientReadings(bytes32 patientIdHash, uint256 offset, uint256 limit)
        external view returns (uint256[] memory)
    {
        uint256[] storage ids = patientReadings[patientIdHash];
        uint256 end = offset + limit;
        if (end > ids.length) end = ids.length;
        if (offset >= ids.length) return new uint256[](0);

        uint256[] memory result = new uint256[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = ids[i];
        }
        return result;
    }

    function getAnchor(uint256 anchorId) external view returns (bytes32, uint256, address) {
        AnchoredBlock memory a = anchors[anchorId];
        return (a.blockHash, a.anchoredAt, a.anchoredBy);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ══════════════════════════════════════════════════════════════════════════

    function setApprovalThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0, "Threshold must be > 0");
        approvalThreshold = newThreshold;
    }

    // ── Internal ─────────────────────────────────────────────────────────────
    function _removeValidator(address account) internal {
        for (uint256 i = 0; i < validators.length; i++) {
            if (validators[i] == account) {
                validators[i] = validators[validators.length - 1];
                validators.pop();
                break;
            }
        }
    }
}
