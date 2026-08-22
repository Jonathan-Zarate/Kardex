import PDFDocument from 'pdfkit'

export interface ReportHeader {
  companyName: string
  companyRuc: string
  title: string
  filters?: string
  generatedBy: string
}

export interface TableConfig {
  headers: string[]
  rows: (string | number)[][]
  widths: number[]
  totals?: (string | number | null)[]
}

const MARGIN = 40
const PAGE_WIDTH = 595 - MARGIN * 2  // A4 width minus margins
const ROW_H = 18
const HEADER_H = 20
const GRAY_HEADER = '#1e3a5f'
const GRAY_ROW = '#f1f5f9'
const TEXT_DARK = '#111827'
const TEXT_LIGHT = '#6b7280'

function drawPageHeader(doc: InstanceType<typeof PDFDocument>, h: ReportHeader) {
  const y = MARGIN

  doc.fontSize(14).font('Helvetica-Bold').fillColor(GRAY_HEADER)
    .text(h.companyName, MARGIN, y, { continued: true })
    .fontSize(8).font('Helvetica').fillColor(TEXT_LIGHT)
    .text(`  |  RUC: ${h.companyRuc}`)

  doc.moveDown(0.3)
  doc.fontSize(11).font('Helvetica-Bold').fillColor(TEXT_DARK).text(h.title)
  if (h.filters) {
    doc.fontSize(8).font('Helvetica').fillColor(TEXT_LIGHT).text(h.filters)
  }
  doc.moveDown(0.2)

  // horizontal rule
  const ruleY = doc.y
  doc.moveTo(MARGIN, ruleY).lineTo(MARGIN + PAGE_WIDTH, ruleY).lineWidth(0.5).strokeColor('#cbd5e1').stroke()
  doc.moveDown(0.5)
}

function drawPageFooter(doc: InstanceType<typeof PDFDocument>, generatedBy: string, pageNum: number) {
  const footerY = doc.page.height - MARGIN
  doc.fontSize(7).font('Helvetica').fillColor(TEXT_LIGHT)
    .text(
      `Generado: ${new Date().toLocaleString('es-PE')}  |  Usuario: ${generatedBy}`,
      MARGIN, footerY,
      { continued: true, width: PAGE_WIDTH - 60 },
    )
    .text(`Pág. ${pageNum}`, { align: 'right' })
}

export function generatePDF(
  header: ReportHeader,
  tables: TableConfig[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true })
    const chunks: Buffer[] = []

    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    let pageNum = 1
    drawPageHeader(doc, header)

    for (const table of tables) {
      drawTable(doc, table, header, () => {
        drawPageFooter(doc, header.generatedBy, pageNum)
        pageNum++
        doc.addPage()
        drawPageHeader(doc, header)
      })
      doc.moveDown(1)
    }

    drawPageFooter(doc, header.generatedBy, pageNum)
    doc.end()
  })
}

function drawTable(
  doc: InstanceType<typeof PDFDocument>,
  { headers, rows, widths, totals }: TableConfig,
  header: ReportHeader,
  onPageBreak: () => void,
) {
  const totalW = widths.reduce((a, b) => a + b, 0)
  let y = doc.y

  // Header row
  doc.save()
  doc.rect(MARGIN, y, totalW, HEADER_H).fill(GRAY_HEADER)
  headers.forEach((h, i) => {
    const x = MARGIN + widths.slice(0, i).reduce((a, b) => a + b, 0)
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('white')
      .text(h, x + 3, y + 6, { width: widths[i] - 6, lineBreak: false })
  })
  doc.restore()
  y += HEADER_H

  // Data rows
  rows.forEach((row, ri) => {
    if (y + ROW_H > doc.page.height - MARGIN - 20) {
      onPageBreak()
      y = doc.y
      // Redraw header on new page
      doc.save()
      doc.rect(MARGIN, y, totalW, HEADER_H).fill(GRAY_HEADER)
      headers.forEach((h, i) => {
        const x = MARGIN + widths.slice(0, i).reduce((a, b) => a + b, 0)
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('white')
          .text(h, x + 3, y + 6, { width: widths[i] - 6, lineBreak: false })
      })
      doc.restore()
      y += HEADER_H
    }

    if (ri % 2 === 0) {
      doc.rect(MARGIN, y, totalW, ROW_H).fill(GRAY_ROW)
    }

    row.forEach((cell, ci) => {
      const x = MARGIN + widths.slice(0, ci).reduce((a, b) => a + b, 0)
      const isNum = typeof cell === 'number' || (typeof cell === 'string' && /^[\d.,\-]+$/.test(cell.replace(/\s/g, '')))
      doc.fontSize(7.5).font('Helvetica').fillColor(TEXT_DARK)
        .text(String(cell ?? '—'), x + 3, y + 5, {
          width: widths[ci] - 6,
          lineBreak: false,
          align: isNum ? 'right' : 'left',
        })
    })
    y += ROW_H
  })

  // Totals row
  if (totals) {
    doc.save()
    doc.rect(MARGIN, y, totalW, HEADER_H).fill('#dbeafe')
    totals.forEach((cell, ci) => {
      if (cell == null) return
      const x = MARGIN + widths.slice(0, ci).reduce((a, b) => a + b, 0)
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(TEXT_DARK)
        .text(String(cell), x + 3, y + 6, { width: widths[ci] - 6, lineBreak: false, align: 'right' })
    })
    doc.restore()
    y += HEADER_H
  }

  doc.y = y
}
