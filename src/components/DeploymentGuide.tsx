import { useState } from 'react';
import { ExternalLink, Copy, CheckCircle, Rocket, Code, Terminal, FileCode, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { PATIENT_RECORD_CONTRACT_ADDRESS } from '@/lib/ethereum';

const CONTRACT_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PatientRecordStorage {
    struct VitalRecord {
        string patientId;
        string dataHash;
        string vitalsSummary;
        uint256 timestamp;
        address recorder;
    }
    
    mapping(uint256 => VitalRecord) public records;
    mapping(string => uint256[]) public patientRecords;
    uint256 public recordCount;
    
    address public admin;
    mapping(address => bool) public authorizedRecorders;
    
    event RecordStored(
        uint256 indexed recordId,
        string indexed patientId,
        string dataHash,
        uint256 timestamp
    );
    
    event RecorderAuthorized(address indexed recorder);
    event RecorderRevoked(address indexed recorder);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            authorizedRecorders[msg.sender] || msg.sender == admin,
            "Not authorized"
        );
        _;
    }
    
    constructor() {
        admin = msg.sender;
        authorizedRecorders[msg.sender] = true;
    }
    
    function authorizeRecorder(address _recorder) external onlyAdmin {
        authorizedRecorders[_recorder] = true;
        emit RecorderAuthorized(_recorder);
    }
    
    function revokeRecorder(address _recorder) external onlyAdmin {
        authorizedRecorders[_recorder] = false;
        emit RecorderRevoked(_recorder);
    }
    
    function storeRecord(
        string memory _patientId,
        string memory _dataHash,
        string memory _vitalsSummary
    ) external onlyAuthorized returns (uint256) {
        recordCount++;
        
        records[recordCount] = VitalRecord({
            patientId: _patientId,
            dataHash: _dataHash,
            vitalsSummary: _vitalsSummary,
            timestamp: block.timestamp,
            recorder: msg.sender
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
        VitalRecord memory record = records[_recordId];
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
        return keccak256(bytes(records[_recordId].dataHash)) == 
               keccak256(bytes(_expectedHash));
    }
}`;

interface DeploymentGuideProps {
  onContractAddressUpdate?: (address: string) => void;
}

export function DeploymentGuide({ onContractAddressUpdate }: DeploymentGuideProps) {
  const [contractAddress, setContractAddress] = useState(
    PATIENT_RECORD_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' 
      ? PATIENT_RECORD_CONTRACT_ADDRESS 
      : ''
  );
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Contract source copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddressUpdate = () => {
    if (!contractAddress.startsWith('0x') || contractAddress.length !== 42) {
      toast({
        title: 'Invalid Address',
        description: 'Please enter a valid Ethereum address',
        variant: 'destructive',
      });
      return;
    }

    if (onContractAddressUpdate) {
      onContractAddressUpdate(contractAddress);
    }

    toast({
      title: 'Address Updated',
      description: 'Contract address has been updated. Refresh to use the new contract.',
    });
  };

  const isDeployed = PATIENT_RECORD_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Smart Contract Deployment
            </CardTitle>
            <CardDescription>
              Deploy PatientRecordStorage contract to Sepolia testnet
            </CardDescription>
          </div>
          <Badge variant={isDeployed ? 'default' : 'secondary'}>
            {isDeployed ? 'Deployed' : 'Not Deployed'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Alert */}
        {isDeployed ? (
          <Alert className="border-consensus/30 bg-consensus/5">
            <CheckCircle className="h-4 w-4 text-consensus" />
            <AlertTitle className="text-consensus">Contract Deployed</AlertTitle>
            <AlertDescription>
              Contract is deployed at{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {PATIENT_RECORD_CONTRACT_ADDRESS.slice(0, 10)}...{PATIENT_RECORD_CONTRACT_ADDRESS.slice(-8)}
              </code>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Deployment Required</AlertTitle>
            <AlertDescription>
              Follow the steps below to deploy the contract to Sepolia testnet
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="guide">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="guide">Deployment Guide</TabsTrigger>
            <TabsTrigger value="source">Contract Source</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="guide" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Open Remix IDE</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Go to Remix Ethereum IDE in your browser
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => window.open('https://remix.ethereum.org', '_blank')}
                  >
                    Open Remix IDE
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Create Contract File</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a new file called <code className="bg-muted px-1">PatientRecordStorage.sol</code> and paste the contract source code
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Compile Contract</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select Solidity Compiler 0.8.19 or higher and click "Compile"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  4
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Connect MetaMask</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    In Deploy & Run, select "Injected Provider - MetaMask" and ensure you're on Sepolia network
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  5
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Deploy Contract</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click "Deploy" and confirm the transaction in MetaMask. Copy the deployed contract address.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  6
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Update Configuration</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Paste the deployed contract address in the Configuration tab below
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Get Sepolia ETH
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                You'll need Sepolia ETH for gas fees. Get free testnet ETH from:
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://sepoliafaucet.com', '_blank')}
                >
                  Sepolia Faucet
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://www.alchemy.com/faucets/ethereum-sepolia', '_blank')}
                >
                  Alchemy Faucet
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="source" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                <span className="text-sm font-medium">PatientRecordStorage.sol</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(CONTRACT_SOURCE)}
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Source
                  </>
                )}
              </Button>
            </div>
            <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono max-h-[400px]">
              <code>{CONTRACT_SOURCE}</code>
            </pre>
          </TabsContent>

          <TabsContent value="config" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="contract-address">Deployed Contract Address</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="contract-address"
                    placeholder="0x..."
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    className="font-mono"
                  />
                  <Button onClick={handleAddressUpdate}>
                    Update
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Enter the address of your deployed PatientRecordStorage contract on Sepolia
                </p>
              </div>

              <Alert>
                <Code className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                  For production use, update the contract address in{' '}
                  <code className="text-xs bg-muted px-1">src/lib/ethereum.ts</code>
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}