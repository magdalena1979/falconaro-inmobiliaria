import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import type { FieldPath, Resolver } from 'react-hook-form'
import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { contractTemplates, getContractTemplate, type ContractDocumentData } from '../config/contractTemplates'
import { useTableRows } from '../hooks/useTableRows'
import {
  buildContractPreview,
  downloadContractDocx,
  getContractFileName,
} from '../services/contracts/contractDocument'
import { createLeaseWorkflow } from '../services/leaseWorkflow'
import type { ContractInput } from '../services/leaseWorkflow'
import type { ModuleDefinition, TableRow } from '../services/supabase/types'

interface LeaseWorkflowPageProps {
  ownersModule: ModuleDefinition
  tenantsModule: ModuleDefinition
  propertiesModule: ModuleDefinition
  propertyTypesModule: ModuleDefinition
  termsModule: ModuleDefinition
  currenciesModule: ModuleDefinition
  updateTypesModule: ModuleDefinition
}

const ownerSchema = z.object({
  nombres: z.string().min(1, 'Ingresá los nombres'),
  apellidos: z.string().min(1, 'Ingresá los apellidos'),
  dni: z.string().min(1, 'Ingresá el DNI'),
  cuit: z.string(),
  email: z.string().email('Email inválido').or(z.literal('')),
  telefono: z.string(),
  direccion: z.string().min(1, 'Ingresá el domicilio'),
  ciudad: z.string().min(1, 'Ingresá la ciudad'),
  cp: z.string().min(1, 'Ingresá el código postal'),
  pais: z.string().min(1, 'Ingresá el país'),
  porcentaje: z.string().min(1, 'Ingresá el porcentaje'),
})

const workflowSchema = z.object({
  owners: z.array(ownerSchema).min(1),
  property: z.object({
    tipoPropiedadId: z.string().min(1, 'Seleccioná el tipo'),
    tipoPropiedad: z.string(),
    direccion: z.string().min(1, 'Ingresá la dirección'),
    ciudad: z.string().min(1, 'Ingresá la ciudad'),
    cp: z.string(),
    pais: z.string(),
    partidaInmobiliaria: z.string(),
    superficieConstruida: z.string(),
    dormitorios: z.string(),
    banos: z.string(),
    composicion: z.string().min(1, 'Describí los ambientes'),
    inventario: z.string(),
    observaciones: z.string(),
    canonPretendido: z.string().min(1, 'Ingresá el alquiler pretendido'),
  }),
  tenant: z.object({
    nombres: z.string().min(1, 'Ingresá los nombres'),
    apellidos: z.string().min(1, 'Ingresá los apellidos'),
    dni: z.string().min(1, 'Ingresá el DNI'),
    cuit: z.string().min(1, 'Ingresá el CUIT'),
    email: z.string().email('Email inválido').or(z.literal('')),
    telefono: z.string().min(1, 'Ingresá el teléfono'),
    direccion: z.string().min(1, 'Ingresá el domicilio'),
    ciudad: z.string().min(1, 'Ingresá la ciudad'),
    cp: z.string().min(1, 'Ingresá el código postal'),
    pais: z.string().min(1, 'Ingresá el país'),
    garanteNombre: z.string().min(1, 'Ingresá el garante'),
    garanteApellidos: z.string().min(1, 'Ingresá los apellidos'),
    garanteDni: z.string().min(1, 'Ingresá el DNI del garante'),
    garanteCuit: z.string().min(1, 'Ingresá el CUIT del garante'),
    garanteTelefono: z.string().min(1, 'Ingresá el teléfono del garante'),
    garanteEmail: z.string().email('Email inválido').or(z.literal('')),
    garanteDomicilio: z.string().min(1, 'Ingresá el domicilio del garante'),
    garanteCiudad: z.string().min(1, 'Ingresá la ciudad del garante'),
    garanteCp: z.string().min(1, 'Ingresá el código postal del garante'),
    garantePais: z.string().min(1, 'Ingresá el país del garante'),
  }),
  contract: z.object({
    plantillaContrato: z.string().min(1),
    plazoContratoId: z.string().min(1, 'Seleccioná el plazo'),
    monedaCobroId: z.string().min(1, 'Seleccioná la moneda'),
    moneda: z.string(),
    tipoActualizacionValorId: z.string().min(1, 'Seleccioná la actualización'),
    fechaInicio: z.string().min(1, 'Ingresá la fecha inicial'),
    fechaFin: z.string().min(1, 'Ingresá la fecha final'),
    plazoMeses: z.string().min(1),
    canonMensual: z.string().min(1, 'Ingresá el canon acordado'),
    depositoGarantia: z.string().min(1, 'Ingresá el depósito'),
    ajusteCadaMeses: z.string().min(1),
    indiceAjuste: z.string().min(1),
    comisionInmobiliaria: z.string().min(1, 'Ingresá la comisión'),
    destinoDetalle: z.string(),
    penalidadDiaria: z.string().min(1, 'Ingresá la penalidad'),
    interesDiario: z.string().min(1),
    pagoDiaDesde: z.string().min(1),
    pagoDiaHasta: z.string().min(1),
    formaPago: z.string().min(1),
    lugarPago: z.string().min(1),
    serviciosLocatario: z.string().min(1),
    gastosLocador: z.string().min(1),
    preavisoDias: z.string().min(1),
    rescisionPorcentaje: z.string().min(1),
    clausulasEspeciales: z.string(),
    ciudadFirma: z.string().min(1),
    fechaFirma: z.string().min(1),
    administradorNombre: z.string().min(1),
    administradorMatricula: z.string(),
    incluyeExpensas: z.boolean(),
    permiteMascotas: z.boolean(),
    seguroObligatorio: z.boolean(),
    permiteSublocacion: z.boolean(),
    inspeccionesPermitidas: z.boolean(),
    inventarioAdjunto: z.boolean(),
    soloAireSplit: z.boolean(),
  }),
})

