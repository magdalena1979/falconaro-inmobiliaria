import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm, useWatch } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'
import {
  contractTemplates,
  getContractTemplate,
  type ContractDocumentData,
} from '../config/contractTemplates'
import { useTableRows } from '../hooks/useTableRows'
import type { JsonValue, ModuleDefinition, TableRow } from '../services/supabase/types'
import {
  buildContractPreview,
  downloadContractDocx,
  getContractFileName,
} from '../services/contracts/contractDocument'
import { createLocation } from '../services/locationService'
import { ContractIclDialog } from './ContractIclDialog'
import { EntityPage } from './EntityPage'

interface ContractsPageProps {
  module: ModuleDefinition
  ownersModule: ModuleDefinition
  clientsModule: ModuleDefinition
  tenantsModule: ModuleDefinition
  propertiesModule: ModuleDefinition
  propertyTypesModule: ModuleDefinition
  termsModule: ModuleDefinition
  currenciesModule: ModuleDefinition
  updateTypesModule: ModuleDefinition
  settingsModule: ModuleDefinition
}

const formSchema = z.object({
  templateId: z.string().min(1, 'Seleccioná una plantilla'),
  propiedadId: z.string().min(1, 'Seleccioná una propiedad'),
  propietarioId: z.string().min(1, 'El inmueble debe tener al menos un propietario'),
  inquilinoIds: z.array(z.string()).min(1, 'Seleccioná al menos un inquilino'),
  garanteIds: z.array(z.string()).min(1, 'Seleccioná al menos un garante'),
  plazoContratoId: z.string().min(1, 'Seleccioná un plazo'),
  monedaCobroId: z.string().min(1, 'Seleccioná una moneda'),
  tipoActualizacionValorId: z.string().min(1, 'Seleccioná un tipo de actualización'),
  locadorNombre: z.string().min(1, 'Completá el nombre'),
  locadorDni: z.string().min(1, 'Completá el DNI'),
  locadorCuit: z.string(),
  locadorDomicilio: z.string().min(1, 'Completá el domicilio'),
  locatarioNombre: z.string().min(1, 'Completá el nombre'),
  locatarioDni: z.string().min(1, 'Completá el DNI'),
  locatarioCuit: z.string(),
  locatarioDomicilio: z.string().min(1, 'Completá el domicilio'),
  garanteNombre: z.string().min(1, 'Completá el garante'),
  garanteDni: z.string().min(1, 'Completá el DNI del garante'),
  garanteDomicilio: z.string().min(1, 'Completá el domicilio del garante'),
  inmuebleTipo: z.string().min(1, 'Completá el tipo'),
  inmuebleDireccion: z.string().min(1, 'Completá la dirección'),
  partidaInmobiliaria: z.string(),
  superficieCubierta: z.string(),
  composicionInmueble: z.string().min(1, 'Completá la composición'),
  inventario: z.string(),
  estadoConservacion: z.string().min(1, 'Completá el estado'),
  destinoDetalle: z.string(),
  fechaInicio: z.string().min(1, 'Completá la fecha'),
  fechaFin: z.string().min(1, 'Completá la fecha'),
  plazoMeses: z.string().min(1, 'Completá el plazo'),
  moneda: z.string().min(1, 'Completá la moneda'),
  canonMensual: z.string().min(1, 'Completá el canon'),
  ajusteCadaMeses: z.string().min(1, 'Completá la frecuencia'),
  indiceAjuste: z.string().min(1, 'Completá el índice'),
  pagoDiaDesde: z.string().min(1, 'Completá el día'),
  pagoDiaHasta: z.string().min(1, 'Completá el día'),
  formaPago: z.string().min(1, 'Completá la forma de pago'),
  lugarPago: z.string().min(1, 'Completá el lugar de pago'),
  depositoGarantia: z.string().min(1, 'Completá el depósito'),
  penalidadDiaria: z.string().min(1, 'Completá la penalidad'),
  interesDiario: z.string().min(1, 'Completá el interés'),
  preavisoDias: z.string().min(1, 'Completá el preaviso'),
  rescisiónPorcentaje: z.string().min(1, 'Completá el porcentaje'),
  serviciosLocatario: z.string().min(1, 'Completá los servicios'),
  gastosLocador: z.string().min(1, 'Completá los gastos'),
  clausulasEspeciales: z.string(),
  ciudadFirma: z.string().min(1, 'Completá la ciudad'),
  fechaFirma: z.string().min(1, 'Completá la fecha'),
  cantidadEjemplares: z.string().min(1, 'Completá la cantidad'),
  administradorNombre: z.string().min(1, 'Completá el administrador'),
  administradorMatricula: z.string(),
  comisionPorcentaje: z.string().min(1, 'Ingresá el porcentaje de comisión'),
})

