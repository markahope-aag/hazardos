import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { WasteLabelGenerateInput } from '@/lib/validations/waste-label'

// Waste container labels, laid out for Avery 5162 stock — 14 labels per
// US Letter sheet, 2 across by 7 down, each 4" x 1-1/3".
//
// Geometry is in PDF points (72pt = 1in) and matches the Avery 5162
// template exactly. Getting this wrong doesn't fail loudly, it prints
// skewed across the die-cuts and wastes a sheet, so the numbers are named
// rather than inlined.

const PT_PER_IN = 72

const SHEET = {
  labelWidth: 4 * PT_PER_IN, //          4"
  labelHeight: (4 / 3) * PT_PER_IN, //   1.333"
  marginTop: 0.83 * PT_PER_IN, //        0.83"
  marginLeft: 0.156 * PT_PER_IN, //      0.156"
  columnPitch: 4.19 * PT_PER_IN, //      4"   label + 0.19" gutter
  rowPitch: (4 / 3) * PT_PER_IN, //      1.333" (no vertical gutter)
  columns: 2,
  rows: 7,
}

export const LABELS_PER_SHEET = SHEET.columns * SHEET.rows

// Inset from the die-cut edge so nothing prints into the margin if the
// sheet feeds a hair off.
const PADDING_X = 12
const PADDING_Y = 10

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    color: '#000000',
  },
  label: {
    position: 'absolute',
    width: SHEET.labelWidth,
    height: SHEET.labelHeight,
    paddingHorizontal: PADDING_X,
    paddingTop: PADDING_Y,
  },
  line: {
    fontSize: 8,
    lineHeight: 1.25,
  },
  warningBlock: {
    marginTop: 3,
    paddingTop: 2,
    borderTopWidth: 0.5,
    borderTopColor: '#000000',
  },
  warningHeading: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.15,
  },
  warningText: {
    fontSize: 6,
    lineHeight: 1.15,
  },
})

function labelPosition(index: number) {
  // Fill down each column first, matching how the reference sheet reads.
  const column = Math.floor(index / SHEET.rows)
  const row = index % SHEET.rows
  return {
    left: SHEET.marginLeft + column * SHEET.columnPitch,
    top: SHEET.marginTop + row * SHEET.rowPitch,
  }
}

interface LabelContent {
  contractorName: string
  contractorAddressLines: string[]
  generator: string
  location: string
  includeWarning: boolean
}

function Label({ content, index }: { content: LabelContent; index: number }) {
  return (
    <View style={[styles.label, labelPosition(index)]}>
      <Text style={styles.line}>Contractor: {content.contractorName}</Text>
      {content.contractorAddressLines.map((line, i) => (
        <Text key={i} style={styles.line}>
          {line}
        </Text>
      ))}
      <Text style={styles.line}>Generator: {content.generator}</Text>
      <Text style={styles.line}>Location: {content.location}</Text>

      {content.includeWarning ? (
        <View style={styles.warningBlock}>
          <Text style={styles.warningHeading}>DANGER — CONTAINS ASBESTOS FIBERS</Text>
          <Text style={styles.warningText}>
            May cause cancer. Causes damage to lungs. Do not breathe dust. Avoid creating dust.
          </Text>
        </View>
      ) : null}
    </View>
  )
}

/**
 * Builds the address block under the contractor name. Blank parts are
 * dropped rather than printed as empty lines, so a partially-filled
 * organisation address still produces a tidy label.
 */
function buildContractorAddress(input: WasteLabelGenerateInput): string[] {
  const cityLine = [
    input.contractor_city,
    [input.contractor_state, input.contractor_zip].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ')

  return [input.contractor_address, cityLine].filter((line): line is string => Boolean(line?.trim()))
}

export function WasteLabelPdf(input: WasteLabelGenerateInput) {
  const content: LabelContent = {
    contractorName: input.contractor_name,
    contractorAddressLines: buildContractorAddress(input),
    generator: input.generator,
    location: input.location,
    includeWarning: input.include_warning ?? false,
  }

  const total = input.label_count
  const sheets = Math.ceil(total / LABELS_PER_SHEET)

  return (
    <Document title={`Waste labels — ${input.location}`}>
      {Array.from({ length: sheets }, (_, sheetIndex) => {
        const remaining = total - sheetIndex * LABELS_PER_SHEET
        const onThisSheet = Math.min(remaining, LABELS_PER_SHEET)

        return (
          <Page key={sheetIndex} size="LETTER" style={styles.page}>
            {Array.from({ length: onThisSheet }, (_, i) => (
              <Label key={i} content={content} index={i} />
            ))}
          </Page>
        )
      })}
    </Document>
  )
}