type WorkflowFormValues = z.infer<typeof workflowSchema>

const steps = ['Titulares', 'Inmueble y fotos', 'Interesado', 'Condiciones', 'Revisión']

const defaultValues: WorkflowFormValues = {
  owners: [
    {
      nombres: '',
      apellidos: '',
      dni: '',
      cuit: '',
      email: '',
      telefono: '',
      direccion: '',
      ciudad: 'Azul',
      cp: '',
      pais: 'Argentina',
      porcentaje: '100',
    },
  ],
  property: {
    tipoPropiedadId: '',
    tipoPropiedad: '',
    direccion: '',
    ciudad: 'Azul',
    cp: '',
    pais: 'Argentina',
    partidaInmobiliaria: '',
    superficieConstruida: '',
    dormitorios: '',
    banos: '',
    composicion: '',
    inventario: '',
    observaciones: '',
    canonPretendido: '',
  },
  tenant: {
    nombres: '',
    apellidos: '',
    dni: '',
    cuit: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: 'Azul',
    cp: '',
    pais: 'Argentina',
    garanteNombre: '',
    garanteApellidos: '',
    garanteDni: '',
    garanteCuit: '',
    garanteTelefono: '',
    garanteEmail: '',
    garanteDomicilio: '',
    garanteCiudad: 'Azul',
    garanteCp: '',
    garantePais: 'Argentina',
  },
  contract: {
    plantillaContrato: 'vivienda_sin_expensas',
    plazoContratoId: '',
    monedaCobroId: '',
    moneda: '$',
    tipoActualizacionValorId: '',
    fechaInicio: '',
    fechaFin: '',
    plazoMeses: '12',
    canonMensual: '',
    depositoGarantia: '',
    ajusteCadaMeses: '4',
    indiceAjuste: 'ICL (IPC + RIPTE)',
    comisionInmobiliaria: '',
    destinoDetalle: '',
    penalidadDiaria: '',
    interesDiario: '0.5',
    pagoDiaDesde: '1',
    pagoDiaHasta: '10',
    formaPago: 'Efectivo o transferencia',
    lugarPago: 'Falconaro Servicios Inmobiliarios',
    serviciosLocatario: 'Luz, agua, gas, teléfono, internet y cable',
    gastosLocador: 'ABL (Tasa Municipal) y ARBA',
    preavisoDias: '30',
    rescisionPorcentaje: '10',
    clausulasEspeciales: '',
    ciudadFirma: 'Azul',
    fechaFirma: new Date().toISOString().slice(0, 10),
    administradorNombre: 'Diego A. Falconaro',
    administradorMatricula: 'MP 1467',
    incluyeExpensas: false,
    permiteMascotas: false,
    seguroObligatorio: true,
    permiteSublocacion: false,
    inspeccionesPermitidas: true,
    inventarioAdjunto: true,
    soloAireSplit: false,
  },
}

