const map: Record<string, string> = {
  FORBIDDEN: 'No tienes permisos de administrador. Verifica X-Admin-Role.',
  TENANT_NOT_FOUND: 'El tenant no existe o fue eliminado.',
  OPERATION_NOT_FOUND: 'La operacion solicitada no existe.',
  DUPLICATE_TENANT: 'Ya existe un tenant con ese identificador.',
  OPERATION_IN_PROGRESS: 'Ya hay una operacion en progreso para este tenant.',
  RETRY_NOT_ALLOWED: 'No se permite retry en el estado actual.',
  IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST:
    'La llave de idempotencia ya fue usada con otro payload.',
  INVALID_PAGINATION: 'Parametros de paginacion invalidos.',
  INVALID_STATUS_FILTER: 'El filtro de estado no es valido.',
  INVALID_OPERATION_STATUS_FILTER: 'El filtro de estado de operacion no es valido.',
  INVALID_OPERATION_TYPE_FILTER: 'El filtro de tipo de operacion no es valido.',
  INVALID_IDEMPOTENCY_KEY: 'La llave de idempotencia no tiene un formato valido.',
  INVALID_TENANT_ID: 'El tenantId no cumple el formato requerido.',
  INVALID_ENVIRONMENT: 'El environment no es valido.',
  INVALID_ERP: 'El ERP no es valido.',
  UNSUPPORTED_ERP: 'El ERP no esta soportado actualmente.',
  INVALID_INTEGRATION_MODE: 'El modo de integracion no es valido.',
  INVALID_MODULES: 'Los modulos enviados no son validos.',
  INVALID_MODULES_FOR_ERP: 'Los modulos no son compatibles con el ERP seleccionado.',
  INVALID_CPU: 'El valor de CPU es invalido.',
  CPU_OUT_OF_RANGE: 'CPU fuera del rango permitido (1-16).',
  INVALID_MEMORY: 'El formato de memoria debe ser NGi (por ejemplo 8Gi).',
  MEMORY_OUT_OF_RANGE: 'Memoria fuera del rango permitido (1Gi-64Gi).',
  VALIDATION_ERROR: 'Hay datos invalidos en el formulario.',
  UNEXPECTED_ERROR: 'Ocurrio un error inesperado. Intenta de nuevo.',
}

export function friendlyError(code?: string, fallback?: string): string {
  if (!code) return fallback ?? 'No se pudo completar la operacion.'
  return map[code] ?? fallback ?? `Error ${code}`
}
