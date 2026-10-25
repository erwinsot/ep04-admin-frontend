import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { CreateTenantPage } from '@/pages/create-tenant-page'
import { OperationsPage } from '@/pages/operations-page'
import { TenantDetailPage } from '@/pages/tenant-detail-page'
import { TenantsListPage } from '@/pages/tenants-list-page'

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<TenantsListPage />} />
        <Route path="/tenants/new" element={<CreateTenantPage />} />
        <Route path="/tenants/:tenantId" element={<TenantDetailPage />} />
        <Route path="/operations" element={<OperationsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
