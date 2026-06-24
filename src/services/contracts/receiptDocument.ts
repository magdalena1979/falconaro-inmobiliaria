export interface ReceiptDocumentData {
  agencyName: string
  agencyAddress?: string
  agencyCuit?: string
  agencyPhone?: string
  logoUrl?: string
  receiptNumber: string
  date: string
  payerName: string
  amount: number
  concept: string
  paymentMethod: string
  propertyLabel?: string
}

export async function downloadReceiptDocx(data: ReceiptDocumentData): Promise<string> {
  const {
    AlignmentType,
    Document,
    ImageRun,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = await import('docx')
  const logo = await loadImage(data.logoUrl || '/images/logo.jpg')
  const headerChildren = []

  if (logo) {
    headerChildren.push(
      new ImageRun({
        data: logo,
        transformation: { width: 170, height: 64 },
        type: 'jpg',
      }),
    )
  }

  const document = new Document({
    creator: data.agencyName,
    title: `Recibo ${data.receiptNumber}`,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 900, right: 900, bottom: 900, left: 900 },
          },
        },
        children: [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: borderlessBorders(),
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders: borderlessBorders(),
                    children: [
                      new Paragraph({ children: headerChildren }),
                      new Paragraph({
                        children: [new TextRun({ text: data.agencyName, bold: true, size: 24 })],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: [data.agencyAddress, data.agencyPhone, data.agencyCuit ? `CUIT ${data.agencyCuit}` : '']
                              .filter(Boolean)
                              .join(' | '),
                            size: 18,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    borders: borderlessBorders(),
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [new TextRun({ text: 'RECIBO', bold: true, size: 30 })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [new TextRun({ text: `N.º ${data.receiptNumber}`, size: 20 })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [new TextRun({ text: formatDate(data.date), size: 20 })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 500, after: 260 },
            children: [
              new TextRun({ text: 'Recibí de ', size: 24 }),
              new TextRun({ text: data.payerName, bold: true, size: 24 }),
              new TextRun({ text: ' la cantidad de ', size: 24 }),
              new TextRun({ text: formatCurrency(data.amount), bold: true, size: 24 }),
              new TextRun({ text: '.', size: 24 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 220 },
            children: [
              new TextRun({ text: 'En concepto de: ', size: 24 }),
              new TextRun({ text: data.concept, bold: true, size: 24 }),
            ],
          }),
          ...(data.propertyLabel
            ? [
                new Paragraph({
                  spacing: { after: 220 },
                  children: [
                    new TextRun({ text: 'Inmueble: ', size: 24 }),
                    new TextRun({ text: data.propertyLabel, size: 24 }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            children: [
              new TextRun({ text: 'Medio de pago: ', size: 24 }),
              new TextRun({ text: data.paymentMethod, size: 24 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 900 },
            children: [new TextRun({ text: 'Firma y aclaración', size: 20 })],
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(document)
  const fileName = `recibo-${data.receiptNumber.toLowerCase()}.docx`
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
  return fileName
}

async function loadImage(url: string): Promise<Uint8Array | undefined> {
  try {
    const response = await fetch(url)
    if (!response.ok) return undefined
    return new Uint8Array(await response.arrayBuffer())
  } catch {
    return undefined
  }
}

function borderlessBorders() {
  const border = { style: 'none' as const, size: 0, color: 'FFFFFF' }
  return { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    currency: 'ARS',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(value)
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' }).format(new Date(`${value}T12:00:00`))
}
