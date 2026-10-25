import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTenant,
  deleteTenant,
  getOperationDetail,
  getTenantDetail,
  getTenantEvents,
  getTenantPullRequest,
  getTenantReadiness,
  healthCheck,
  listOperations,
  listTenantOperations,
  listTenants,
  retryTenant,
} from '@/lib/api'
import type {
  CreateTenantRequest,
  OperationStatus,
  OperationType,
  TenantStatus,
} from '@/types/ep04'
import {
  ACTIVE_OPERATION_STATUSES,
  ACTIVE_STATUSES,
  TERMINAL_OPERATION_STATUSES,
  TERMINAL_TENANT_STATUSES,
} from '@/constants/catalogs'

const POLLING_INTERVAL = 5_000

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: healthCheck,
    refetchInterval: 30_000,
  })
}

export function useTenants(params: {
  page: number
  size: number
  q?: string
  status?: TenantStatus | ''
}) {
  return useQuery({
    queryKey: ['tenants', params],
    queryFn: () => listTenants(params),
    placeholderData: (previousData) => previousData,
    refetchInterval: (query) => {
      const payload = query.state.data
      const hasActive = payload?.items?.some((item) => ACTIVE_STATUSES.includes(item.status))
      return hasActive ? POLLING_INTERVAL : false
    },
  })
}

export function useTenantDetail(tenantId: string) {
  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => getTenantDetail(tenantId),
    enabled: Boolean(tenantId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status) return POLLING_INTERVAL
      return TERMINAL_TENANT_STATUSES.includes(status) ? false : POLLING_INTERVAL
    },
  })
}

export function useTenantEvents(tenantId: string, shouldPoll = true) {
  return useQuery({
    queryKey: ['tenant-events', tenantId],
    queryFn: () => getTenantEvents(tenantId),
    enabled: Boolean(tenantId),
    refetchInterval: shouldPoll ? POLLING_INTERVAL : false,
  })
}

export function useTenantReadiness(tenantId: string, shouldPoll = true) {
  return useQuery({
    queryKey: ['tenant-readiness', tenantId],
    queryFn: () => getTenantReadiness(tenantId),
    enabled: Boolean(tenantId),
    refetchInterval: shouldPoll ? POLLING_INTERVAL : false,
  })
}

export function useTenantPullRequest(tenantId: string, shouldPoll = true) {
  return useQuery({
    queryKey: ['tenant-pull-request', tenantId],
    queryFn: () => getTenantPullRequest(tenantId),
    enabled: Boolean(tenantId),
    refetchInterval: shouldPoll ? POLLING_INTERVAL : false,
  })
}

export function useTenantOperations(
  tenantId: string,
  params: {
    page: number
    size: number
    status?: OperationStatus | ''
    type?: OperationType | ''
  },
  shouldPoll = true,
) {
  return useQuery({
    queryKey: ['tenant-operations', tenantId, params],
    queryFn: () => listTenantOperations(tenantId, params),
    enabled: Boolean(tenantId),
    placeholderData: (previousData) => previousData,
    refetchInterval: (query) => {
      if (!shouldPoll) return false
      const hasActive = query.state.data?.items?.some((item) =>
        ACTIVE_OPERATION_STATUSES.includes(item.status),
      )
      return hasActive ? POLLING_INTERVAL : false
    },
  })
}

export function useOperations(params: {
  page: number
  size: number
  status?: OperationStatus | ''
  type?: OperationType | ''
  tenantId?: string
}) {
  return useQuery({
    queryKey: ['operations', params],
    queryFn: () => listOperations(params),
    placeholderData: (previousData) => previousData,
    refetchInterval: (query) => {
      const hasActive = query.state.data?.items?.some((item) =>
        ACTIVE_OPERATION_STATUSES.includes(item.status),
      )
      return hasActive ? POLLING_INTERVAL : false
    },
  })
}

export function useOperationDetail(operationId: string, shouldPoll = true) {
  return useQuery({
    queryKey: ['operation', operationId],
    queryFn: () => getOperationDetail(operationId),
    enabled: Boolean(operationId),
    refetchInterval: (query) => {
      if (!shouldPoll) return false
      const status = query.state.data?.status
      if (!status) return POLLING_INTERVAL
      return TERMINAL_OPERATION_STATUSES.includes(status) ? false : POLLING_INTERVAL
    },
  })
}

export function useCreateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateTenantRequest) => createTenant(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tenants'] }),
        queryClient.invalidateQueries({ queryKey: ['operations'] }),
      ])
    },
  })
}

export function useRetryTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tenantId: string) => retryTenant(tenantId),
    onSuccess: async (_, tenantId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-events', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-readiness', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-pull-request', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-operations', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['operations'] }),
      ])
    },
  })
}

export function useDeleteTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tenantId: string) => deleteTenant(tenantId),
    onSuccess: async (_, tenantId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-events', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-readiness', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-pull-request', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-operations', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['tenants'] }),
        queryClient.invalidateQueries({ queryKey: ['operations'] }),
      ])
    },
  })
}
