import {
  buildContractSections,
  contractTitle,
  getContractTemplate,
  type ContractDocumentData,
} from '../../config/contractTemplates'

export function buildContractPreview(data: ContractDocumentData): string {
  const sections = buildContractSections(data)
  return [
    contractTitle(data.templateId),
    '',
    ...sections.flatMap((section) => [
      section.title,
      ...section.paragraphs,
      '',
    ]),
  ].join('\n')
}

export async function downloadContractDocx(data: ContractDocumentData): Promise<string> {
  const {
    AlignmentType,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    TextRun,
  } = await import('docx')
  const template = getContractTemplate(data.templateId)
  const sections = buildContractSections(data)
  const document = new Document({
    creator: 'Falconaro Servicios Inmobiliarios',
    title: contractTitle(data.templateId),
    description: template.description,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134,
              right: 1134,
              bottom: 1134,
              left: 1134,
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 320 },
            children: [
              new TextRun({
                text: contractTitle(data.templateId),
                bold: true,
                size: 28,
                font: 'Arial',
              }),
            ],
          }),
          ...sections.flatMap((section) => {
            const heading = section.title
              ? [
                  new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 220, after: 100 },
                    children: [
                      new TextRun({
                        text: section.title,
                        bold: true,
                        size: 22,
                        font: 'Arial',
                      }),
                    ],
                  }),
                ]
              : []

            return [
              ...heading,
              ...section.paragraphs.map(
                (paragraph) =>
                  new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 120, line: 300 },
                    children: [
                      new TextRun({
                        text: paragraph || ' ',
                        size: 22,
                        font: 'Arial',
                      }),
                    ],
                  }),
              ),
            ]
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(document)
  const fileName = getContractFileName(data)
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
  return fileName
}

export function getContractFileName(data: ContractDocumentData): string {
  const tenant = data.locatarioNombre.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
  const date = data.fechaInicio || new Date().toISOString().slice(0, 10)
  return `contrato-${tenant || 'locatario'}-${date}.docx`.toLowerCase()
}