type ContractFormValues = z.infer<typeof formSchema>

const defaultValues: ContractFormValues = {
  templateId: 'vivienda_sin_expensas',
  propietarioId: '',
  propiedadId: '',
  inquilinoIds: [],
  garanteIds: [],
  plazoContratoId: '',
  monedaCobroId: '',
  tipoActualizacionValorId: '',
  locadorNombre: '',
  locadorDni: '',
  locadorCuit: '',
  locadorDomicilio: '',
  locatarioNombre: '',
  locatarioDni: '',
  locatarioCuit: '',
  locatarioDomicilio: '',
  garanteNombre: '',
  garanteDni: '',
  garanteDomicilio: '',
  inmuebleTipo: '',
  inmuebleDireccion: '',
  partidaInmobiliaria: '',
  superficieCubierta: '',
  composicionInmueble: '',
  inventario: '',
  estadoConservacion: 'Muy bueno',
  destinoDetalle: '',
  fechaInicio: '',
  fechaFin: '',
  plazoMeses: '12',
  moneda: '$',
  canonMensual: '',
  ajusteCadaMeses: '4',
  indiceAjuste: 'ICL (IPC + RIPTE)',
  pagoDiaDesde: '1',
  pagoDiaHasta: '10',
  formaPago: 'efectivo o transferencia',
  lugarPago: 'Falconaro Servicios Inmobiliarios',
  depositoGarantia: '',
  penalidadDiaria: '',
  interesDiario: '0.5',
  preavisoDias: '30',
  rescisiónPorcentaje: '10',
  serviciosLocatario: 'luz, agua, gas, teléfono, internet y cable',
  gastosLocador: 'ABL (Tasa Municipal) y ARBA',
  clausulasEspeciales: '',
  ciudadFirma: 'Azul',
  fechaFirma: new Date().toISOString().slice(0, 10),
  cantidadEjemplares: '4',
  administradorNombre: 'Diego A. Falconaro',
  administradorMatricula: 'MP 1467',
  comisionPorcentaje: '',
}

export function ContractsPage({
  module,
  ownersModule,
  clientsModule,
  tenantsModule,
  propertiesModule,
  propertyTypesModule,
  termsModule,
  currenciesModule,
  updateTypesModule,
  settingsModule,
}: ContractsPageProps) {
  const [tab, setTab] = useState(0)
  const [iclContractId, setIclContractId] = useState<string>()

  return (
    <Stack spacing={2}>
      <Tabs value={tab} onChange={(_, value) => setTab(value)}>
        <Tab label="Locaciones registradas" />
        <Tab label="Nueva locación" />
      </Tabs>
      {tab === 0 ? (
        <EntityPage
          module={module}
          renderRowActions={(row) => (
            <>
              <Button size="small" onClick={() => setIclContractId(String(row.id))}>
                Ajustes ICL
              </Button>
              <Button size="small" onClick={() => downloadSavedContract(row)}>
                Word
              </Button>
            </>
          )}
        />
      ) : (
        <ContractGenerator
          ownersModule={ownersModule}
          clientsModule={clientsModule}
          tenantsModule={tenantsModule}
          propertiesModule={propertiesModule}
          propertyTypesModule={propertyTypesModule}
          termsModule={termsModule}
          currenciesModule={currenciesModule}
          updateTypesModule={updateTypesModule}
          settingsModule={settingsModule}
        />
      )}
      <ContractIclDialog contractId={iclContractId} onClose={() => setIclContractId(undefined)} />
    </Stack>
  )

  async function downloadSavedContract(row: TableRow) {
    const snapshot = parseDocumentData(row.datos_documento)
    if (!snapshot) {
      window.alert('Este contrato no tiene una instantánea de plantilla para volver a generar el Word.')
      return
    }
    await downloadContractDocx(snapshot)
  }
}