export function LeaseWorkflowPage({
  propertyTypesModule,
  termsModule,
  currenciesModule,
  updateTypesModule,
}: LeaseWorkflowPageProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoError, setPhotoError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const propertyTypesQuery = useTableRows(propertyTypesModule.table)
  const termsQuery = useTableRows(termsModule.table)
  const currenciesQuery = useTableRows(currenciesModule.table)
  const updateTypesQuery = useTableRows(updateTypesModule.table)
  const {
    control,
    register,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowSchema) as Resolver<WorkflowFormValues>,
    defaultValues,
  })
  const ownersArray = useFieldArray({ control, name: 'owners' })
  const values = useWatch({ control }) as WorkflowFormValues
  const selectedTemplate = getContractTemplate(values.contract.plantillaContrato)
  const previewUrls = useMemo(() => photos.map((photo) => URL.createObjectURL(photo)), [photos])

  useEffect(
    () => () => previewUrls.forEach((url) => URL.revokeObjectURL(url)),
    [previewUrls],
  )

  return (
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Typography variant="overline">Operación guiada</Typography>
          <Typography variant="h4">Nueva locación</Typography>
          <Typography variant="body2" color="text.secondary">
            Desde la captación del inmueble hasta el contrato Word editable.
          </Typography>
        </Box>
        <Chip label={`Paso ${activeStep + 1} de ${steps.length}`} />
      </Box>

      <Paper variant="outlined" className="lease-stepper-panel">
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((step) => (
            <Step key={step}>
              <StepLabel>{step}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      <Paper variant="outlined" className="lease-workflow-panel">
        {activeStep === 0 && (
          <Stack spacing={2}>
            <SectionHeading
              title="Titulares del inmueble"
              description="Cargá uno o más propietarios y el porcentaje que corresponde a cada uno."
            />
            {ownersArray.fields.map((owner, index) => (
              <Box key={owner.id} className="lease-owner-block">
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2">Titular {index + 1}</Typography>
                  {ownersArray.fields.length > 1 && (
                    <IconButton aria-label={`Quitar titular ${index + 1}`} onClick={() => ownersArray.remove(index)}>
                      ×
                    </IconButton>
                  )}
                </Stack>
                <Box className="lease-field-grid">
                  <TextField label="Nombres" {...register(`owners.${index}.nombres`)} error={Boolean(errors.owners?.[index]?.nombres)} helperText={errors.owners?.[index]?.nombres?.message} />
                  <TextField label="Apellidos" {...register(`owners.${index}.apellidos`)} error={Boolean(errors.owners?.[index]?.apellidos)} helperText={errors.owners?.[index]?.apellidos?.message} />
                  <TextField label="DNI" {...register(`owners.${index}.dni`)} error={Boolean(errors.owners?.[index]?.dni)} helperText={errors.owners?.[index]?.dni?.message} />
                  <TextField label="CUIT" {...register(`owners.${index}.cuit`)} />
                  <TextField label="Email" type="email" {...register(`owners.${index}.email`)} error={Boolean(errors.owners?.[index]?.email)} helperText={errors.owners?.[index]?.email?.message} />
                  <TextField label="Teléfono" {...register(`owners.${index}.telefono`)} />
                  <TextField label="Domicilio" {...register(`owners.${index}.direccion`)} error={Boolean(errors.owners?.[index]?.direccion)} helperText={errors.owners?.[index]?.direccion?.message} />
                  <TextField label="Ciudad" {...register(`owners.${index}.ciudad`)} error={Boolean(errors.owners?.[index]?.ciudad)} helperText={errors.owners?.[index]?.ciudad?.message} />
                  <TextField label="Código postal" {...register(`owners.${index}.cp`)} error={Boolean(errors.owners?.[index]?.cp)} helperText={errors.owners?.[index]?.cp?.message} />
                  <TextField label="País" {...register(`owners.${index}.pais`)} error={Boolean(errors.owners?.[index]?.pais)} helperText={errors.owners?.[index]?.pais?.message} />
                  <TextField label="Porcentaje de titularidad" type="number" {...register(`owners.${index}.porcentaje`)} error={Boolean(errors.owners?.[index]?.porcentaje)} helperText={errors.owners?.[index]?.porcentaje?.message} />
                </Box>
              </Box>
            ))}
            <Button
              variant="outlined"
              onClick={() =>
                ownersArray.append({
                  nombres: '',
                  apellidos: '',
                  dni: '',
                  cuit: '',
                  email: '',
                  telefono: '',
                  direccion: '',
                  ciudad: 'Azul',
                  cp: '',
                  pais: 'Argentina',
                  porcentaje: '0',
                })
              }
            >
              Agregar otro titular
            </Button>
            {ownerPercentage(values.owners) !== 100 && (
              <Alert severity="warning">Los porcentajes de titularidad deben sumar 100%. Actualmente suman {ownerPercentage(values.owners)}%.</Alert>
            )}
          </Stack>
        )}

        {activeStep === 1 && (
          <Stack spacing={3}>
            <SectionHeading
              title="Datos del inmueble"
              description="El alquiler pretendido queda registrado como referencia del propietario."
            />
            <Box className="lease-field-grid">
              <TextField
                label="Tipo de propiedad"
                select
                value={values.property.tipoPropiedadId}
                onChange={(event) => {
                  const row = (propertyTypesQuery.data ?? []).find((item) => String(item.id) === event.target.value)
                  setValue('property.tipoPropiedadId', event.target.value, { shouldValidate: true })
                  setValue('property.tipoPropiedad', String(row?.nombre ?? row?.tipo_propiedad ?? ''))
                }}
                error={Boolean(errors.property?.tipoPropiedadId)}
                helperText={errors.property?.tipoPropiedadId?.message}
              >
                {(propertyTypesQuery.data ?? []).map((row) => (
                  <MenuItem key={String(row.id)} value={String(row.id)}>{String(row.nombre ?? row.tipo_propiedad ?? row.id)}</MenuItem>
                ))}
              </TextField>
              <TextField label="Dirección" {...register('property.direccion')} error={Boolean(errors.property?.direccion)} helperText={errors.property?.direccion?.message} />
              <TextField label="Ciudad" {...register('property.ciudad')} error={Boolean(errors.property?.ciudad)} helperText={errors.property?.ciudad?.message} />
              <TextField label="Código postal" {...register('property.cp')} />
              <TextField label="País" {...register('property.pais')} />
              <TextField label="Partida inmobiliaria" {...register('property.partidaInmobiliaria')} />
              <TextField label="Superficie cubierta (m²)" type="number" {...register('property.superficieConstruida')} />
              <TextField label="Dormitorios" type="number" {...register('property.dormitorios')} />
              <TextField label="Baños" type="number" {...register('property.banos')} />
              <TextField className="lease-wide-field" label="Composición y ambientes" multiline minRows={3} {...register('property.composicion')} error={Boolean(errors.property?.composicion)} helperText={errors.property?.composicion?.message} />
              <TextField className="lease-wide-field" label="Inventario y accesorios" multiline minRows={3} {...register('property.inventario')} />
              <TextField className="lease-wide-field" label="Estado y observaciones" multiline minRows={3} {...register('property.observaciones')} />
              <TextField label="Alquiler pretendido" type="number" {...register('property.canonPretendido')} error={Boolean(errors.property?.canonPretendido)} helperText={errors.property?.canonPretendido?.message} />
            </Box>

            <Divider />
            <SectionHeading
              title="Fotos del inmueble"
              description="Seleccioná exactamente 5 imágenes JPG, PNG o WebP. Se guardarán en Supabase Storage."
            />
            <Button component="label" variant="outlined">
              Seleccionar 5 fotos
              <input
                hidden
                accept="image/jpeg,image/png,image/webp"
                multiple
                type="file"
                onChange={(event) => selectPhotos(Array.from(event.target.files ?? []))}
              />
            </Button>
            {photoError && <Alert severity="error">{photoError}</Alert>}
            <Box className="lease-photo-grid">
              {previewUrls.map((url, index) => (
                <Box key={url} className="lease-photo-preview">
                  <Box component="img" src={url} alt={`Foto ${index + 1} del inmueble`} />
                  <Typography variant="caption">Foto {index + 1}</Typography>
                </Box>
              ))}
            </Box>
          </Stack>
        )}

        {activeStep === 2 && (
          <Stack spacing={2}>
            <SectionHeading
              title="Interesado e información de garantía"
              description="Estos datos crearán el registro real del locatario."
            />
            <Box className="lease-field-grid">
              <TextField label="Nombres" {...register('tenant.nombres')} error={Boolean(errors.tenant?.nombres)} helperText={errors.tenant?.nombres?.message} />
              <TextField label="Apellidos" {...register('tenant.apellidos')} error={Boolean(errors.tenant?.apellidos)} helperText={errors.tenant?.apellidos?.message} />
              <TextField label="DNI" {...register('tenant.dni')} error={Boolean(errors.tenant?.dni)} helperText={errors.tenant?.dni?.message} />
              <TextField label="CUIT" {...register('tenant.cuit')} error={Boolean(errors.tenant?.cuit)} helperText={errors.tenant?.cuit?.message} />
              <TextField label="Email" type="email" {...register('tenant.email')} error={Boolean(errors.tenant?.email)} helperText={errors.tenant?.email?.message} />
              <TextField label="Teléfono" {...register('tenant.telefono')} error={Boolean(errors.tenant?.telefono)} helperText={errors.tenant?.telefono?.message} />
              <TextField label="Domicilio actual" {...register('tenant.direccion')} error={Boolean(errors.tenant?.direccion)} helperText={errors.tenant?.direccion?.message} />
              <TextField label="Ciudad" {...register('tenant.ciudad')} error={Boolean(errors.tenant?.ciudad)} helperText={errors.tenant?.ciudad?.message} />
              <TextField label="Código postal" {...register('tenant.cp')} error={Boolean(errors.tenant?.cp)} helperText={errors.tenant?.cp?.message} />
              <TextField label="País" {...register('tenant.pais')} error={Boolean(errors.tenant?.pais)} helperText={errors.tenant?.pais?.message} />
              <TextField label="Nombres del garante" {...register('tenant.garanteNombre')} error={Boolean(errors.tenant?.garanteNombre)} helperText={errors.tenant?.garanteNombre?.message} />
              <TextField label="Apellidos del garante" {...register('tenant.garanteApellidos')} error={Boolean(errors.tenant?.garanteApellidos)} helperText={errors.tenant?.garanteApellidos?.message} />
              <TextField label="DNI del garante" {...register('tenant.garanteDni')} error={Boolean(errors.tenant?.garanteDni)} helperText={errors.tenant?.garanteDni?.message} />
              <TextField label="CUIT del garante" {...register('tenant.garanteCuit')} error={Boolean(errors.tenant?.garanteCuit)} helperText={errors.tenant?.garanteCuit?.message} />
              <TextField label="Teléfono del garante" {...register('tenant.garanteTelefono')} error={Boolean(errors.tenant?.garanteTelefono)} helperText={errors.tenant?.garanteTelefono?.message} />
              <TextField label="Email del garante" type="email" {...register('tenant.garanteEmail')} error={Boolean(errors.tenant?.garanteEmail)} helperText={errors.tenant?.garanteEmail?.message} />
              <TextField label="Domicilio del garante" {...register('tenant.garanteDomicilio')} error={Boolean(errors.tenant?.garanteDomicilio)} helperText={errors.tenant?.garanteDomicilio?.message} />
              <TextField label="Ciudad del garante" {...register('tenant.garanteCiudad')} error={Boolean(errors.tenant?.garanteCiudad)} helperText={errors.tenant?.garanteCiudad?.message} />
              <TextField label="Código postal del garante" {...register('tenant.garanteCp')} error={Boolean(errors.tenant?.garanteCp)} helperText={errors.tenant?.garanteCp?.message} />
              <TextField label="País del garante" {...register('tenant.garantePais')} error={Boolean(errors.tenant?.garantePais)} helperText={errors.tenant?.garantePais?.message} />
            </Box>
          </Stack>
        )}

        {activeStep === 3 && (
          <Stack spacing={3}>
            <SectionHeading
              title="Condiciones acordadas"
              description="Los selectores y checks determinan qué texto tendrá el contrato."
            />
            <Box className="contract-template-grid">
              {contractTemplates.map((template) => (
                <Paper
                  key={template.id}
                  variant="outlined"
                  className={template.id === values.contract.plantillaContrato ? 'contract-template-card selected' : 'contract-template-card'}
                  onClick={() => {
                    setValue('contract.plantillaContrato', template.id)
                    setValue('contract.incluyeExpensas', template.includesExpenses)
                  }}
                >
                  <Typography variant="subtitle2">{template.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{template.description}</Typography>
                </Paper>
              ))}
            </Box>
            <Box className="lease-field-grid">
              <CatalogSelect
                label="Plazo"
                value={values.contract.plazoContratoId}
                rows={termsQuery.data ?? []}
                labelFor={(row) => String(row.nombre ?? row.equivale ?? `${row.meses ?? ''} meses`)}
                error={errors.contract?.plazoContratoId?.message}
                onChange={(row) => {
                  setValue('contract.plazoContratoId', String(row.id), { shouldValidate: true })
                  const months = row.meses ?? (row.dias ? Math.round(Number(row.dias) / 30) : '')
                  setValue('contract.plazoMeses', String(months))
                }}
              />
              <CatalogSelect
                label="Moneda"
                value={values.contract.monedaCobroId}
                rows={currenciesQuery.data ?? []}
                labelFor={(row) => [row.codigo, row.nombre].filter(Boolean).join(' - ')}
                error={errors.contract?.monedaCobroId?.message}
                onChange={(row) => {
                  setValue('contract.monedaCobroId', String(row.id), { shouldValidate: true })
                  setValue('contract.moneda', String(row.simbolo ?? row.codigo ?? row.nombre ?? '$'))
                }}
              />
              <CatalogSelect
                label="Actualización"
                value={values.contract.tipoActualizacionValorId}
                rows={updateTypesQuery.data ?? []}
                labelFor={(row) => String(row.nombre ?? row.id)}
                error={errors.contract?.tipoActualizacionValorId?.message}
                onChange={(row) => {
                  setValue('contract.tipoActualizacionValorId', String(row.id), { shouldValidate: true })
                  setValue('contract.indiceAjuste', String(row.nombre ?? ''))
                }}
              />
              <TextField label="Fecha de inicio" type="date" slotProps={{ inputLabel: { shrink: true } }} {...register('contract.fechaInicio')} error={Boolean(errors.contract?.fechaInicio)} helperText={errors.contract?.fechaInicio?.message} />
              <TextField label="Fecha de finalización" type="date" slotProps={{ inputLabel: { shrink: true } }} {...register('contract.fechaFin')} error={Boolean(errors.contract?.fechaFin)} helperText={errors.contract?.fechaFin?.message} />
              <TextField label="Canon mensual acordado" type="number" {...register('contract.canonMensual')} error={Boolean(errors.contract?.canonMensual)} helperText={errors.contract?.canonMensual?.message} />
              <TextField label="Depósito en garantía" type="number" {...register('contract.depositoGarantia')} error={Boolean(errors.contract?.depositoGarantia)} helperText={errors.contract?.depositoGarantia?.message} />
              <TextField label="Actualización cada (meses)" type="number" {...register('contract.ajusteCadaMeses')} />
              <TextField label="Comisión inmobiliaria" type="number" {...register('contract.comisionInmobiliaria')} error={Boolean(errors.contract?.comisionInmobiliaria)} helperText={errors.contract?.comisionInmobiliaria?.message} />
              <TextField label={selectedTemplate.use === 'comercial' ? 'Rubro comercial' : 'Destino y ocupantes'} {...register('contract.destinoDetalle')} />
              <TextField label="Penalidad diaria" type="number" {...register('contract.penalidadDiaria')} error={Boolean(errors.contract?.penalidadDiaria)} helperText={errors.contract?.penalidadDiaria?.message} />
              <TextField label="Interés diario (%)" type="number" {...register('contract.interesDiario')} />
              <TextField label="Paga desde el día" type="number" {...register('contract.pagoDiaDesde')} />
              <TextField label="Paga hasta el día" type="number" {...register('contract.pagoDiaHasta')} />
              <TextField label="Forma de pago" {...register('contract.formaPago')} />
              <TextField label="Lugar o cuenta de pago" {...register('contract.lugarPago')} />
              <TextField className="lease-wide-field" label="Servicios a cargo del locatario" multiline minRows={2} {...register('contract.serviciosLocatario')} />
              <TextField className="lease-wide-field" label="Gastos a cargo del locador" multiline minRows={2} {...register('contract.gastosLocador')} />
              <TextField label="Preaviso (días)" type="number" {...register('contract.preavisoDias')} />
              <TextField label="Penalidad por rescisión (%)" type="number" {...register('contract.rescisionPorcentaje')} />
              <TextField label="Ciudad de firma" {...register('contract.ciudadFirma')} />
              <TextField label="Fecha de firma" type="date" slotProps={{ inputLabel: { shrink: true } }} {...register('contract.fechaFirma')} />
              <TextField className="lease-wide-field" label="Cláusulas especiales" multiline minRows={3} {...register('contract.clausulasEspeciales')} />
            </Box>
            <Box className="lease-checkbox-grid">
              <ConditionCheck control={control} name="contract.incluyeExpensas" label="Tiene expensas" />
              <ConditionCheck control={control} name="contract.permiteMascotas" label="Permite mascotas" />
              <ConditionCheck control={control} name="contract.seguroObligatorio" label="Seguro obligatorio" />
              <ConditionCheck control={control} name="contract.permiteSublocacion" label="Permite sublocación" />
              <ConditionCheck control={control} name="contract.inspeccionesPermitidas" label="Permite inspecciones coordinadas" />
              <ConditionCheck control={control} name="contract.inventarioAdjunto" label="Inventario como anexo" />
              <ConditionCheck control={control} name="contract.soloAireSplit" label="Sólo aire acondicionado Split" />
            </Box>
          </Stack>
        )}

        {activeStep === 4 && (
          <Stack spacing={3}>
            <SectionHeading
              title="Revisar y generar"
              description="Al confirmar se crearán todos los registros y se descargará un Word editable."
            />
            <Box className="lease-review-grid">
              <ReviewBlock title="Titulares" lines={values.owners.map((owner) => `${owner.apellidos}, ${owner.nombres} - ${owner.porcentaje}%`)} />
              <ReviewBlock title="Inmueble" lines={[`${values.property.tipoPropiedad} - ${values.property.direccion}`, `Alquiler pretendido: ${values.property.canonPretendido}`, `${photos.length} fotos listas`]} />
              <ReviewBlock title="Interesado" lines={[`${values.tenant.apellidos}, ${values.tenant.nombres}`, `DNI ${values.tenant.dni}`, `Garante: ${values.tenant.garanteApellidos}, ${values.tenant.garanteNombre}`]} />
              <ReviewBlock title="Contrato" lines={[selectedTemplate.name, `${values.contract.fechaInicio} a ${values.contract.fechaFin}`, `Canon acordado: ${values.contract.canonMensual}`, `Comisión: ${values.contract.comisionInmobiliaria}`]} />
            </Box>
            <Paper variant="outlined" className="contract-preview compact">
              <Typography component="pre">{buildContractPreview(buildDocumentData(values))}</Typography>
            </Paper>
            <Alert severity="warning">
              El Word queda editable para ajustes posteriores. Antes de la firma debe revisarse el contenido legal definitivo.
            </Alert>
          </Stack>
        )}

        <Divider sx={{ my: 3 }} />
        {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
        {resultMessage && <Alert severity="success" sx={{ mb: 2 }}>{resultMessage}</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
          <Button disabled={activeStep === 0 || isSaving} onClick={() => setActiveStep((step) => step - 1)}>
            Atrás
          </Button>
          {activeStep < steps.length - 1 ? (
            <Button variant="contained" onClick={nextStep}>Continuar</Button>
          ) : (
            <Button disabled={isSaving || Boolean(resultMessage)} variant="contained" onClick={handleSubmit(saveWorkflow)}>
              {isSaving ? 'Creando operación...' : 'Crear operación y descargar Word'}
            </Button>
          )}
        </Stack>
      </Paper>
    </Stack>
  )

  async function nextStep() {
    setSaveError('')
    const fieldGroups: Array<FieldPath<WorkflowFormValues>[]> = [
      ['owners'],
      ['property'],
      ['tenant'],
      ['contract'],
    ]
    const valid = await trigger(fieldGroups[activeStep])
    if (!valid) return
    if (activeStep === 0 && ownerPercentage(values.owners) !== 100) {
      setSaveError('Los porcentajes de los titulares deben sumar exactamente 100%.')
      return
    }
    if (activeStep === 1 && photos.length !== 5) {
      setPhotoError('Debés seleccionar exactamente 5 fotos del inmueble.')
      return
    }
    setActiveStep((step) => step + 1)
  }

  function selectPhotos(selected: File[]) {
    if (selected.length !== 5) {
      setPhotos(selected.slice(0, 5))
      setPhotoError('Debés seleccionar exactamente 5 fotos.')
      return
    }
    const oversized = selected.find((file) => file.size > 10 * 1024 * 1024)
    if (oversized) {
      setPhotoError(`La foto ${oversized.name} supera los 10 MB.`)
      return
    }
    setPhotos(selected)
    setPhotoError('')
  }

  async function saveWorkflow(formValues: WorkflowFormValues) {
    setIsSaving(true)
    setSaveError('')
    try {
      const documentData = buildDocumentData(formValues)
      const contractContent = buildContractPreview(documentData)
      const contractFileName = getContractFileName(documentData)
      const result = await createLeaseWorkflow({
        owners: formValues.owners.map((owner) => ({ ...owner, porcentaje: Number(owner.porcentaje) })),
        property: formValues.property,
        tenant: formValues.tenant,
        contract: pickContractInput(formValues),
        documentData,
        contractContent,
        contractFileName,
        photos,
      })
      try {
        await downloadContractDocx(documentData)
        setResultMessage(`Operación creada. Contrato ${result.contractId} guardado como borrador y Word descargado.`)
      } catch {
        setResultMessage(`Operación creada y contrato ${result.contractId} guardado como borrador. No se pudo iniciar la descarga del Word; puede generarse nuevamente desde Contratos.`)
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo crear la operación.')
    } finally {
      setIsSaving(false)
    }
  }
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <Box>
      <Typography variant="h6">{title}</Typography>
      <Typography variant="body2" color="text.secondary">{description}</Typography>
    </Box>
  )
}

function CatalogSelect({
  label,
  value,
  rows,
  labelFor,
  error,
  onChange,
}: {
  label: string
  value: string
  rows: TableRow[]
  labelFor: (row: TableRow) => string
  error?: string
  onChange: (row: TableRow) => void
}) {
  return (
    <TextField
      label={label}
      select
      value={value}
      error={Boolean(error)}
      helperText={error}
      onChange={(event) => {
        const row = rows.find((item) => String(item.id) === event.target.value)
        if (row) onChange(row)
      }}
    >
      {rows.map((row) => (
        <MenuItem key={String(row.id)} value={String(row.id)}>{labelFor(row)}</MenuItem>
      ))}
    </TextField>
  )
}

function ConditionCheck({
  control,
  name,
  label,
}: {
  control: ReturnType<typeof useForm<WorkflowFormValues>>['control']
  name: FieldPath<WorkflowFormValues>
  label: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormControlLabel
          control={<Checkbox checked={Boolean(field.value)} onChange={(_, checked) => field.onChange(checked)} />}
          label={label}
        />
      )}
    />
  )
}

function ReviewBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <Box className="lease-review-block">
      <Typography variant="subtitle2">{title}</Typography>
      {lines.map((line) => <Typography key={line} variant="body2" color="text.secondary">{line}</Typography>)}
    </Box>
  )
}

