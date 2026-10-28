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
  PULL_REQUEST_NOT_FOUND: 'Este tenant todavía no tiene un Pull Request asociado.',
  STORAGE_DISABLED: 'El almacenamiento S3 no está habilitado en el backend.',
  STORAGE_NOT_READY: 'Las credenciales S3 estarán disponibles cuando el tenant esté listo.',
  TENANT_NOT_READY: 'El tenant aún no está listo para ejecutar una ingesta.',
  INGESTION_RUN_IN_PROGRESS: 'Ya hay una corrida de ingesta en curso. Espera a que termine.',
  INGESTION_NOT_PROVISIONED:
    'Este tenant no tiene la ingesta programada (tenant antiguo sin migrar). Contacta a plataforma.',
  INGESTION_LOGS_NOT_FOUND: 'El log de esta corrida ya no está disponible o aún no existe.',
  INVALID_RUN_NAME: 'El nombre de la corrida no es válido.',
  KUBERNETES_DISABLED: 'La integración con Kubernetes está deshabilitada en el backend.',
  KUBERNETES_FORBIDDEN: 'Faltan permisos del tenant en el clúster. Contacta a plataforma.',
  KUBERNETES_UNAVAILABLE: 'No se pudo consultar el clúster, intenta de nuevo.',
  KUBERNETES_ERROR: 'No se pudo consultar el clúster, intenta de nuevo.',
  KUBERNETES_BAD_RESPONSE: 'No se pudo consultar el clúster, intenta de nuevo.',
  UNEXPECTED_ERROR: 'Ocurrio un error inesperado. Intenta de nuevo.',
}

export function friendlyError(code?: string, fallback?: string): string {
  if (!code) return fallback ?? 'No se pudo completar la operacion.'
  return map[code] ?? fallback ?? `Error ${code}`
}