function ContractGenerator({
  ownersModule,
  clientsModule,
  tenantsModule,
  propertiesModule,
  propertyTypesModule,
  termsModule,
  currenciesModule,
  updateTypesModule,
  settingsModule,
}: Omit<ContractsPageProps, 'module'>) {
  const ownersQuery = useTableRows(ownersModule.table)
  const clientsQuery = useTableRows(clientsModule.table)
  const tenantsQuery = useTableRows(tenantsModule.table)
  const propertiesQuery = useTableRows(propertiesModule.table)
  const propertyTypesQuery = useTableRows(propertyTypesModule.table)
  const termsQuery = useTableRows(termsModule.table)
  const currenciesQuery = useTableRows(currenciesModule.table)
  const updateTypesQuery = useTableRows(updateTypesModule.table)
  const settingsQuery = useTableRows(settingsModule.table)
  const queryClient = useQueryClient()
  const createMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['table-rows'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
    },
  })
  const [preview, setPreview] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const {
    control,
    getValues,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(formSchema) as Resolver<ContractFormValues>,
    defaultValues,
  })
  const templateId = useWatch({ control, name: 'templateId' })
  const selectedTemplate = getContractTemplate(templateId)
  const owners = useMemo(() => ownersQuery.data ?? [], [ownersQuery.data])
  const guarantors = useMemo(
    () => (clientsQuery.data ?? []).filter((row) => row.es_garante === true),
    [clientsQuery.data],
  )
  const tenants = useMemo(() => tenantsQuery.data ?? [], [tenantsQuery.data])
  const properties = useMemo(() => propertiesQuery.data ?? [], [propertiesQuery.data])
  const propertyTypes = useMemo(() => propertyTypesQuery.data ?? [], [propertyTypesQuery.data])
  const terms = useMemo(() => termsQuery.data ?? [], [termsQuery.data])
  const currencies = useMemo(() => currenciesQuery.data ?? [], [currenciesQuery.data])
  const updateTypes = useMemo(() => updateTypesQuery.data ?? [], [updateTypesQuery.data])
  const settings = useMemo(() => settingsQuery.data?.[0], [settingsQuery.data])
  const selectedPropertyId = useWatch({ control, name: 'propiedadId' })
  const selectedTenantIds = useWatch({ control, name: 'inquilinoIds' })
  const selectedGuarantorIds = useWatch({ control, name: 'garanteIds' })
  const selectedProperty = properties.find((row) => String(row.id) === selectedPropertyId)
  const linkedOwnerIds = ownerIdsForProperty(selectedProperty)
  const linkedOwners = owners.filter((row) => linkedOwnerIds.includes(String(row.id)))

  useEffect(() => {
    if (settings?.porcentaje_comision_default === undefined) return
    if (getValues('comisionPorcentaje')) return
    setValue('comisionPorcentaje', String(settings.porcentaje_comision_default), { shouldValidate: true })
  }, [getValues, setValue, settings])

  return (
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Typography variant="overline">Plantillas de contratos</Typography>
          <Typography variant="h4">Generar contrato</Typography>
          <Typography variant="body2" color="text.secondary">
            Seleccioná registros reales, revisá los datos legales y descargá el documento Word.
          </Typography>
        </Box>
      </Box>

      <Alert severity="warning">
        La plantilla reproduce la estructura de los modelos entregados. Antes de firmar, el texto debe ser revisado por el profesional legal de la inmobiliaria.
      </Alert>

      <Box className="contract-template-grid">
        {contractTemplates.map((template) => (
          <Card
            key={template.id}
            className={template.id === templateId ? 'contract-template-card selected' : 'contract-template-card'}
            onClick={() => setValue('templateId', template.id, { shouldValidate: true })}
          >
            <Stack spacing={1}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2">{template.name}</Typography>
                <Chip size="small" label={template.includesExpenses ? 'Con expensas' : 'Sin expensas'} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {template.description}
              </Typography>
            </Stack>
          </Card>
        ))}
      </Box>

      <Paper variant="outlined" className="contract-form-panel">
        <form onSubmit={handleSubmit(saveAndDownload)}>
          <Stack spacing={3}>
            <FormSection title="Inmueble y personas vinculadas" description="Elegí primero el inmueble. Sus propietarios se incorporan automáticamente.">
              <FormSelect
                control={control}
                error={errors.propiedadId?.message}
                label="Propiedad"
                name="propiedadId"
                options={properties.map((row) => ({ value: String(row.id), label: String(row.direccion ?? row.id) }))}
                onValueChange={(value) => applyProperty(properties.find((row) => String(row.id) === value))}
              />
              <PeopleSummary
                emptyMessage="El inmueble no tiene propietarios vinculados."
                people={linkedOwners}
                title="Propietarios vinculados"
              />
              <FormControl error={Boolean(errors.inquilinoIds)} fullWidth>
                <InputLabel id="location-tenants-label">Inquilinos</InputLabel>
                <Controller
                  control={control}
                  name="inquilinoIds"
                  render={({ field }) => (
                    <Select
                      {...field}
                      labelId="location-tenants-label"
                      label="Inquilinos"
                      multiple
                      renderValue={(selected) =>
                        tenants
                          .filter((tenant) => (selected as string[]).includes(String(tenant.id)))
                          .map(personLabel)
                          .join(' / ')
                      }
                      onChange={(event) => {
                        const ids = typeof event.target.value === 'string'
                          ? event.target.value.split(',')
                          : event.target.value
                        field.onChange(ids)
                        applyTenants(tenants.filter((tenant) => ids.includes(String(tenant.id))))
                      }}
                    >
                      {tenants.map((tenant) => {
                        const id = String(tenant.id)
                        return (
                          <MenuItem key={id} value={id}>
                            <Checkbox checked={selectedTenantIds.includes(id)} />
                            <ListItemText primary={personLabel(tenant)} />
                          </MenuItem>
                        )
                      })}
                    </Select>
                  )}
                />
                {errors.inquilinoIds?.message && (
                  <Typography variant="caption" color="error">{errors.inquilinoIds.message}</Typography>
                )}
              </FormControl>
              <PeopleSummary
                emptyMessage="Seleccioná uno o más inquilinos."
                people={tenants.filter((tenant) => selectedTenantIds.includes(String(tenant.id)))}
                title="Inquilinos seleccionados"
              />
              <FormControl error={Boolean(errors.garanteIds)} fullWidth>
                <InputLabel id="location-guarantors-label">Garantes</InputLabel>
                <Controller
                  control={control}
                  name="garanteIds"
                  render={({ field }) => (
                    <Select
                      {...field}
                      labelId="location-guarantors-label"
                      label="Garantes"
                      multiple
                      renderValue={(selected) =>
                        guarantors
                          .filter((guarantor) => (selected as string[]).includes(String(guarantor.id)))
                          .map(personLabel)
                          .join(' / ')
                      }
                      onChange={(event) => {
                        const ids = typeof event.target.value === 'string'
                          ? event.target.value.split(',')
                          : event.target.value
                        field.onChange(ids)
                        applyGuarantors(guarantors.filter((guarantor) => ids.includes(String(guarantor.id))))
                      }}
                    >
                      {guarantors.map((guarantor) => {
                        const id = String(guarantor.id)
                        return (
                          <MenuItem key={id} value={id}>
                            <Checkbox checked={selectedGuarantorIds.includes(id)} />
                            <ListItemText primary={personLabel(guarantor)} />
                          </MenuItem>
                        )
                      })}
                    </Select>
                  )}
                />
                {errors.garanteIds?.message && (
                  <Typography variant="caption" color="error">{errors.garanteIds.message}</Typography>
                )}
              </FormControl>
              <PeopleSummary
                emptyMessage="Seleccioná uno o más garantes."
                people={guarantors.filter((guarantor) => selectedGuarantorIds.includes(String(guarantor.id)))}
                title="Garantes seleccionados"
              />
              <FormSelect
                control={control}
                error={errors.plazoContratoId?.message}
                label="Plazo configurado"
                name="plazoContratoId"
                options={terms.map((row) => ({
                  value: String(row.id),
                  label: String(row.nombre ?? row.equivale ?? `${row.meses ?? row.dias ?? ''}`),
                }))}
                onValueChange={(value) => applyTerm(terms.find((row) => String(row.id) === value))}
              />
              <FormSelect
                control={control}
                error={errors.monedaCobroId?.message}
                label="Moneda de cobro"
                name="monedaCobroId"
                options={currencies.map((row) => ({
                  value: String(row.id),
                  label: [row.codigo, row.nombre].filter(Boolean).join(' - ') || String(row.id),
                }))}
                onValueChange={(value) => applyCurrency(currencies.find((row) => String(row.id) === value))}
              />
              <FormSelect
                control={control}
                error={errors.tipoActualizacionValorId?.message}
                label="Tipo de actualización"
                name="tipoActualizacionValorId"
                options={updateTypes.map((row) => ({
                  value: String(row.id),
                  label: String(row.nombre ?? row.id),
                }))}
                onValueChange={(value) => applyUpdateType(updateTypes.find((row) => String(row.id) === value))}
              />
            </FormSection>

            <FormSection title="Partes y garantía">
              <FormFields control={control} errors={errors} names={[
                ['locadorNombre', 'Nombre del locador'],
                ['locadorDni', 'DNI del locador'],
                ['locadorCuit', 'CUIT del locador'],
                ['locadorDomicilio', 'Domicilio del locador'],
                ['locatarioNombre', 'Nombre del locatario'],
                ['locatarioDni', 'DNI del locatario'],
                ['locatarioCuit', 'CUIT del locatario'],
                ['locatarioDomicilio', 'Domicilio del locatario'],
              ]} />
            </FormSection>

            <FormSection title="Inmueble y destino">
              <FormFields control={control} errors={errors} names={[
                ['inmuebleTipo', 'Tipo de inmueble'],
                ['inmuebleDireccion', 'Dirección'],
                ['partidaInmobiliaria', 'Partida inmobiliaria'],
                ['superficieCubierta', 'Superficie cubierta (m²)', 'number'],
                ['composicionInmueble', 'Composición y ambientes', 'textarea'],
                ['inventario', 'Inventario y accesorios', 'textarea'],
                ['estadoConservacion', 'Estado de conservación', 'textarea'],
                ['destinoDetalle', selectedTemplate.use === 'comercial' ? 'Rubro comercial' : 'Detalle del destino', 'textarea'],
              ]} />
            </FormSection>

            <FormSection title="Vigencia y valores">
              <FormFields control={control} errors={errors} names={[
                ['fechaInicio', 'Fecha de inicio', 'date'],
                ['fechaFin', 'Fecha de finalización', 'date'],
                ['plazoMeses', 'Plazo en meses', 'number'],
                ['moneda', 'Símbolo o código de moneda'],
                ['canonMensual', 'Canon mensual', 'number'],
                ['ajusteCadaMeses', 'Actualización cada (meses)', 'number'],
                ['indiceAjuste', 'Índice o criterio de actualización'],
                ['depositoGarantia', 'Depósito en garantía', 'number'],
                ['penalidadDiaria', 'Penalidad diaria', 'number'],
                ['interesDiario', 'Interés diario (%)', 'number'],
                ['comisionPorcentaje', 'Comisión inmobiliaria interna (%)', 'number'],
              ]} />
            </FormSection>

            <FormSection title="Pago, gastos y rescisión">
              <FormFields control={control} errors={errors} names={[
                ['pagoDiaDesde', 'Pago desde el día', 'number'],
                ['pagoDiaHasta', 'Pago hasta el día', 'number'],
                ['formaPago', 'Forma de pago'],
                ['lugarPago', 'Lugar o cuenta de pago'],
                ['serviciosLocatario', 'Servicios y gastos a cargo del locatario', 'textarea'],
                ['gastosLocador', 'Gastos a cargo del locador', 'textarea'],
                ['preavisoDias', 'Preaviso de rescisión (días)', 'number'],
                ['rescisiónPorcentaje', 'Penalidad por rescisión (%)', 'number'],
              ]} />
            </FormSection>

            <FormSection title="Firma y cláusulas">
              <FormFields control={control} errors={errors} names={[
                ['clausulasEspeciales', 'Cláusulas especiales', 'textarea'],
                ['ciudadFirma', 'Ciudad de firma'],
                ['fechaFirma', 'Fecha de firma', 'date'],
                ['cantidadEjemplares', 'Cantidad de ejemplares', 'number'],
                ['administradorNombre', 'Administrador'],
                ['administradorMatricula', 'Matrícula'],
              ]} />
            </FormSection>

            <Divider />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={() => setPreview(buildContractPreview(asDocumentData(getValues())))}>
                Vista previa
              </Button>
              <Button disabled={createMutation.isPending} type="submit" variant="contained">
                Guardar locación y descargar Word
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>

      {savedMessage && <Alert severity="success">{savedMessage}</Alert>}
      {createMutation.error && <Alert severity="error">{createMutation.error.message}</Alert>}

      {preview && (
        <Paper variant="outlined" className="contract-preview">
          <Typography variant="overline">Vista previa</Typography>
          <Typography component="pre">{preview}</Typography>
        </Paper>
      )}
    </Stack>
  )

  function applyProperty(row: TableRow | undefined) {
    if (!row) return
    const propertyOwnerIds = ownerIdsForProperty(row)
    const propertyOwners = owners.filter((owner) => propertyOwnerIds.includes(String(owner.id)))
    setValue('propietarioId', propertyOwnerIds[0] ?? '', { shouldValidate: true })
    setValue('locadorNombre', propertyOwners.map(personLabel).join(' / '))
    setValue('locadorDni', propertyOwners.map((owner) => String(owner.dni ?? '')).filter(Boolean).join(' / '))
    setValue('locadorCuit', propertyOwners.map((owner) => String(owner.cuit_empresa ?? '')).filter(Boolean).join(' / '))
    setValue('locadorDomicilio', propertyOwners.map(addressLabel).join(' / '))
    const propertyType = propertyTypes.find((type) => String(type.id) === String(row.tipo_propiedad_id))
    setValue('inmuebleTipo', String(propertyType?.nombre ?? propertyType?.tipo_propiedad ?? row.tipo_propiedad ?? ''))
    setValue('inmuebleDireccion', addressLabel(row))
    setValue('partidaInmobiliaria', String(row.partida_inmobiliaria ?? ''))
    setValue('superficieCubierta', String(row.superficie_cubierta ?? row.superficie_construida ?? ''))
    setValue('composicionInmueble', String(row.composicion ?? ''))
    setValue('inventario', String(row.inventario ?? ''))
    setValue('estadoConservacion', String(row.estado_conservacion ?? row.observaciones ?? 'Muy bueno'))
    const contractUse = row.destino_habilitado === 'comercial' ? 'comercial' : 'vivienda'
    const expensesSuffix = row.tiene_expensas ? 'con_expensas' : 'sin_expensas'
    setValue('templateId', `${contractUse}_${expensesSuffix}`, { shouldValidate: true })
    setValue(
      'clausulasEspeciales',
      [
        row.mascotas_permitidas ? 'Se permiten mascotas.' : 'No se permiten mascotas.',
        row.colores_pintura ? `El inmueble deberá devolverse pintado respetando estos colores: ${row.colores_pintura}.` : '',
        row.linea_telefonica_incluida ? 'El inmueble incluye línea telefónica.' : 'El inmueble no incluye línea telefónica.',
        row.restricciones_instalaciones ? `Restricciones de instalaciones: ${row.restricciones_instalaciones}.` : '',
        row.reglamento_copropiedad ? 'El locatario deberá respetar el reglamento de copropiedad.' : '',
      ].filter(Boolean).join('\n'),
    )
    if (row.monto_contrato) {
      setValue('canonMensual', String(row.monto_contrato))
      setValue('depositoGarantia', String(row.monto_contrato))
    } else if (row.canon_pretendido) {
      setValue('canonMensual', String(row.canon_pretendido))
      setValue('depositoGarantia', String(row.canon_pretendido))
    }
  }

  function applyTenants(rows: TableRow[]) {
    setValue('locatarioNombre', rows.map(personLabel).join(' / '))
    setValue('locatarioDni', rows.map((row) => String(row.dni ?? '')).filter(Boolean).join(' / '))
    setValue('locatarioCuit', rows.map((row) => String(row.cuit ?? '')).filter(Boolean).join(' / '))
    setValue('locatarioDomicilio', rows.map(addressLabel).join(' / '))
  }

  function applyGuarantors(rows: TableRow[]) {
    setValue('garanteNombre', rows.map(personLabel).join(' / '))
    setValue('garanteDni', rows.map((row) => String(row.dni ?? '')).filter(Boolean).join(' / '))
    setValue('garanteDomicilio', rows.map(addressLabel).join(' / '))
  }

  function applyTerm(row: TableRow | undefined) {
    if (!row) return
    const months = row.meses ?? (row.dias ? Math.round(Number(row.dias) / 30) : '')
    setValue('plazoMeses', String(months ?? ''))
  }

  function applyCurrency(row: TableRow | undefined) {
    if (!row) return
    setValue('moneda', String(row.simbolo ?? row.codigo ?? row.nombre ?? ''))
  }

  function applyUpdateType(row: TableRow | undefined) {
    if (!row) return
    setValue('indiceAjuste', String(row.nombre ?? ''))
  }

  async function saveAndDownload(values: ContractFormValues) {
    const documentData = asDocumentData(values)
    const content = buildContractPreview(documentData)
    const fileName = getContractFileName(documentData)
    const start = new Date(`${values.fechaInicio}T12:00:00`)
    const end = new Date(`${values.fechaFin}T12:00:00`)
    const plazoDias = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
    const initialAmount = numberOrNull(values.canonMensual)
    const adjustmentFrequency = numberOrNull(values.ajusteCadaMeses)
    const indexType = normalizeIndexType(values.indiceAjuste)
    const nextAdjustmentDate =
      indexType === 'ICL' && adjustmentFrequency
        ? addMonthsToDate(values.fechaInicio, adjustmentFrequency)
        : null

    const ownerIds = linkedOwnerIds
    createMutation.mutate(
      {
        ownerIds,
        tenantIds: values.inquilinoIds,
        guarantorIds: values.garanteIds,
        contract: {
        propiedad_id: values.propiedadId,
        propietario_id: ownerIds[0],
        inquilino_id: values.inquilinoIds[0],
        plazo_contrato_id: values.plazoContratoId,
        moneda_cobro_id: values.monedaCobroId,
        tipo_actualizacion_valor_id: values.tipoActualizacionValorId,
        fecha_inicio: values.fechaInicio,
        fecha_fin: values.fechaFin,
        fecha_locacion: values.fechaInicio,
        fecha_fin_contrato: values.fechaFin,
        plazo_dias: plazoDias,
        plazo_meses: numberOrNull(values.plazoMeses),
        dni_locador: numberOrNull(String(linkedOwners[0]?.dni ?? '')),
        dni_locatario: numberOrNull(String(tenants.find((tenant) => String(tenant.id) === values.inquilinoIds[0])?.dni ?? '')),
        plantilla_contrato: values.templateId,
        destino_locacion: values.destinoDetalle,
        canon_inicial: numberOrNull(values.canonMensual),
        monto_inicial: initialAmount,
        monto_actual: initialAmount,
        frecuencia_ajuste: adjustmentFrequency,
        tipo_indice: indexType,
        proxima_fecha_ajuste: nextAdjustmentDate,
        deposito_garantia: numberOrNull(values.depositoGarantia),
        incluye_expensas: getContractTemplate(values.templateId).includesExpenses,
        datos_documento: { ...documentData } as unknown as JsonValue,
        contenido_contrato: content,
        archivo_contrato: fileName,
        fecha_generacion: new Date().toISOString(),
        estado: 'borrador',
        porcentaje_comision_inmobiliaria: numberOrNull(values.comisionPorcentaje),
        },
      },
      {
        onSuccess: async () => {
          setPreview(content)
          await downloadContractDocx(documentData)
          setSavedMessage(`Locación guardada y contrato descargado: ${fileName}`)
        },
      },
    )
  }
}