function buildDocumentData(values: WorkflowFormValues): ContractDocumentData {
  const ownerNames = values.owners.map((owner) => `${owner.apellidos}, ${owner.nombres}`).join(' y ')
  const ownerDnis = values.owners.map((owner) => owner.dni).join(' / ')
  const ownerCuits = values.owners.map((owner) => owner.cuit).filter(Boolean).join(' / ')
  const ownerAddresses = values.owners.map((owner) => `${owner.direccion}, ${owner.ciudad}`).join(' / ')
  const clauses = [
    values.contract.permiteMascotas ? 'Se permiten mascotas.' : 'No se permiten mascotas.',
    values.contract.seguroObligatorio ? 'El locatario deberá contratar seguro contra incendio y responsabilidad civil.' : '',
    values.contract.permiteSublocacion ? 'La sublocación se permite únicamente con autorización escrita del locador.' : 'La sublocación queda prohibida.',
    values.contract.inspeccionesPermitidas ? 'El locador podrá inspeccionar el inmueble previa coordinación.' : '',
    values.contract.inventarioAdjunto ? 'El inventario forma parte del contrato como anexo.' : '',
    values.contract.soloAireSplit ? 'Sólo se permite la instalación de aire acondicionado tipo Split con autorización previa.' : '',
    values.contract.clausulasEspeciales,
  ].filter(Boolean).join('\n')

  return {
    templateId: values.contract.plantillaContrato,
    locadorNombre: ownerNames,
    locadorDni: ownerDnis,
    locadorCuit: ownerCuits,
    locadorDomicilio: ownerAddresses,
    locatarioNombre: `${values.tenant.apellidos}, ${values.tenant.nombres}`,
    locatarioDni: values.tenant.dni,
    locatarioCuit: values.tenant.cuit,
    locatarioDomicilio: `${values.tenant.direccion}, ${values.tenant.ciudad}`,
    garanteNombre: `${values.tenant.garanteApellidos}, ${values.tenant.garanteNombre}`,
    garanteDni: values.tenant.garanteDni,
    garanteDomicilio: values.tenant.garanteDomicilio,
    inmuebleTipo: values.property.tipoPropiedad,
    inmuebleDireccion: `${values.property.direccion}, ${values.property.ciudad}`,
    partidaInmobiliaria: values.property.partidaInmobiliaria,
    superficieCubierta: values.property.superficieConstruida,
    composicionInmueble: values.property.composicion,
    inventario: values.property.inventario,
    estadoConservacion: values.property.observaciones || 'Muy bueno',
    destinoDetalle: values.contract.destinoDetalle,
    fechaInicio: values.contract.fechaInicio,
    fechaFin: values.contract.fechaFin,
    plazoMeses: values.contract.plazoMeses,
    moneda: values.contract.moneda,
    canonMensual: values.contract.canonMensual,
    ajusteCadaMeses: values.contract.ajusteCadaMeses,
    indiceAjuste: values.contract.indiceAjuste,
    pagoDiaDesde: values.contract.pagoDiaDesde,
    pagoDiaHasta: values.contract.pagoDiaHasta,
    formaPago: values.contract.formaPago,
    lugarPago: values.contract.lugarPago,
    depositoGarantia: values.contract.depositoGarantia,
    penalidadDiaria: values.contract.penalidadDiaria,
    interesDiario: values.contract.interesDiario,
    preavisoDias: values.contract.preavisoDias,
    rescisiónPorcentaje: values.contract.rescisionPorcentaje,
    serviciosLocatario: values.contract.serviciosLocatario,
    gastosLocador: values.contract.gastosLocador,
    clausulasEspeciales: clauses,
    ciudadFirma: values.contract.ciudadFirma,
    fechaFirma: values.contract.fechaFirma,
    cantidadEjemplares: '4',
    administradorNombre: values.contract.administradorNombre,
    administradorMatricula: values.contract.administradorMatricula,
  }
}

function pickContractInput(values: WorkflowFormValues): ContractInput {
  return Object.fromEntries(
    Object.entries(values.contract).filter(
      ([key]) =>
        ![
          'moneda',
          'permiteMascotas',
          'seguroObligatorio',
          'permiteSublocacion',
          'inspeccionesPermitidas',
          'inventarioAdjunto',
          'soloAireSplit',
        ].includes(key),
    ),
  ) as unknown as ContractInput
}

function ownerPercentage(owners: WorkflowFormValues['owners']): number {
  return owners.reduce((total, owner) => total + (Number(owner.porcentaje) || 0), 0)
}
