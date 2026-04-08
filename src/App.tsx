import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import DoctorDashboard from "./pages/DoctorDashboard";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import Doctors from "./pages/Doctors";
import Records from "./pages/Records";
import Blockchain from "./pages/Blockchain";
import BlockchainAnalytics from "./pages/BlockchainAnalytics";
import SmartContracts from "./pages/SmartContracts";
import PatientPortal from "./pages/PatientPortal";
import AdminPortal from "./pages/AdminPortal";
import AuditLogs from "./pages/AuditLogs";
import Prescriptions from "./pages/Prescriptions";
import Settings from "./pages/Settings";
import Verify from "./pages/Verify";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, userRole, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    if (userRole === 'patient') return <Navigate to="/patient-portal" replace />;
    if (userRole === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { userRole } = useAuth();
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/" element={
        <Navigate to={
          userRole === 'patient' ? '/patient-portal' :
          userRole === 'admin' ? '/admin' :
          '/dashboard'
        } replace />
      } />
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['doctor', 'admin', 'pending']}><DoctorDashboard /></ProtectedRoute>} />
      <Route path="/patients" element={<ProtectedRoute allowedRoles={['doctor', 'admin']}><Patients /></ProtectedRoute>} />
      <Route path="/patients/:id" element={<ProtectedRoute allowedRoles={['doctor', 'admin']}><PatientDetail /></ProtectedRoute>} />
      <Route path="/doctors" element={<ProtectedRoute allowedRoles={['doctor', 'admin']}><Doctors /></ProtectedRoute>} />
      <Route path="/records" element={<ProtectedRoute allowedRoles={['doctor', 'admin']}><Records /></ProtectedRoute>} />
      <Route path="/blockchain" element={<ProtectedRoute allowedRoles={['doctor', 'admin']}><Blockchain /></ProtectedRoute>} />
      <Route path="/blockchain-analytics" element={<ProtectedRoute allowedRoles={['doctor', 'admin']}><BlockchainAnalytics /></ProtectedRoute>} />
      <Route path="/smart-contracts" element={<ProtectedRoute allowedRoles={['doctor', 'admin']}><SmartContracts /></ProtectedRoute>} />
      <Route path="/patient-portal" element={<ProtectedRoute allowedRoles={['patient']}><PatientPortal /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPortal /></ProtectedRoute>} />
      <Route path="/prescriptions" element={<ProtectedRoute allowedRoles={['doctor', 'admin']}><Prescriptions /></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogs /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute allowedRoles={['doctor', 'admin', 'patient']}><Settings /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
