import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ERP_TYPES, ENVIRONMENTS, INTEGRATION_MODES, MODULES_BY_ERP } from '@/constants/catalogs'
import { useCreateTenant } from '@/features/tenants/hooks'
import { ApiError } from '@/lib/api'
import { friendlyError } from '@/lib/error-messages'

const schema = z
  .object({
    tenantId: z.string().regex(/^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/, 'Formato invalido de tenantId'),
    companyName: z.string().min(2, 'Nombre requerido'),
    country: z.string().length(2, 'Usa codigo de pais de 2 letras').transform((v) => v.toUpperCase()),
    erpType: z.enum(ERP_TYPES),
    integrationMode: z.enum(INTEGRATION_MODES),
    environment: z.enum(ENVIRONMENTS),
    modules: z.array(z.string()).min(1, 'Selecciona al menos un modulo'),
    cpu: z
      .string()
      .regex(/^\d{1,2}$/, 'CPU invalido')
      .refine((value) => Number(value) >= 1 && Number(value) <= 16, 'CPU debe estar entre 1 y 16'),
    memory: z
      .string()
      .regex(/^\d{1,2}Gi$/, 'Memoria debe tener formato NGi')
      .refine((value) => {
        const amount = Number(value.replace('Gi', ''))
        return amount >= 1 && amount <= 64
      }, 'Memoria debe estar entre 1Gi y 64Gi'),
  })
  .superRefine((values, context) => {
    const supported = MODULES_BY_ERP[values.erpType] ?? []
    const invalidModules = values.modules.filter((m) => !supported.includes(m))
    if (invalidModules.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['modules'],
        message: `Modulos incompatibles para ${values.erpType}: ${invalidModules.join(', ')}`,
      })
    }
  })

type FormValues = z.infer<typeof schema>

export function CreateTenantPage() {
  const navigate = useNavigate()
  const mutation = useCreateTenant()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tenantId: '',
      companyName: '',
      country: 'CO',
      erpType: 'SAP_BUSINESS_ONE',
      integrationMode: 'API',
      environment: 'production',
      modules: ['integration'],
      cpu: '4',
      memory: '8Gi',
    },
  })

  const erpType = form.watch('erpType')
  const allowedModules = MODULES_BY_ERP[erpType] ?? []

  useEffect(() => {
    const current = form.getValues('modules')
    const next = current.filter((module) => allowedModules.includes(module))
    if (next.length === 0 && allowedModules.length > 0) {
      form.setValue('modules', [allowedModules[0]], { shouldValidate: true })
      return
    }
    if (next.length !== current.length) {
      form.setValue('modules', next, { shouldValidate: true })
    }
  }, [allowedModules, form])

  const submit = form.handleSubmit(async (values) => {
    const response = await mutation.mutateAsync({
      tenantId: values.tenantId,
      company: {
        name: values.companyName,
        country: values.country,
      },
      erp: {
        type: values.erpType,
        integrationMode: values.integrationMode,
      },
      environment: values.environment,
      modules: values.modules,
      resources: {
        cpu: values.cpu,
        memory: values.memory,
      },
    })

    navigate(`/tenants/${response.tenantId}?operationId=${response.operationId}`)
  })

  const apiError = mutation.error as ApiError | null

  return (
    <section className="stack-lg">
      <div className="page-head">
        <div>
          <h1>Crear tenant</h1>
          <p>Provisioning asincrono con validacion alineada al backend EP04.</p>
        </div>
      </div>

      <form className="panel form-grid" onSubmit={submit}>
        <label>
          Tenant ID
          <input {...form.register('tenantId')} placeholder="acme-co" />
          <small>{form.formState.errors.tenantId?.message}</small>
        </label>

        <label>
          Company name
          <input {...form.register('companyName')} placeholder="Acme Colombia" />
          <small>{form.formState.errors.companyName?.message}</small>
        </label>

        <label>
          Country
          <input {...form.register('country')} placeholder="CO" maxLength={2} />
          <small>{form.formState.errors.country?.message}</small>
        </label>

        <label>
          ERP
          <select {...form.register('erpType')}>
            {ERP_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <small>{form.formState.errors.erpType?.message}</small>
        </label>

        <label>
          Integration mode
          <select {...form.register('integrationMode')}>
            {INTEGRATION_MODES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <small>{form.formState.errors.integrationMode?.message}</small>
        </label>

        <label>
          Environment
          <select {...form.register('environment')}>
            {ENVIRONMENTS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <small>{form.formState.errors.environment?.message}</small>
        </label>

        <label>
          CPU
          <input {...form.register('cpu')} placeholder="4" />
          <small>{form.formState.errors.cpu?.message}</small>
        </label>

        <label>
          Memory
          <input {...form.register('memory')} placeholder="8Gi" />
          <small>{form.formState.errors.memory?.message}</small>
        </label>

        <fieldset className="modules-fieldset">
          <legend>Modules</legend>
          <div className="modules-list">
            {allowedModules.map((module) => {
              const checked = form.watch('modules').includes(module)
              return (
                <label key={module} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const current = form.getValues('modules')
                      if (event.target.checked) {
                        form.setValue('modules', [...new Set([...current, module])], {
                          shouldValidate: true,
                        })
                        return
                      }
                      form.setValue(
                        'modules',
                        current.filter((value) => value !== module),
                        { shouldValidate: true },
                      )
                    }}
                  />
                  {module}
                </label>
              )
            })}
          </div>
          <small>{form.formState.errors.modules?.message as string | undefined}</small>
        </fieldset>

        {apiError && <div className="error-box">{friendlyError(apiError.code, apiError.message)}</div>}

        <div className="actions-row">
          <button className="btn" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creando...' : 'Crear tenant'}
          </button>
        </div>
      </form>
    </section>
  )
}
