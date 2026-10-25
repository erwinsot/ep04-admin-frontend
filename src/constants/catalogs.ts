import type { OperationStatus, OperationType, TenantStatus } from '@/types/ep04'

export const ENVIRONMENTS = ['dev', 'qa', 'production'] as const
export const INTEGRATION_MODES = ['API', 'FILE', 'HYBRID'] as const
export const ERP_TYPES = [
  'SAP_BUSINESS_ONE',
  'ODOO',
  'DYNAMICS_365',
  'NETSUITE',
  'SIIGO',
  'WORD_OFFICE',
] as const

export const MODULES = ['integration', 'analytics', 'monitoring'] as const

export const MODULES_BY_ERP: Record<string, string[]> = {
  SAP_BUSINESS_ONE: ['integration', 'analytics', 'monitoring'],
  ODOO: ['integration', 'monitoring'],
  DYNAMICS_365: ['integration', 'analytics'],
  NETSUITE: ['integration', 'analytics', 'monitoring'],
  SIIGO: ['integration', 'analytics'],
  WORD_OFFICE: ['integration', 'analytics', 'monitoring'],
}

export const TENANT_STATUSES: TenantStatus[] = [
  'PENDING',
  'VALIDATING',
  'PROVISIONING',
  'READY',
  'READY_FOR_INGESTION',
  'FAILED',
  'DELETING',
  'DELETED',
]

export const OPERATION_STATUSES: OperationStatus[] = [
  'PENDING',
  'VALIDATING',
  'PROVISIONING',
  'SUCCESS',
  'FAILED',
]

export const OPERATION_TYPES: OperationType[] = ['CREATE', 'RETRY', 'DELETE']

export const ACTIVE_STATUSES: TenantStatus[] = ['PENDING', 'VALIDATING', 'PROVISIONING', 'DELETING']

export const ACTIVE_OPERATION_STATUSES: OperationStatus[] = ['PENDING', 'VALIDATING', 'PROVISIONING']

export const TERMINAL_TENANT_STATUSES: TenantStatus[] = ['READY', 'READY_FOR_INGESTION', 'FAILED', 'DELETED']

export const TERMINAL_OPERATION_STATUSES: OperationStatus[] = ['SUCCESS', 'FAILED']
