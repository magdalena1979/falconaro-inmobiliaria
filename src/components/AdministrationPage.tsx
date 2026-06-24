import { Alert, Box, Button, CircularProgress, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTableRows } from '../hooks/useTableRows'
import { downloadReceiptDocx, type ReceiptDocumentData } from '../services/contracts/receiptDocument'
import { createRow } from '../services/supabase/tableService'
import type { ModuleDefinition, TableRow } from '../services/supabase/types'

interface AdministrationPageProps {
  incomeModule: ModuleDefinition
  contractsModule: ModuleDefinition
  tenantsModule: ModuleDefinition
  propertiesModule: ModuleDefinition
  settingsModule: ModuleDefinition
}

interface MovementForm {
  contractId: string
  date: string
  amount: string
  concept: string
  payerName: string
  paymentMethod: string
}

const emptyForm: MovementForm = {
  contractId: '',
  date: new Date().toISOString().slice(0, 10),
  amount: '',
  concept: '',
  payerName: '',
  paymentMethod: 'Efectivo',
}

export function AdministrationPage({
  incomeModule,
  contractsModule,
  tenantsModule,
  propertiesModule,
  settingsModule,
}: AdministrationPageProps) {
  const [tab, setTab] = useState(0)
  const [incomeForm, setIncomeForm] = useState(emptyForm)
  const [expenseForm, setExpenseForm] = useState(emptyForm)
  const [message, setMessage] = useState('')
  const rowsQuery = useTableRows(incomeModule.table)
  const contractsQuery = useTableRows(contractsModule.table)
  const tenantsQuery = useTableRows(tenantsModule.table)
  const propertiesQuery = useTableRows(propertiesModule.table)
  const settingsQuery = useTableRows(settingsModule.table)
  const queryClient = useQueryClient()
  const settings = settingsQuery.data?.[0]
  const rows = useMemo(() => rowsQuery.data ?? [], [rowsQuery.data])
  const contracts = useMemo(() => contractsQuery.data ?? [], [contractsQuery.data])
  const tenants = useMemo(() => tenantsQuery.data ?? [], [tenantsQuery.data])
  const properties = useMemo(() => propertiesQuery.data ?? [], [propertiesQuery.data])
  const movements = useMemo(() => buildMovements(rows), [rows])
  const mutation = useMutation({
    mutationFn: (row: TableRow) => createRow(incomeModule.table, row),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['table-rows', incomeModule.table.name] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
    },
  })

  return (
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Typography variant="overline">Administración</Typography>
          <Typography variant="h4">Resumen de cuenta</Typography>
          <Typography variant="body2" color="text.secondary">
            Ingresos, egresos y saldo calculados desde movimientos reales.
          </Typography>
        </Box>
      </Box>

      <Tabs aria-label="Secciones de administración" onChange={(_, value: number) => setTab(value)} value={tab}>
        <Tab label="Resumen de cuenta" />
        <Tab label="Ingresos" />
        <Tab label="Egresos" />
      </Tabs>

      {message && <Alert severity="success" onClose={() => setMessage('')}>{message}</Alert>}
      {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}

      {tab === 0 ? (
        <AccountSummary isLoading={rowsQuery.isLoading} isError={rowsQuery.isError} rows={movements} />
      ) : tab === 1 ? (
        <MovementPanel
          form={incomeForm}
          kind="ingreso"
          contracts={contracts}
          isPending={mutation.isPending}
          onChange={setIncomeForm}
          onContractChange={(contractId) => setIncomeForm((current) => ({
            ...current,
            contractId,
            payerName: tenantNameForContract(contractId, contracts, tenants),
          }))}
          onSubmit={registerIncome}
        />
      ) : (
        <MovementPanel
          form={expenseForm}
          kind="egreso"
          contracts={contracts}
          isPending={mutation.isPending}
          onChange={setExpenseForm}
          onContractChange={(contractId) => setExpenseForm((current) => ({ ...current, contractId }))}
          onSubmit={registerExpense}
        />
      )}
    </Stack>
  )

  async function registerIncome() {
    const amount = parseAmount(incomeForm.amount)
    if (!amount || !incomeForm.contractId || !incomeForm.concept || !incomeForm.payerName) return
    const contract = contracts.find((row) => String(row.id) === incomeForm.contractId)
    const percentage = commissionPercentage(contract, settings)
    const commission = roundMoney(amount * percentage / 100)
    const ownerBalance = roundMoney(amount - commission)
    const receiptNumber = createReceiptNumber()
    const receipt = receiptData(incomeForm, receiptNumber, amount)

    await mutation.mutateAsync({
      contrato_id: incomeForm.contractId,
      fecha_pago: `${incomeForm.date}T12:00:00`,
      concepto: incomeForm.concept,
      importe: amount,
      tipo_movimiento: 'ingreso',
      porcentaje_comision: percentage,
      importe_comision: commission,
      saldo_propietario: ownerBalance,
      liquidacion_propietario: ownerBalance,
      pagador_nombre: incomeForm.payerName,
      medio_pago: incomeForm.paymentMethod,
      numero_recibo: receiptNumber,
      recibo: receiptNumber,
      recibo_datos: receipt as unknown as TableRow[string],
      estado: 'cobrado',
    })
    await downloadReceiptDocx(receipt)
    setIncomeForm(emptyForm)
    setMessage(`Ingreso registrado. Comisión: ${formatCurrency(commission)}. Saldo del propietario: ${formatCurrency(ownerBalance)}.`)
  }

  async function registerExpense() {
    const amount = parseAmount(expenseForm.amount)
    if (!amount || !expenseForm.concept) return
    await mutation.mutateAsync({
      contrato_id: expenseForm.contractId || null,
      fecha_pago: `${expenseForm.date}T12:00:00`,
      concepto: expenseForm.concept,
      importe: amount,
      tipo_movimiento: 'egreso',
      medio_pago: expenseForm.paymentMethod,
      estado: 'pagado',
    })
    setExpenseForm(emptyForm)
    setMessage('Egreso registrado correctamente.')
  }

  function receiptData(form: MovementForm, receiptNumber: string, amount: number): ReceiptDocumentData {
    const contract = contracts.find((row) => String(row.id) === form.contractId)
    const property = properties.find((row) => String(row.id) === String(contract?.propiedad_id))
    return {
      agencyName: String(settings?.nombre ?? 'Falconaro Servicios Inmobiliarios'),
      agencyAddress: String(settings?.direccion ?? ''),
      agencyCuit: String(settings?.cuit ?? ''),
      agencyPhone: String(settings?.telefono ?? ''),
      logoUrl: String(settings?.logo_url ?? '/images/logo.jpg'),
      receiptNumber,
      date: form.date,
      payerName: form.payerName,
      amount,
      concept: form.concept,
      paymentMethod: form.paymentMethod,
      propertyLabel: String(property?.direccion ?? ''),
    }
  }
}