interface FormSectionProps {
  title: string
  description?: string
  children: React.ReactNode
}

function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="h6">{title}</Typography>
        {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
      </Box>
      <Box className="contract-field-grid">{children}</Box>
    </Stack>
  )
}

function PeopleSummary({
  title,
  people,
  emptyMessage,
}: {
  title: string
  people: TableRow[]
  emptyMessage: string
}) {
  return (
    <Paper variant="outlined" className="location-people-summary">
      <Typography variant="caption" color="text.secondary">{title}</Typography>
      {people.length ? (
        <Stack spacing={0.75}>
          {people.map((person) => (
            <Box key={String(person.id)} className="location-person-row">
              <Typography variant="body2">{personLabel(person)}</Typography>
              <Typography variant="caption" color="text.secondary">
                DNI {String(person.dni ?? 'sin informar')}
              </Typography>
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">{emptyMessage}</Typography>
      )}
    </Paper>
  )
}

type FieldDefinition = [
  name: keyof ContractFormValues,
  label: string,
  kind?: 'text' | 'number' | 'date' | 'textarea',
]

function FormFields({
  control,
  errors,
  names,
}: {
  control: ReturnType<typeof useForm<ContractFormValues>>['control']
  errors: ReturnType<typeof useForm<ContractFormValues>>['formState']['errors']
  names: FieldDefinition[]
}) {
  return names.map(([name, label, kind = 'text']) => (
    <Controller
      key={name}
      control={control}
      name={name}
      render={({ field }) => (
        <TextField
          {...field}
          error={Boolean(errors[name])}
          helperText={errors[name]?.message}
          label={label}
          multiline={kind === 'textarea'}
          minRows={kind === 'textarea' ? 3 : undefined}
          type={kind === 'textarea' ? 'text' : kind}
        />
      )}
    />
  ))
}

function FormSelect({
  control,
  name,
  label,
  options,
  error,
  onValueChange,
}: {
  control: ReturnType<typeof useForm<ContractFormValues>>['control']
  name:
    | 'propiedadId'
    | 'plazoContratoId'
    | 'monedaCobroId'
    | 'tipoActualizacionValorId'
  label: string
  options: Array<{ value: string; label: string }>
  error?: string
  onValueChange: (value: string) => void
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <TextField
          {...field}
          error={Boolean(error)}
          helperText={error}
          label={label}
          select
          onChange={(event) => {
            field.onChange(event)
            onValueChange(event.target.value)
          }}
        >
          {options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  )
}

function asDocumentData(values: ContractFormValues): ContractDocumentData {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key]) =>
        ![
          'propietarioId',
          'inquilinoIds',
          'garanteIds',
          'propiedadId',
          'plazoContratoId',
          'monedaCobroId',
          'tipoActualizacionValorId',
          'comisionPorcentaje',
        ].includes(key),
    ),
  ) as unknown as ContractDocumentData
}

