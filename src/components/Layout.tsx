import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Activity, Users, Boxes, FileText, Shield, LogOut, Menu, Heart,
  Stethoscope, Database, BarChart3, ClipboardList, UserCircle, Pill, Settings, Calendar, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useEthereum } from '@/hooks/useEthereum';
import { WalletConnect } from '@/components/WalletConnect';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

interface LayoutProps { children: ReactNode; }

const doctorNav = [
  { name: 'Dashboard', href: '/dashboard', icon: Activity },
  { name: 'Patients', href: '/patients', icon: Users },
  { name: 'Doctors', href: '/doctors', icon: Stethoscope },
  { name: 'Records', href: '/records', icon: Database },
  { name: 'Blockchain Explorer', href: '/blockchain', icon: Boxes },
  { name: 'Blockchain Analytics', href: '/blockchain-analytics', icon: BarChart3 },
  { name: 'Smart Contracts', href: '/smart-contracts', icon: FileText },
  { name: 'Prescriptions', href: '/prescriptions', icon: Pill },
];

const adminNav = [
  { name: 'Admin Portal', href: '/admin', icon: Shield },
  { name: 'Dashboard', href: '/dashboard', icon: Activity },
  { name: 'Patients', href: '/patients', icon: Users },
  { name: 'Doctors', href: '/doctors', icon: Stethoscope },
  { name: 'Records', href: '/records', icon: Database },
  { name: 'Blockchain Explorer', href: '/blockchain', icon: Boxes },
  { name: 'Blockchain Analytics', href: '/blockchain-analytics', icon: BarChart3 },
  { name: 'Smart Contracts', href: '/smart-contracts', icon: FileText },
  { name: 'Prescriptions', href: '/prescriptions', icon: Pill },
  { name: 'Audit Logs', href: '/audit-logs', icon: ClipboardList },
];

const patientNav = [
  { name: 'My Health Portal', href: '/patient-portal', icon: UserCircle },
];

const commonNav = [
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout({ children }: LayoutProps) {
  const { user, userRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { wallet, networkInfo, isConnecting, connect, disconnect, switchNetwork } = useEthereum();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const navigation = userRole === 'patient'
    ? [...patientNav, ...commonNav]
    : userRole === 'admin'
    ? [...adminNav, ...commonNav]
    : [...doctorNav, ...commonNav];

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-200 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-2 px-6 border-b border-sidebar-border">
            <Heart className="h-8 w-8 text-sidebar-primary" />
            <div>
              <h1 className="text-lg font-display font-bold text-sidebar-foreground">IPMS</h1>
              <p className="text-xs text-sidebar-foreground/70">Blockchain Healthcare</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
                <span className="text-sidebar-primary font-semibold">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.email}</p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{userRole || 'User'}</p>
              </div>
            </div>
            <Button
              variant="ghost" size="sm" onClick={handleSignOut}
              className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/95 backdrop-blur px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <ThemeToggle />
          <NotificationBell />
          {userRole !== 'patient' && (
            <WalletConnect
              wallet={wallet}
              isConnecting={isConnecting}
              onConnect={connect}
              onDisconnect={disconnect}
              onSwitchNetwork={switchNetwork}
            />
          )}
          {networkInfo && userRole !== 'patient' && (
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>Block #{networkInfo.blockNumber?.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="hidden sm:inline text-muted-foreground">Online</span>
          </div>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
