import type { TenantStatus } from '@/types/ep04'
import { cn } from '@/lib/utils'

const statusMap: Record<TenantStatus, string> = {
  PENDING: 'badge pending',
  VALIDATING: 'badge validating',
  PROVISIONING: 'badge provisioning',
  READY: 'badge ready',
  READY_FOR_INGESTION: 'badge ready-ingestion',
  FAILED: 'badge failed',
  DELETING: 'badge deleting',
  DELETED: 'badge deleted',
}

export function StatusBadge({ status }: { status: TenantStatus }) {
  return <span className={cn('badge', statusMap[status])}>{status}</span>
}
