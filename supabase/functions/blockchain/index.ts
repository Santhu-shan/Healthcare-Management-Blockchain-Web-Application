import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sepolia testnet configuration
const SEPOLIA_CHAIN_ID = 11155111;
const INFURA_URL = `https://sepolia.infura.io/v3/${Deno.env.get("INFURA_API_KEY")}`;

// ABI for the PatientRecordStorage contract
const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "_patientId", "type": "string" },
      { "internalType": "string", "name": "_dataHash", "type": "string" },
      { "internalType": "string", "name": "_vitalsSummary", "type": "string" }
    ],
    "name": "storeRecord",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_recordId", "type": "uint256" }],
    "name": "getRecord",
    "outputs": [
      { "internalType": "string", "name": "patientId", "type": "string" },
      { "internalType": "string", "name": "dataHash", "type": "string" },
      { "internalType": "string", "name": "vitalsSummary", "type": "string" },
      { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
      { "internalType": "address", "name": "recorder", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRecordCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_patientId", "type": "string" }
    ],
    "name": "getPatientRecordIds",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "recordId", "type": "uint256" },
      { "indexed": true, "internalType": "string", "name": "patientId", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "dataHash", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "RecordStored",
    "type": "event"
  }
];

// Solidity contract source code for reference
const CONTRACT_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PatientRecordStorage
 * @dev Stores patient health records on the Ethereum blockchain
 * @author Healthcare Blockchain System
 */
