export type ContractUse = 'vivienda' | 'comercial'

export interface ContractTemplate {
  id: string
  name: string
  description: string
  use: ContractUse
  includesExpenses: boolean
}

export interface ContractDocumentData {
  templateId: string
  locadorNombre: string
  locadorDni: string
  locadorCuit: string
  locadorDomicilio: string
  locatarioNombre: string
  locatarioDni: string
  locatarioCuit: string
  locatarioDomicilio: string
  garanteNombre: string
  garanteDni: string
  garanteDomicilio: string
  inmuebleTipo: string
  inmuebleDireccion: string
  partidaInmobiliaria: string
  superficieCubierta: string
  composicionInmueble: string
  inventario: string
  estadoConservacion: string
  destinoDetalle: string
  fechaInicio: string
  fechaFin: string
  plazoMeses: string
  moneda: string
  canonMensual: string
  ajusteCadaMeses: string
  indiceAjuste: string
  pagoDiaDesde: string
  pagoDiaHasta: string
  formaPago: string
  lugarPago: string
  depositoGarantia: string
  penalidadDiaria: string
  interesDiario: string
  preavisoDias: string
  rescisiónPorcentaje: string
  serviciosLocatario: string
  gastosLocador: string
  clausulasEspeciales: string
  ciudadFirma: string
  fechaFirma: string
  cantidadEjemplares: string
  administradorNombre: string
  administradorMatricula: string
}

export interface ContractSection {
  title: string
  paragraphs: string[]
}

export const contractTemplates: ContractTemplate[] = [
  {
    id: 'vivienda_con_expensas',
    name: 'Vivienda con expensas',
    description: 'Locación habitacional con expensas ordinarias a cargo del locatario.',
    use: 'vivienda',
    includesExpenses: true,
  },
  {
    id: 'vivienda_sin_expensas',
    name: 'Vivienda sin expensas',
    description: 'Locación habitacional para inmuebles sin régimen de expensas.',
    use: 'vivienda',
    includesExpenses: false,
  },
  {
    id: 'comercial_con_expensas',
    name: 'Comercial con expensas',
    description: 'Locación con destino comercial y distribución de expensas.',
    use: 'comercial',
    includesExpenses: true,
  },
  {
    id: 'comercial_sin_expensas',
    name: 'Comercial sin expensas',
    description: 'Locación con destino comercial para inmuebles sin expensas.',
    use: 'comercial',
    includesExpenses: false,
  },
]

export function getContractTemplate(templateId: string): ContractTemplate {
  return contractTemplates.find((template) => template.id === templateId) ?? contractTemplates[0]
}

