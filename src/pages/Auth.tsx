import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Mail, Lock, User, Wallet, Stethoscope, UserCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isMetaMaskInstalled, connectMetaMask } from '@/lib/ethereum';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'doctor' | 'patient' | 'admin'>('patient');
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const { user, userRole, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user && userRole) {
      if (userRole === 'patient') navigate('/patient-portal');
      else if (userRole === 'admin') navigate('/admin');
      else navigate('/dashboard');
    }
  }, [user, userRole, navigate]);

  const handleConnectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      toast({ title: 'MetaMask Required', description: 'Please install MetaMask to connect your wallet.', variant: 'destructive' });
      window.open('https://metamask.io/download/', '_blank');
      return;
    }
    setConnectingWallet(true);
    try {
      const state = await connectMetaMask();
      if (state.address) {
        setWalletAddress(state.address);
        toast({ title: 'Wallet Connected', description: `${state.address.slice(0, 6)}...${state.address.slice(-4)}` });
      }
    } catch (err: any) {
      toast({ title: 'Connection Failed', description: err.message, variant: 'destructive' });
    } finally {
      setConnectingWallet(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: 'Sign In Failed', description: error.message, variant: 'destructive' });
      }
    } else {
      const { error } = await signUp(email, password, fullName, role);
      if (error) {
        toast({ title: 'Sign Up Failed', description: error.message, variant: 'destructive' });
      } else {
        // Save wallet address to profile after signup
        if (walletAddress) {
          // Will be saved after auth state updates
          const saveWallet = async () => {
            const { data: { user: newUser } } = await supabase.auth.getUser();
            if (newUser) {
              await supabase.from('profiles').update({ wallet_address: walletAddress } as any).eq('id', newUser.id);
            }
          };
          setTimeout(saveWallet, 2000);
        }
        toast({ title: 'Account Created!', description: 'Please check your email to verify your account, then sign in.' });
        setIsLogin(true);
      }
    }
    setLoading(false);
  };

  const roleConfig = {
    patient: { icon: UserCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Patient Portal', desc: 'Access your health records, pay bills, and book appointments' },
    doctor: { icon: Stethoscope, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Doctor Portal', desc: 'Monitor patients, manage appointments, and view records' },
    admin: { icon: Shield, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Admin Portal', desc: 'Manage users, approve registrations, and oversee the system' },
  };

  const currentRole = roleConfig[role];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/30 to-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">IPMS Healthcare</CardTitle>
          <CardDescription>Intelligent Patient Monitoring System</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Role Selection Tabs */}
          {!isLogin && (
            <div className="mb-6">
              <Label className="text-sm font-medium mb-3 block">Select Your Role</Label>
              <Tabs value={role} onValueChange={(v) => setRole(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="patient" className="gap-1.5 text-xs">
                    <UserCircle className="h-3.5 w-3.5" /> Patient
                  </TabsTrigger>
                  <TabsTrigger value="doctor" className="gap-1.5 text-xs">
                    <Stethoscope className="h-3.5 w-3.5" /> Doctor
                  </TabsTrigger>
                  <TabsTrigger value="admin" className="gap-1.5 text-xs">
                    <Shield className="h-3.5 w-3.5" /> Admin
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className={`mt-3 p-3 rounded-lg ${currentRole.bg} flex items-start gap-3`}>
                <currentRole.icon className={`h-5 w-5 mt-0.5 ${currentRole.color}`} />
                <div>
                  <p className={`text-sm font-medium ${currentRole.color}`}>{currentRole.label}</p>
                  <p className="text-xs text-muted-foreground">{currentRole.desc}</p>
                  {role === 'doctor' && <p className="text-xs text-warning mt-1">⚠️ Requires admin approval</p>}
                </div>
              </div>
            </div>
          )}

          {/* Wallet Connection */}
          <div className="mb-4">
            <Button
              type="button"
              variant={walletAddress ? 'secondary' : 'outline'}
              className="w-full gap-2"
              onClick={handleConnectWallet}
              disabled={connectingWallet}
            >
              <Wallet className="h-4 w-4" />
              {connectingWallet ? 'Connecting...' : walletAddress ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connect MetaMask Wallet'}
            </Button>
            {!walletAddress && (
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Connect your Sepolia wallet for blockchain transactions
              </p>
            )}
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{isLogin ? 'Sign in to continue' : 'Create your account'}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" placeholder="John Smith" required={!isLogin} />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="user@hospital.com" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" placeholder="••••••••" required minLength={6} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline">
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