function MovementPanel({
  form,
  kind,
  contracts,
  isPending,
  onChange,
  onContractChange,
  onSubmit,
}: {
  form: MovementForm
  kind: 'ingreso' | 'egreso'
  contracts: TableRow[]
  isPending: boolean
  onChange: (form: MovementForm) => void
  onContractChange: (contractId: string) => void
  onSubmit: () => void
}) {
  const isIncome = kind === 'ingreso'
  const isValid = Boolean(form.date && form.amount && form.concept && (!isIncome || (form.contractId && form.payerName)))

  return (
    <Paper className="contract-form-panel" variant="outlined">
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6">{isIncome ? 'Registrar ingreso' : 'Registrar egreso'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {isIncome
              ? 'Se calcula la comisión, el saldo del propietario y se emite el recibo.'
              : 'Registrá transferencias a propietarios, gastos y otros pagos realizados.'}
          </Typography>
        </Box>
        <Box className="contract-field-grid">
          <TextField
            label={isIncome ? 'Contrato' : 'Contrato relacionado (opcional)'}
            select
            value={form.contractId}
            onChange={(event) => onContractChange(event.target.value)}
          >
            {!isIncome && <MenuItem value="">Sin contrato</MenuItem>}
            {contracts.map((contract) => (
              <MenuItem key={String(contract.id)} value={String(contract.id)}>
                {contractLabel(contract)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Fecha"
            type="date"
            value={form.date}
            onChange={(event) => onChange({ ...form, date: event.target.value })}
          />
          <TextField
            label="Importe"
            type="number"
            value={form.amount}
            onChange={(event) => onChange({ ...form, amount: event.target.value })}
          />
          {isIncome && (
            <TextField
              label="Recibí de"
              value={form.payerName}
              onChange={(event) => onChange({ ...form, payerName: event.target.value })}
            />
          )}
          <TextField
            label="Concepto"
            value={form.concept}
            onChange={(event) => onChange({ ...form, concept: event.target.value })}
          />
          <TextField
            label="Medio de pago"
            select
            value={form.paymentMethod}
            onChange={(event) => onChange({ ...form, paymentMethod: event.target.value })}
          >
            <MenuItem value="Efectivo">Efectivo</MenuItem>
            <MenuItem value="Transferencia">Transferencia</MenuItem>
            <MenuItem value="Cheque">Cheque</MenuItem>
            <MenuItem value="Otro">Otro</MenuItem>
          </TextField>
        </Box>
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <Button disabled={!isValid || isPending} onClick={onSubmit} variant="contained">
            {isIncome ? 'Registrar y emitir recibo' : 'Registrar egreso'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}

function AccountSummary({ rows, isLoading, isError }: { rows: MovementRow[]; isLoading: boolean; isError: boolean }) {
  if (isLoading) return <Box className="centered"><CircularProgress size={28} /></Box>
  if (isError) return <Alert severity="error">No se pudo cargar el resumen de cuenta.</Alert>

  const columns: GridColDef<MovementRow>[] = [
    { field: 'date', headerName: 'Fecha', width: 120 },
    { field: 'type', headerName: 'Tipo', width: 110 },
    { field: 'concept', headerName: 'Concepto', flex: 1, minWidth: 180 },
    { field: 'income', headerName: 'Ingreso', width: 140, valueFormatter: formatCurrency },
    { field: 'expense', headerName: 'Egreso', width: 140, valueFormatter: formatCurrency },
    { field: 'commission', headerName: 'Comisión', width: 140, valueFormatter: formatCurrency },
    { field: 'balance', headerName: 'Saldo', width: 150, valueFormatter: formatCurrency },
  ]

  return (
    <Paper className="data-panel" variant="outlined">
      <DataGrid
        autoHeight
        columns={columns}
        disableRowSelectionOnClick
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        pageSizeOptions={[10, 25, 50]}
        rows={rows}
      />
    </Paper>
  )
}

interface MovementRow {
  id: string
  date: string
  type: string
  concept: string
  income: number
  expense: number
  commission: number
  balance: number
}

function buildMovements(rows: TableRow[]): MovementRow[] {
  let balance = 0
  return [...rows]
    .sort((a, b) => movementDate(a).localeCompare(movementDate(b)))
    .map((row, index) => {
      const amount = firstNumber(row, ['importe', 'total_recibo_locatario', 'cuota_mensual'])
      const isExpense = row.tipo_movimiento === 'egreso'
      const income = isExpense ? 0 : amount
      const expense = isExpense ? amount : 0
      balance = roundMoney(balance + income - expense)
      return {
        id: String(row.id ?? index),
        date: movementDate(row).slice(0, 10),
        type: isExpense ? 'Egreso' : 'Ingreso',
        concept: String(row.concepto ?? '-'),
        income,
        expense,
        commission: numberValue(row.importe_comision),
        balance,
      }
    })
    .reverse()
}

function tenantNameForContract(contractId: string, contracts: TableRow[], tenants: TableRow[]): string {
  const contract = contracts.find((row) => String(row.id) === contractId)
  const tenant = tenants.find((row) => String(row.id) === String(contract?.inquilino_id))
  return [tenant?.apellidos, tenant?.nombres].filter(Boolean).join(', ')
}

function contractLabel(contract: TableRow): string {
  return `Contrato ${String(contract.id).slice(0, 8)} · ${String(contract.fecha_inicio ?? 'sin fecha')}`
}

function movementDate(row: TableRow): string {
  return String(row.fecha_pago ?? row.created_at ?? '')
}

function firstNumber(row: TableRow, columns: string[]): number {
  for (const column of columns) {
    const value = numberValue(row[column])
    if (value) return value
  }
  return 0
}

function numberValue(value: TableRow[string] | undefined): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function commissionPercentage(contract: TableRow | undefined, settings: TableRow | undefined): number {
  if (
    contract?.porcentaje_comision_inmobiliaria !== null
    && contract?.porcentaje_comision_inmobiliaria !== undefined
  ) {
    return numberValue(contract.porcentaje_comision_inmobiliaria)
  }
  return numberValue(settings?.porcentaje_comision_default)
}

function parseAmount(value: string): number {
  const amount = Number(value.replace(',', '.'))
  return Number.isFinite(amount) ? roundMoney(amount) : 0
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function createReceiptNumber(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replaceAll('-', '')
  const time = now.toTimeString().slice(0, 8).replaceAll(':', '')
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
  return `REC-${date}-${time}${milliseconds}`
}

function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat('es-AR', {
    currency: 'ARS',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(Number(value ?? 0))
}