export function buildContractSections(data: ContractDocumentData): ContractSection[] {
  const template = getContractTemplate(data.templateId)
  const useLabel = template.use === 'vivienda' ? 'habitacional' : 'comercial'
  const expensesTenant = template.includesExpenses ? ', expensas ordinarias' : ''
  const expensesOwner = template.includesExpenses ? ' y expensas extraordinarias' : ''
  const destination =
    template.use === 'vivienda'
      ? `El inmueble se destinará exclusivamente a vivienda del LOCATARIO y su grupo familiar. ${data.destinoDetalle}`.trim()
      : `El inmueble se destinará exclusivamente al uso comercial indicado: ${valueOrBlank(data.destinoDetalle)}.`

  return [
    {
      title: '',
      paragraphs: [
        `Entre ${valueOrBlank(data.locadorNombre)}, DNI ${valueOrBlank(data.locadorDni)}, CUIT ${valueOrBlank(data.locadorCuit)}, con domicilio en ${valueOrBlank(data.locadorDomicilio)}, en adelante el LOCADOR, y ${valueOrBlank(data.locatarioNombre)}, DNI ${valueOrBlank(data.locatarioDni)}, CUIT ${valueOrBlank(data.locatarioCuit)}, con domicilio en ${valueOrBlank(data.locatarioDomicilio)}, en adelante el LOCATARIO, se celebra el presente contrato de locación inmobiliaria con destino ${useLabel}.`,
      ],
    },
    {
      title: 'I. OBJETO E INMUEBLE',
      paragraphs: [
        `El LOCADOR entrega en locación el inmueble designado como ${valueOrBlank(data.inmuebleTipo)}, ubicado en ${valueOrBlank(data.inmuebleDireccion)}${data.partidaInmobiliaria ? `, Partida Inmobiliaria N.º ${data.partidaInmobiliaria}` : ''}${data.superficieCubierta ? `, con una superficie cubierta aproximada de ${data.superficieCubierta} m²` : ''}.`,
        `Composición: ${valueOrBlank(data.composicionInmueble)}.`,
        `Inventario y accesorios: ${valueOrBlank(data.inventario)}.`,
        `Estado de conservación: ${valueOrBlank(data.estadoConservacion)}. El inmueble deberá ser restituido limpio, desocupado y en condiciones equivalentes a las recibidas, salvo el desgaste normal por el uso regular.`,
      ],
    },
    {
      title: 'II. DESTINO',
      paragraphs: [
        destination,
        `Quedan prohibidas la cesión, la sublocación y la modificación del destino sin autorización escrita del LOCADOR. La penalidad por incumplimiento será de ${money(data.moneda, data.penalidadDiaria)} por día.`,
      ],
    },
    {
      title: 'III. PLAZO',
      paragraphs: [
        `La duración será de ${valueOrBlank(data.plazoMeses)} meses, desde el ${dateLabel(data.fechaInicio)} hasta el ${dateLabel(data.fechaFin)}.`,
        `La retención injustificada del inmueble una vez vencido el plazo generará una penalidad de ${money(data.moneda, data.penalidadDiaria)} por día.`,
      ],
    },
    {
      title: 'IV. PRECIO, ACTUALIZACIÓN Y PAGO',
      paragraphs: [
        `El canon inicial se fija en ${money(data.moneda, data.canonMensual)} mensuales.`,
        `El valor se actualizará cada ${valueOrBlank(data.ajusteCadaMeses)} meses conforme a ${valueOrBlank(data.indiceAjuste)}.`,
        `El pago será adelantado, entre los días ${valueOrBlank(data.pagoDiaDesde)} y ${valueOrBlank(data.pagoDiaHasta)} de cada mes, mediante ${valueOrBlank(data.formaPago)}, en ${valueOrBlank(data.lugarPago)}.`,
        `La administración estará a cargo de ${valueOrBlank(data.administradorNombre)}${data.administradorMatricula ? `, matrícula ${data.administradorMatricula}` : ''}.`,
      ],
    },
    {
      title: 'V. MORA E INTERESES',
      paragraphs: [
        `La mora será automática. Los importes vencidos devengarán un interés punitorio del ${valueOrBlank(data.interesDiario)}% diario hasta su efectivo pago.`,
        'El LOCATARIO asumirá los gastos y honorarios derivados de intimaciones motivadas por su incumplimiento.',
      ],
    },
    {
      title: 'VI. CONSERVACIÓN Y OBLIGACIONES',
      paragraphs: [
        'El LOCATARIO deberá conservar el inmueble, informar desperfectos y asumir las reparaciones menores originadas por el uso. Las mejoras y modificaciones requieren autorización escrita del LOCADOR.',
        'El LOCADOR podrá inspeccionar el inmueble previa coordinación con el LOCATARIO.',
      ],
    },
    {
      title: 'VII. GASTOS, EXPENSAS Y SERVICIOS',
      paragraphs: [
        `A cargo del LOCATARIO: ${valueOrBlank(data.serviciosLocatario)}${expensesTenant}.`,
        `A cargo del LOCADOR: ${valueOrBlank(data.gastosLocador)}${expensesOwner}.`,
        'Al finalizar la locación, el LOCATARIO deberá acreditar el libre deuda de los conceptos a su cargo y entregar los comprobantes correspondientes.',
      ],
    },
    {
      title: 'VIII. RESPONSABILIDAD Y SEGUROS',
      paragraphs: [
        'El LOCATARIO será responsable por los daños derivados de su uso, el de sus dependientes, convivientes, clientes o terceros vinculados. Deberá mantener las coberturas de seguro que correspondan al destino y características del inmueble.',
      ],
    },
    {
      title: 'IX. DEPÓSITO Y GARANTÍA',
      paragraphs: [
        `El LOCATARIO entrega en depósito la suma de ${money(data.moneda, data.depositoGarantia)}, que no devengará intereses ni podrá imputarse a alquileres. Podrá aplicarse a servicios, expensas, daños, limpieza o pintura pendientes al finalizar la locación.`,
        `${valueOrBlank(data.garanteNombre)}, DNI ${valueOrBlank(data.garanteDni)}, con domicilio en ${valueOrBlank(data.garanteDomicilio)}, se constituye como fiador y codeudor solidario de todas las obligaciones del contrato.`,
      ],
    },
    {
      title: 'X. RESCISIÓN ANTICIPADA',
      paragraphs: [
        `La rescisión anticipada deberá notificarse con ${valueOrBlank(data.preavisoDias)} días de anticipación y estará sujeta al pago del ${valueOrBlank(data.rescisiónPorcentaje)}% del saldo locativo restante, calculado al valor vigente.`,
      ],
    },
    {
      title: 'XI. DOMICILIOS Y JURISDICCIÓN',
      paragraphs: [
        'Las partes constituyen los domicilios indicados en el encabezado, donde serán válidas todas las notificaciones.',
        `Para cualquier controversia se someten a los tribunales ordinarios correspondientes a ${valueOrBlank(data.ciudadFirma)}, con renuncia a cualquier otro fuero.`,
      ],
    },
    {
      title: 'XII. CLÁUSULAS ESPECIALES',
      paragraphs: [data.clausulasEspeciales || 'No se pactan cláusulas especiales adicionales.'],
    },
    {
      title: 'XIII. FIRMA',
      paragraphs: [
        `Firmado en ${valueOrBlank(data.ciudadFirma)}, el ${dateLabel(data.fechaFirma)}, en ${valueOrBlank(data.cantidadEjemplares)} ejemplares de un mismo tenor.`,
        '',
        `LOCADOR: ${valueOrBlank(data.locadorNombre)} - DNI ${valueOrBlank(data.locadorDni)}`,
        `LOCATARIO: ${valueOrBlank(data.locatarioNombre)} - DNI ${valueOrBlank(data.locatarioDni)}`,
        `FIADOR: ${valueOrBlank(data.garanteNombre)} - DNI ${valueOrBlank(data.garanteDni)}`,
      ],
    },
  ]
}

export function contractTitle(templateId: string): string {
  const template = getContractTemplate(templateId)
  return `CONTRATO DE LOCACIÓN INMOBILIARIA CON DESTINO ${template.use === 'vivienda' ? 'HABITACIONAL' : 'COMERCIAL'}`
}

function valueOrBlank(value: string): string {
  return value.trim() || '[COMPLETAR]'
}

function money(currency: string, amount: string): string {
  return `${currency.trim() || '$'} ${amount.trim() || '[COMPLETAR]'}`
}

function dateLabel(value: string): string {
  if (!value) return '[COMPLETAR]'
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' }).format(date)
}
