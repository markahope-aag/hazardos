// Build a formatted QA tracker spreadsheet from QA_TEST_TRACKING.csv.
// Output opens natively in Excel and, when uploaded to Google Drive,
// converts to a Google Sheet with the dropdowns/formatting intact.
import ExcelJS from 'exceljs'

const SRC = 'docs/QA_TEST_TRACKING.csv'
const OUT = 'docs/HazardOS-QA-Tracker.xlsx'
const STATUS = ['Not Started', 'Pass', 'Fail', 'Blocked', 'N/A']

const wb = new ExcelJS.Workbook()
wb.creator = 'HazardOS QA'
const ws = await wb.csv.readFile(SRC)
ws.name = 'QA Tracker'
const lastRow = ws.rowCount
const lastCol = ws.columnCount // Pass,Pass Name,Section,Test ID,Test Step,Status,Notes,Bug Link,Tester,Date = 10

// Column widths (A..J).
const widths = [6, 26, 22, 8, 64, 13, 30, 16, 14, 12]
widths.forEach((w, i) => (ws.getColumn(i + 1).width = w))
ws.getColumn(5).alignment = { wrapText: true, vertical: 'top' } // Test Step
ws.getColumn(7).alignment = { wrapText: true, vertical: 'top' } // Notes

// Header styling + freeze + filter.
const header = ws.getRow(1)
header.height = 22
header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
header.alignment = { vertical: 'middle' }
header.eachCell((cell) => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F6F4A' } }
  cell.border = { bottom: { style: 'thin', color: { argb: 'FF14532D' } } }
})
ws.views = [{ state: 'frozen', ySplit: 1 }]
ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: lastCol } }

// Status dropdown + default value on every data row.
for (let r = 2; r <= lastRow; r++) {
  const cell = ws.getCell(`F${r}`)
  cell.dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: [`"${STATUS.join(',')}"`],
  }
  if (!cell.value) cell.value = 'Not Started'
  ws.getRow(r).alignment = { vertical: 'top' }
}

// Colour the Status cells by value.
const fills = {
  Pass: 'FFD7EFDC',
  Fail: 'FFF8D2D5',
  Blocked: 'FFFCE8C3',
  'N/A': 'FFE5E7EB',
  'Not Started': 'FFF3F4F6',
}
for (const [val, argb] of Object.entries(fills)) {
  ws.addConditionalFormatting({
    ref: `F2:F${lastRow}`,
    rules: [
      {
        type: 'cellIs',
        operator: 'equal',
        formulae: [`"${val}"`],
        priority: Object.keys(fills).indexOf(val) + 1,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb } } },
      },
    ],
  })
}

await wb.xlsx.writeFile(OUT)
console.log(`Wrote ${OUT} — ${lastRow - 1} test rows, ${lastCol} columns.`)
