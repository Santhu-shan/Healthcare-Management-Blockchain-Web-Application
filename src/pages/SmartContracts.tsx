import { useState, useEffect } from 'react';
import { FileText, Shield, Bell, Code, Copy, Check, ExternalLink, Wallet, RefreshCw } from 'lucide-react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEthereum } from '@/hooks/useEthereum';
import { VITAL_THRESHOLDS } from '@/types';
import { formatAddress } from '@/lib/ethereum';
import { toast } from 'sonner';

export default function SmartContracts() {
  const { wallet, isConnecting, connect, switchNetwork, getContractSource } = useEthereum();
  const [contractData, setContractData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    loadContractSource();
  }, []);

  const loadContractSource = async () => {
    setIsLoading(true);
    const data = await getContractSource();
    if (data) {
      setContractData(data);
    }
    setIsLoading(false);
  };

  const copyToClipboard = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const soliditySource = contractData?.source || `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PatientRecordStorage
 * @dev Stores patient health records on the Ethereum blockchain
 * @author Healthcare Blockchain System
 * 
 * This smart contract implements:
 * - Immutable health record storage
 * - Role-based access control
 * - Cryptographic verification
 * - Audit trail for all operations
 */
contract PatientRecordStorage {
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct HealthRecord {
        string patientId;
        string dataHash;          // SHA-256 hash of the full record
        string vitalsSummary;     // Encrypted vitals summary
        uint256 timestamp;
        address recorder;         // Address of the healthcare provider
        bool exists;
    }
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    mapping(uint256 => HealthRecord) public records;
    mapping(string => uint256[]) public patientRecords;
    
    uint256 public recordCount;
    address public owner;
    mapping(address => bool) public authorizedProviders;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event RecordStored(
        uint256 indexed recordId,
        string indexed patientId,
        string dataHash,
        uint256 timestamp
    );
    
    event ProviderAuthorized(address indexed provider);
    event ProviderRevoked(address indexed provider);
    
    // ============================================
    // MODIFIERS
    // ============================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            authorizedProviders[msg.sender] || msg.sender == owner,
            "Not authorized to store records"
        );
        _;
    }
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor() {
        owner = msg.sender;
        authorizedProviders[msg.sender] = true;
    }
    
    // ============================================
    // AUTHORIZATION FUNCTIONS
    // ============================================
    
    /**
     * @dev Authorize a healthcare provider to store records
     * @param _provider Address of the provider to authorize
     */
    function authorizeProvider(address _provider) external onlyOwner {
        authorizedProviders[_provider] = true;
        emit ProviderAuthorized(_provider);
    }
    
    /**
     * @dev Revoke a provider's authorization
     * @param _provider Address of the provider to revoke
     */
    function revokeProvider(address _provider) external onlyOwner {
        authorizedProviders[_provider] = false;
        emit ProviderRevoked(_provider);
    }
    
    // ============================================
    // RECORD STORAGE FUNCTIONS
    // ============================================
    
    /**
     * @dev Store a new health record on the blockchain
     * @param _patientId Unique identifier for the patient
     * @param _dataHash SHA-256 hash of the complete record
     * @param _vitalsSummary Encrypted summary of vital signs
     * @return The ID of the newly created record
     */
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
    
    // ============================================
    // RECORD RETRIEVAL FUNCTIONS
    // ============================================
    
    /**
     * @dev Retrieve a health record by ID
     * @param _recordId The ID of the record to retrieve
     */
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
    
    /**
     * @dev Get all record IDs for a patient
     * @param _patientId The patient's unique identifier
     */
    function getPatientRecordIds(string memory _patientId) 
        external view returns (uint256[] memory) 
    {
        return patientRecords[_patientId];
    }
    
    /**
     * @dev Get the total number of records stored
     */
    function getRecordCount() external view returns (uint256) {
        return recordCount;
    }
    
    // ============================================
    // VERIFICATION FUNCTIONS
    // ============================================
    
    /**
     * @dev Verify a record's integrity by comparing hashes
     * @param _recordId The ID of the record to verify
     * @param _expectedHash The expected hash value
     * @return True if the hashes match, false otherwise
     */
    function verifyRecord(uint256 _recordId, string memory _expectedHash) 
        external view returns (bool) 
    {
        require(records[_recordId].exists, "Record does not exist");
        return keccak256(bytes(records[_recordId].dataHash)) == 
               keccak256(bytes(_expectedHash));
    }
    
    /**
     * @dev Check if an address is an authorized provider
     * @param _provider Address to check
     */
    function isAuthorized(address _provider) external view returns (bool) {
        return authorizedProviders[_provider] || _provider == owner;
    }
}`;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display">Smart Contracts</h1>
            <p className="text-muted-foreground">Ethereum Solidity contracts for healthcare data management</p>
          </div>
          <div className="flex items-center gap-2">
            {wallet.isConnected ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={wallet.isCorrectNetwork ? 'text-success border-success' : 'text-warning border-warning'}>
                  <Wallet className="h-3 w-3 mr-1" />
                  {formatAddress(wallet.address || '')}
                </Badge>
                {!wallet.isCorrectNetwork && (
                  <Button size="sm" variant="outline" onClick={switchNetwork}>
                    Switch to Sepolia
                  </Button>
                )}
              </div>
            ) : (
              <Button onClick={connect} disabled={isConnecting}>
                <Wallet className="h-4 w-4 mr-2" />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            )}
          </div>
        </div>

        <Alert>
          <Code className="h-4 w-4" />
          <AlertDescription>
            This contract is designed for the <strong>Sepolia testnet</strong>. Deploy using{' '}
            <a href="https://remix.ethereum.org" target="_blank" rel="noopener noreferrer" className="underline text-primary">
              Remix IDE <ExternalLink className="h-3 w-3 inline" />
            </a>{' '}
            with Solidity compiler version 0.8.19+.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="source" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="source">Source Code</TabsTrigger>
            <TabsTrigger value="abi">Contract ABI</TabsTrigger>
            <TabsTrigger value="logic">Access Control</TabsTrigger>
            <TabsTrigger value="deploy">Deployment</TabsTrigger>
          </TabsList>

          <TabsContent value="source" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>PatientRecordStorage.sol</CardTitle>
                      <CardDescription>Solidity ^0.8.19 • MIT License</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(soliditySource, 'source')}
                    >
                      {copiedSection === 'source' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={loadContractSource} disabled={isLoading}>
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto font-mono max-h-[600px] overflow-y-auto">
                  {soliditySource}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="abi" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-hash" />
                    <div>
                      <CardTitle>Application Binary Interface (ABI)</CardTitle>
                      <CardDescription>JSON interface for contract interaction</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(contractData?.abi || [], null, 2), 'abi')}
                  >
                    {copiedSection === 'abi' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto font-mono max-h-[500px] overflow-y-auto">
                  {JSON.stringify(contractData?.abi || [
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
                    }
                  ], null, 2)}
                </pre>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Function Signatures</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="p-2 bg-muted rounded font-mono text-xs">
                    <span className="text-primary">storeRecord</span>(string, string, string) → uint256
                  </div>
                  <div className="p-2 bg-muted rounded font-mono text-xs">
                    <span className="text-primary">getRecord</span>(uint256) → (string, string, string, uint256, address)
                  </div>
                  <div className="p-2 bg-muted rounded font-mono text-xs">
                    <span className="text-primary">verifyRecord</span>(uint256, string) → bool
                  </div>
                  <div className="p-2 bg-muted rounded font-mono text-xs">
                    <span className="text-primary">authorizeProvider</span>(address)
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Events</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="p-2 bg-muted rounded font-mono text-xs">
                    <span className="text-warning">RecordStored</span>(recordId, patientId, dataHash, timestamp)
                  </div>
                  <div className="p-2 bg-muted rounded font-mono text-xs">
                    <span className="text-success">ProviderAuthorized</span>(provider)
                  </div>
                  <div className="p-2 bg-muted rounded font-mono text-xs">
                    <span className="text-destructive">ProviderRevoked</span>(provider)
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="logic" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle>Role-Based Access Control</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    The contract implements strict access control using Solidity modifiers:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <span className="font-medium">Contract Owner</span>
                        <p className="text-xs text-muted-foreground">Deployer address</p>
                      </div>
                      <Badge variant="outline" className="text-primary border-primary">Full Access</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <span className="font-medium">Authorized Providers</span>
                        <p className="text-xs text-muted-foreground">Healthcare professionals</p>
                      </div>
                      <Badge variant="outline" className="text-success border-success">Store Records</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <span className="font-medium">Public</span>
                        <p className="text-xs text-muted-foreground">Anyone</p>
                      </div>
                      <Badge variant="outline">View Only</Badge>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Modifier Implementation:</p>
                    <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
{`modifier onlyAuthorized() {
    require(
        authorizedProviders[msg.sender] 
        || msg.sender == owner,
        "Not authorized"
    );
    _;
}`}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-warning" />
                    <CardTitle>Alert Thresholds</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Off-chain monitoring triggers alerts when vitals exceed these thresholds:
                  </p>
                  <div className="space-y-2">
                    {Object.entries(VITAL_THRESHOLDS).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="font-medium capitalize">{key.replace('_', ' ')}</span>
                        <span className="text-sm font-mono">{val.min} - {val.max} {val.unit}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Event Emission:</p>
                    <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
{`emit RecordStored(
    recordCount,    // Unique ID
    _patientId,     // Patient reference
    _dataHash,      // Integrity hash
    block.timestamp // Immutable time
);`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Data Integrity Verification</CardTitle>
                <CardDescription>How the contract ensures data hasn't been tampered with</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-2xl mb-2">1️⃣</div>
                    <p className="font-medium">Hash Generation</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Off-chain SHA-256 hash of complete patient record
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-2xl mb-2">2️⃣</div>
                    <p className="font-medium">On-Chain Storage</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Hash stored immutably on Ethereum blockchain
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-2xl mb-2">3️⃣</div>
                    <p className="font-medium">Verification</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Compare stored hash with recomputed hash anytime
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deploy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Deployment Guide</CardTitle>
                <CardDescription>Step-by-step instructions for deploying to Sepolia testnet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium">Open Remix IDE</h4>
                      <p className="text-sm text-muted-foreground">
                        Navigate to{' '}
                        <a href="https://remix.ethereum.org" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                          remix.ethereum.org <ExternalLink className="h-3 w-3 inline" />
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium">Create Contract File</h4>
                      <p className="text-sm text-muted-foreground">
                        Create a new file named <code className="bg-muted px-1 rounded">PatientRecordStorage.sol</code> and paste the source code
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium">Compile Contract</h4>
                      <p className="text-sm text-muted-foreground">
                        Select Solidity compiler version <code className="bg-muted px-1 rounded">0.8.19</code> and click Compile
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium">Connect MetaMask</h4>
                      <p className="text-sm text-muted-foreground">
                        In Deploy tab, select "Injected Provider - MetaMask" and ensure you're on Sepolia network
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      5
                    </div>
                    <div>
                      <h4 className="font-medium">Deploy Contract</h4>
                      <p className="text-sm text-muted-foreground">
                        Click Deploy and confirm the transaction in MetaMask (requires Sepolia ETH)
                      </p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    <strong>Get Test ETH:</strong> Visit a Sepolia faucet like{' '}
                    <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      sepoliafaucet.com
                    </a>{' '}
                    to get free test ETH for deployment and transactions.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Estimated Gas</h4>
                    <p className="text-2xl font-mono">~1,500,000</p>
                    <p className="text-xs text-muted-foreground">For contract deployment</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Store Record Gas</h4>
                    <p className="text-2xl font-mono">~150,000</p>
                    <p className="text-xs text-muted-foreground">Per transaction</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
