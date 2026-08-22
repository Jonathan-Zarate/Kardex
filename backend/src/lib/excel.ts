import ExcelJS from 'exceljs'

export interface ReportHeader {
  companyName: string
  companyRuc: string
  title: string
  filters?: string
  generatedBy: string
}

export interface SheetConfig {
  name: string
  headers: string[]
  rows: (string | number | null)[][]
  totals?: (string | number | null)[]
}

export async function generateExcel(header: ReportHeader, sheets: SheetConfig[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Kardex SaaS'
  wb.created = new Date()

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name)

    // Company header
    ws.addRow([header.companyName]).getCell(1).font = { bold: true, size: 13 }
    ws.addRow([`RUC: ${header.companyRuc}`]).getCell(1).font = { color: { argb: 'FF6B7280' }, size: 9 }
    ws.addRow([header.title]).getCell(1).font = { bold: true, size: 11, color: { argb: 'FF1E3A5F' } }
    if (header.filters) {
      ws.addRow([header.filters]).getCell(1).font = { italic: true, size: 9, color: { argb: 'FF6B7280' } }
    }
    ws.addRow([`Generado: ${new Date().toLocaleString('es-PE')}  |  Usuario: ${header.generatedBy}`])
      .getCell(1).font = { size: 8, color: { argb: 'FF9CA3AF' } }
    ws.addRow([])  // spacer

    // Table headers
    const headerRow = ws.addRow(sheet.headers)
    headerRow.height = 22
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF93C5FD' } },
      }
    })

    // Data rows
    sheet.rows.forEach((row, ri) => {
      const wsRow = ws.addRow(row.map((v) => v ?? ''))
      wsRow.height = 16
      wsRow.eachCell((cell) => {
        cell.font = { size: 8.5 }
        if (ri % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
        }
      })
    })

    // Totals row
    if (sheet.totals) {
      const totalsRow = ws.addRow(sheet.totals.map((v) => v ?? ''))
      totalsRow.height = 18
      totalsRow.eachCell((cell) => {
        cell.font = { bold: true, size: 9 }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
      })
    }

    // Auto-width columns
    ws.columns.forEach((col) => {
      if (!col) return
      let max = 12
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = String(cell.value ?? '').length
        if (len > max) max = len
      })
      col.width = Math.min(max + 2, 55)
    })
  }

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>
}
