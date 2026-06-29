import { supabase } from './supabase/client'
import type { TableRow } from './supabase/types'

export interface RegisterIncomeInput {
  contractId: string
  installmentId?: string
  date: string
  amount: number
  concept: string
  payerName: string
  paymentMethod: string
  receiptNumber: string
  receiptData: TableRow[string]
  commissionPercentage: number
  commissionAmount: number
  ownerBalance: number
}

export interface RegisterExpenseInput {
  contractId?: string
  date: string
  amount: number
  concept: string
  paymentMethod: string
}

export async function registerIncome(input: RegisterIncomeInput): Promise<void> {
  let paymentId = ''
  let movementId = ''
  let previousInstallment: TableRow | undefined

  try {
    if (input.installmentId) {
      const { data, error } = await supabase
        .from('cuotas_alquiler')
        .select('id,saldo,estado')
        .eq('id', input.installmentId)
        .single()
      if (error) throw error
      previousInstallment = data as TableRow
    }

    const { data: payment, error: paymentError } = await supabase
      .from('pagos_alquiler')
      .insert({
        contrato_id: input.contractId,
        cuota_id: input.installmentId || null,
        fecha_pago: `${input.date}T12:00:00`,
        concepto: input.concept,
        importe: input.amount,
        total_recibo_locatario: input.amount,
        tipo_movimiento: 'ingreso',
        porcentaje_comision: input.commissionPercentage,
        importe_comision: input.commissionAmount,
        saldo_propietario: input.ownerBalance,
        liquidacion_propietario: input.ownerBalance,
        pagador_nombre: input.payerName,
        medio_pago: input.paymentMethod,
        numero_recibo: input.receiptNumber,
        recibo: input.receiptNumber,
        recibo_datos: input.receiptData,
        estado: 'cobrado',
      })
      .select('id')
      .single()
    if (paymentError) throw paymentError
    paymentId = String(payment.id)

    const { data: movement, error: movementError } = await supabase
      .from('movimientos_caja')
      .insert({
        fecha: `${input.date}T12:00:00`,
        tipo: 'ingreso',
        concepto: input.concept,
        importe: input.amount,
        origen: 'alquiler',
        contrato_id: input.contractId,
        cuota_id: input.installmentId || null,
        pago_id: paymentId,
        porcentaje_comision: input.commissionPercentage,
        importe_comision: input.commissionAmount,
        saldo_propietario: input.ownerBalance,
        pagador_nombre: input.payerName,
        medio_pago: input.paymentMethod,
        numero_recibo: input.receiptNumber,
        recibo_datos: input.receiptData,
      })
      .select('id')
      .single()
    if (movementError) throw movementError
    movementId = String(movement.id)

    if (previousInstallment) {
      const previousBalance = Number(previousInstallment.saldo ?? 0)
      const nextBalance = Math.max(0, roundMoney(previousBalance - input.amount))
      const nextStatus = nextBalance === 0 ? 'pagada' : nextBalance < previousBalance ? 'parcial' : previousInstallment.estado
      const { error: installmentError } = await supabase
        .from('cuotas_alquiler')
        .update({ saldo: nextBalance, estado: nextStatus })
        .eq('id', input.installmentId!)
      if (installmentError) throw installmentError
    }
  } catch (error) {
    if (previousInstallment && input.installmentId) {
      await supabase
        .from('cuotas_alquiler')
        .update({
          saldo: previousInstallment.saldo,
          estado: previousInstallment.estado,
        })
        .eq('id', input.installmentId)
    }
    if (movementId) await supabase.from('movimientos_caja').delete().eq('id', movementId)
    if (paymentId) await supabase.from('pagos_alquiler').delete().eq('id', paymentId)
    throw error
  }
}

export async function registerExpense(input: RegisterExpenseInput): Promise<void> {
  const { error } = await supabase.from('movimientos_caja').insert({
    fecha: `${input.date}T12:00:00`,
    tipo: 'egreso',
    concepto: input.concept,
    importe: input.amount,
    origen: 'manual',
    contrato_id: input.contractId || null,
    medio_pago: input.paymentMethod,
  })
  if (error) throw error
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
