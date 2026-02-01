import ExcelJS from 'exceljs'
import type { ReportColumn } from '@/types/reporting'

interface ExportOptions {
  title: string
  data: Record<string, unknown>[]
  columns: ReportColumn[]
}

export class ExcelExportService {
  static async generateExcel(options: ExportOptions): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'HazardOS'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet(options.title.slice(0, 31)) // Excel sheet names max 31 chars

    const visibleColumns = options.columns.filter(col => col.visible)

    // Set columns
    worksheet.columns = visibleColumns.map(col => ({
      header: col.label,
      key: col.field,
      width: this.getColumnWidth(col),
    }))

    // Style header row
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }, // Primary color
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    headerRow.height = 25

    // Add data rows
    options.data.forEach((row, idx) => {
      const dataRow = worksheet.addRow(
        visibleColumns.reduce((acc, col) => {
          acc[col.field] = row[col.field]
          return acc
        }, {} as Record<string, unknown>)
      )

      // Alternate row colors
      if (idx % 2 === 1) {
        dataRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        }
      }

      // Format cells based on column type
      visibleColumns.forEach((col, colIdx) => {
        const cell = dataRow.getCell(colIdx + 1)

        switch (col.format) {
          case 'currency':
            cell.numFmt = '$#,##0.00'
            break
          case 'percent':
            cell.numFmt = '0.0%'
            // Convert percentage to decimal for Excel
            if (typeof cell.value === 'number') {
              cell.value = cell.value / 100
            }
            break
          case 'number':
            cell.numFmt = '#,##0'
            break
          case 'date':
            cell.numFmt = 'mmm d, yyyy'
            break
        }
      })
    })

    // Add auto-filter
    if (options.data.length > 0) {
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: options.data.length + 1, column: visibleColumns.length },
      }
    }

    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }]

    // Add borders to all cells with data
    const lastRow = options.data.length + 1
    const lastCol = visibleColumns.length

    for (let row = 1; row <= lastRow; row++) {
      for (let col = 1; col <= lastCol; col++) {
        const cell = worksheet.getCell(row, col)
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }

  static async generateCSV(options: ExportOptions): Promise<string> {
    const visibleCols = options.columns.filter(col => col.visible)
    const headers = visibleCols.map(col => this.escapeCSV(col.label)).join(',')

    const rows = options.data.map(row =>
      visibleCols.map(col => {
        const val = row[col.field]
        if (val == null) return ''

        // Format values
        let formatted: string | number = val as string | number
        if (col.format === 'percent' && typeof val === 'number') {
          formatted = `${val}%`
        } else if (col.format === 'currency' && typeof val === 'number') {
          formatted = `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        }

        return this.escapeCSV(String(formatted))
      }).join(',')
    )

    return [headers, ...rows].join('\n')
  }

  private static escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  private static getColumnWidth(col: ReportColumn): number {
    switch (col.format) {
      case 'currency':
        return 15
      case 'percent':
        return 12
      case 'date':
        return 14
      case 'number':
        return 12
      default:
        return Math.max(col.label.length + 2, 15)
    }
  }
}
