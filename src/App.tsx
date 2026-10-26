import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth-context'
import { peekReturnTo } from '@/lib/auth'
import { AuthCallbackPage } from '@/pages/auth-callback-page'
import { CreateTenantPage } from '@/pages/create-tenant-page'
import { LoginPage } from '@/pages/login-page'
import { OperationsPage } from '@/pages/operations-page'
import { TenantDetailPage } from '@/pages/tenant-detail-page'
import { TenantsListPage } from '@/pages/tenants-list-page'

export function App() {
  const { session } = useAuth()
  const location = useLocation()

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/login" replace state={{ from: location }} />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/auth/callback" element={<Navigate to={peekReturnTo()} replace />} />
        <Route path="/" element={<TenantsListPage />} />
        <Route path="/tenants/new" element={<CreateTenantPage />} />
        <Route path="/tenants/:tenantId" element={<TenantDetailPage />} />
        <Route path="/operations" element={<OperationsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
