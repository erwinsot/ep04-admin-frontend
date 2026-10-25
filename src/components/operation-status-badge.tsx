import type { OperationStatus } from '@/types/ep04'
import { cn } from '@/lib/utils'

const statusMap: Record<OperationStatus, string> = {
  PENDING: 'op-badge pending',
  VALIDATING: 'op-badge validating',
  PROVISIONING: 'op-badge provisioning',
  SUCCESS: 'op-badge success',
  FAILED: 'op-badge failed',
}

export function OperationStatusBadge({ status }: { status: OperationStatus }) {
  return <span className={cn('op-badge', statusMap[status])}>{status}</span>
}
