import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/Login'
import { DashboardLayout } from './layouts/DashboardLayout'
import { DashboardPage } from './pages/Dashboard'
import { UsersPage } from './pages/Users'
import { DevicesPage } from './pages/Devices'
import { ZonesPage } from './pages/Zones'
import { SettingsPage } from './pages/Settings'
import { AuditLogPage } from './pages/AuditLog'
import { ClientsPage } from './pages/Clients'
import { StickersPage } from './pages/Stickers'
import { ClientDetailPage } from './pages/ClientDetail'
import { CaissePage } from './pages/Caisse'
import { ForgotPasswordPage } from './pages/ForgotPassword'
import { ActivityPage } from './pages/Activity'
import { CreditConfigPage } from './pages/CreditConfig'
import { LoanRequestsPage } from './pages/LoanRequests'
import { isAuthenticated } from './lib/auth'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="zones" element={<ZonesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="audit-log" element={<AuditLogPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="stickers" element={<StickersPage />} />
        <Route path="caisse" element={<CaissePage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="credit" element={<LoanRequestsPage />} />
        <Route path="credit-config" element={<CreditConfigPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
