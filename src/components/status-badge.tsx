import type { TenantStatus } from '@/types/ep04'
import { cn } from '@/lib/utils'

const statusMap: Record<TenantStatus, string> = {
  PENDING: 'b-p',
  VALIDATING: 'b-v',
  PROVISIONING: 'b-v',
  READY: 'b-ok',
  READY_FOR_INGESTION: 'b-ok',
  FAILED: 'b-f',
  DELETING: 'b-n',
  DELETED: 'b-n',
}

export function StatusBadge({ status }: { status: TenantStatus }) {
  return <span className={cn('badge', statusMap[status])}>{status}</span>
}