function personLabel(row: TableRow): string {
  return [row.apellidos, row.nombres].filter(Boolean).join(', ') || String(row.email ?? row.id ?? 'Registro')
}

function addressLabel(row: TableRow): string {
  return [row.direccion, row.ciudad, row.pais].filter(Boolean).join(', ')
}

function ownerIdsForProperty(row: TableRow | undefined): string[] {
  if (!row) return []
  const rawIds = row.titulares_ids
  if (Array.isArray(rawIds)) return rawIds.map(String)
  if (typeof rawIds === 'string') {
    try {
      const parsed = JSON.parse(rawIds)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      // Older properties can still use propietario_id.
    }
  }
  return row.propietario_id ? [String(row.propietario_id)] : []
}

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeIndexType(value: string): string {
  const normalized = value.trim().toUpperCase()
  if (normalized.includes('ICL')) return 'ICL'
  if (normalized.includes('IPC')) return 'IPC'
  if (normalized.includes('RIPTE')) return 'RIPTE'
  return normalized.slice(0, 20)
}

function addMonthsToDate(value: string, months: number): string {
  const [year, month, day] = value.split('-').map(Number)
  const targetMonth = month - 1 + months
  const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate()
  const target = new Date(Date.UTC(year, targetMonth, Math.min(day, lastDay)))
  return target.toISOString().slice(0, 10)
}

function parseDocumentData(value: TableRow[string]): ContractDocumentData | undefined {
  if (!value) return undefined
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as unknown as ContractDocumentData
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as ContractDocumentData
    } catch {
      return undefined
    }
  }
  return undefined
}
