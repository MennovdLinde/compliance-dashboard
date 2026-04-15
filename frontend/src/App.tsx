import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage }    from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ControlsPage }  from './pages/ControlsPage';
import { RisksPage }     from './pages/RisksPage';
import { AuditLogPage }  from './pages/AuditLogPage';
import { ReportsPage }   from './pages/ReportsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { token } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard"  element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/controls"   element={<ProtectedRoute><ControlsPage /></ProtectedRoute>} />
      <Route path="/risks"      element={<ProtectedRoute><RisksPage /></ProtectedRoute>} />
      <Route path="/audit-log"  element={<ProtectedRoute><AuditLogPage /></ProtectedRoute>} />
      <Route path="/reports"    element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="*"           element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