contract PatientRecordStorage {
    struct HealthRecord {
        string patientId;
        string dataHash;          // SHA-256 hash of the full record
        string vitalsSummary;     // Encrypted vitals summary
        uint256 timestamp;
        address recorder;         // Address of the healthcare provider
        bool exists;
    }
    
    mapping(uint256 => HealthRecord) public records;
    mapping(string => uint256[]) public patientRecords;
    
    uint256 public recordCount;
    address public owner;
    mapping(address => bool) public authorizedProviders;
    
    event RecordStored(
        uint256 indexed recordId,
        string indexed patientId,
        string dataHash,
        uint256 timestamp
    );
    
    event ProviderAuthorized(address indexed provider);
    event ProviderRevoked(address indexed provider);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            authorizedProviders[msg.sender] || msg.sender == owner,
            "Not authorized"
        );
        _;
    }
    
    constructor() {
        owner = msg.sender;
        authorizedProviders[msg.sender] = true;
    }
    
    function authorizeProvider(address _provider) external onlyOwner {
        authorizedProviders[_provider] = true;
        emit ProviderAuthorized(_provider);
    }
    
    function revokeProvider(address _provider) external onlyOwner {
        authorizedProviders[_provider] = false;
        emit ProviderRevoked(_provider);
    }
    
    function storeRecord(
        string memory _patientId,
        string memory _dataHash,
        string memory _vitalsSummary
    ) external onlyAuthorized returns (uint256) {
        recordCount++;
        
        records[recordCount] = HealthRecord({
            patientId: _patientId,
            dataHash: _dataHash,
            vitalsSummary: _vitalsSummary,
            timestamp: block.timestamp,
            recorder: msg.sender,
            exists: true
        });
        
        patientRecords[_patientId].push(recordCount);
        
        emit RecordStored(recordCount, _patientId, _dataHash, block.timestamp);
        
        return recordCount;
    }
    
    function getRecord(uint256 _recordId) external view returns (
        string memory patientId,
        string memory dataHash,
        string memory vitalsSummary,
        uint256 timestamp,
        address recorder
    ) {
        require(records[_recordId].exists, "Record does not exist");
        HealthRecord memory record = records[_recordId];
        return (
            record.patientId,
            record.dataHash,
            record.vitalsSummary,
            record.timestamp,
            record.recorder
        );
    }
    
    function getPatientRecordIds(string memory _patientId) 
        external view returns (uint256[] memory) 
    {
        return patientRecords[_patientId];
    }
    
    function getRecordCount() external view returns (uint256) {
        return recordCount;
    }
    
    function verifyRecord(uint256 _recordId, string memory _expectedHash) 
        external view returns (bool) 
    {
        require(records[_recordId].exists, "Record does not exist");
        return keccak256(bytes(records[_recordId].dataHash)) == 
               keccak256(bytes(_expectedHash));
    }
}
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, data } = await req.json();
    const infuraKey = Deno.env.get("INFURA_API_KEY");

    if (!infuraKey) {
      return new Response(
        JSON.stringify({ error: "INFURA_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case "getNetworkInfo": {
        // Get current block number and gas price from Sepolia
        const [blockNumberRes, gasPriceRes] = await Promise.all([
          fetch(INFURA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_blockNumber",
              params: [],
              id: 1
            })
          }),
          fetch(INFURA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_gasPrice",
              params: [],
              id: 2
            })
          })
        ]);

        const blockNumberData = await blockNumberRes.json();
        const gasPriceData = await gasPriceRes.json();

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              chainId: SEPOLIA_CHAIN_ID,
              networkName: "Sepolia Testnet",
              blockNumber: parseInt(blockNumberData.result, 16),
              gasPrice: parseInt(gasPriceData.result, 16) / 1e9, // Convert to Gwei
              infuraUrl: INFURA_URL.replace(infuraKey, "***")
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "getContractSource": {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              source: CONTRACT_SOURCE,
              abi: CONTRACT_ABI,
              compiler: "solc 0.8.19",
              license: "MIT"
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "getBlockDetails": {
        const blockNumber = data?.blockNumber || "latest";
        const blockParam = blockNumber === "latest" ? "latest" : `0x${blockNumber.toString(16)}`;

        const response = await fetch(INFURA_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getBlockByNumber",
            params: [blockParam, true],
            id: 1
          })
        });

        const blockData = await response.json();

        if (!blockData.result) {
          return new Response(
            JSON.stringify({ error: "Block not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const block = blockData.result;
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              number: parseInt(block.number, 16),
              hash: block.hash,
              parentHash: block.parentHash,
              timestamp: new Date(parseInt(block.timestamp, 16) * 1000).toISOString(),
              miner: block.miner,
              gasUsed: parseInt(block.gasUsed, 16),
              gasLimit: parseInt(block.gasLimit, 16),
              transactionCount: block.transactions.length,
              size: parseInt(block.size, 16),
              difficulty: block.difficulty,
              nonce: block.nonce,
              sha3Uncles: block.sha3Uncles,
              logsBloom: block.logsBloom?.substring(0, 66) + "...",
              stateRoot: block.stateRoot,
              receiptsRoot: block.receiptsRoot,
              transactionsRoot: block.transactionsRoot
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "getRecentBlocks": {
        // Get latest block number
        const latestRes = await fetch(INFURA_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 1
          })
        });
        const latestData = await latestRes.json();
        const latestBlock = parseInt(latestData.result, 16);

        // Get last 5 blocks
        const blockPromises = [];
        for (let i = 0; i < 5; i++) {
          const blockNum = latestBlock - i;
          blockPromises.push(
            fetch(INFURA_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_getBlockByNumber",
                params: [`0x${blockNum.toString(16)}`, false],
                id: i + 1
              })
            }).then(res => res.json())
          );
        }

        const blocksData = await Promise.all(blockPromises);
        const blocks = blocksData.map(b => {
          const block = b.result;
          return {
            number: parseInt(block.number, 16),
            hash: block.hash,
            parentHash: block.parentHash,
            timestamp: new Date(parseInt(block.timestamp, 16) * 1000).toISOString(),
            transactionCount: block.transactions.length,
            gasUsed: parseInt(block.gasUsed, 16),
            miner: block.miner
          };
        });

        return new Response(
          JSON.stringify({ success: true, data: blocks }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "getTransaction": {
        const txHash = data?.txHash;
        if (!txHash) {
          return new Response(
            JSON.stringify({ error: "Transaction hash required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const [txRes, receiptRes] = await Promise.all([
          fetch(INFURA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_getTransactionByHash",
              params: [txHash],
              id: 1
            })
          }),
          fetch(INFURA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_getTransactionReceipt",
              params: [txHash],
              id: 2
            })
          })
        ]);

        const txData = await txRes.json();
        const receiptData = await receiptRes.json();

        if (!txData.result) {
          return new Response(
            JSON.stringify({ error: "Transaction not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const tx = txData.result;
        const receipt = receiptData.result;

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              hash: tx.hash,
              blockNumber: parseInt(tx.blockNumber, 16),
              blockHash: tx.blockHash,
              from: tx.from,
              to: tx.to,
              value: parseInt(tx.value, 16) / 1e18, // Convert to ETH
              gasPrice: parseInt(tx.gasPrice, 16) / 1e9, // Gwei
              gas: parseInt(tx.gas, 16),
              nonce: parseInt(tx.nonce, 16),
              input: tx.input,
              transactionIndex: parseInt(tx.transactionIndex, 16),
              status: receipt ? (parseInt(receipt.status, 16) === 1 ? "Success" : "Failed") : "Pending",
              gasUsed: receipt ? parseInt(receipt.gasUsed, 16) : null,
              effectiveGasPrice: receipt ? parseInt(receipt.effectiveGasPrice, 16) / 1e9 : null,
              logs: receipt?.logs?.length || 0
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "simulateStoreRecord": {
        // Simulate what storing a record would look like
        // In production, this would be signed and submitted by MetaMask
        const { patientId, vitals } = data;

        // Create a hash of the data
        const encoder = new TextEncoder();
        const dataString = JSON.stringify({ patientId, vitals, timestamp: Date.now() });
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(dataString));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const dataHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

        // Estimate gas (simplified)
        const estimatedGas = 150000; // Typical gas for contract interaction

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              simulation: true,
              patientId,
              dataHash: `0x${dataHash}`,
              vitalsSummary: JSON.stringify(vitals),
              estimatedGas,
              note: "This is a simulation. Real transactions require MetaMask wallet connection and Sepolia ETH."
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "getAccountBalance": {
        const address = data?.address;
        if (!address) {
          return new Response(
            JSON.stringify({ error: "Address required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const response = await fetch(INFURA_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getBalance",
            params: [address, "latest"],
            id: 1
          })
        });

        const balanceData = await response.json();
        const balanceWei = parseInt(balanceData.result, 16);
        const balanceEth = balanceWei / 1e18;

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              address,
              balanceWei: balanceWei.toString(),
              balanceEth: balanceEth.toFixed(6),
              network: "Sepolia"
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Blockchain function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
