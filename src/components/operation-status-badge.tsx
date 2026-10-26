import type { OperationStatus } from '@/types/ep04'
import { cn } from '@/lib/utils'

const statusMap: Record<OperationStatus, string> = {
  PENDING: 'b-p',
  VALIDATING: 'b-p',
  PROVISIONING: 'b-v',
  SUCCESS: 'b-ok',
  FAILED: 'b-f',
}

export function OperationStatusBadge({ status }: { status: OperationStatus }) {
  return <span className={cn('badge', statusMap[status])}>{status}</span>
}
