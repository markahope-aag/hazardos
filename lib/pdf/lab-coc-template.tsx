import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { LabCocGenerateInput } from '@/lib/validations/lab-coc'

// Chain-of-custody / bulk sample submittal form.
//
// This is the sheet that travels with the samples to the lab: who sent them,
// who analysed them, who the results go to, the numbered sample list with
// descriptions and locations, the requested turnaround, and the
// relinquished/received signature lines the lab counters when it logs the
// samples in.
//
// Modelled on the form the client already sends. The lab's own analysis
// summary comes back separately and is attached to the same lab report.

const colors = {
  text: '#000000',
  border: '#000000',
  muted: '#444444',
  rule: '#1a3a6b',
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 46,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: colors.text,
  },
  orgName: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  title: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    textDecoration: 'underline',
    marginTop: 18,
    marginBottom: 20,
  },
  parties: {
    flexDirection: 'row',
    gap: 26,
    marginBottom: 16,
  },
  party: { flex: 1 },
  partyHeading: {
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  line: { lineHeight: 1.4 },

  metaBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  metaCell: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  metaCellLast: { padding: 8 },
  metaHeading: {
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },

  sampleHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
    marginBottom: 8,
  },
  colNum: { width: 74 },
  colDesc: { flex: 1 },
  headingText: {
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'underline',
  },
  sampleRow: {
    flexDirection: 'row',
    marginBottom: 9,
  },
  sampleDesc: { flex: 1, lineHeight: 1.35 },
  sampleLocation: { color: colors.muted, fontSize: 9 },

  turnaround: { marginTop: 22, marginBottom: 26 },
  turnaroundLabel: { fontFamily: 'Helvetica-Bold' },

  sigRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 22,
  },
  sigLabel: { width: 104, fontFamily: 'Helvetica-Bold' },
  sigLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 2,
    marginRight: 26,
  },
  sigDate: { width: 150 },
  sigDateLine: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 2,
  },

  footer: {
    position: 'absolute',
    bottom: 26,
    left: 46,
    right: 46,
    fontSize: 8,
    color: colors.muted,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
})

function AddressBlock({ lines }: { lines: string[] }) {
  return (
    <>
      {lines
        .filter((l) => l && l.trim())
        .map((l, i) => (
          <Text key={i} style={styles.line}>
            {l}
          </Text>
        ))}
    </>
  )
}

export function LabCocPdf(input: LabCocGenerateInput) {
  const contractorLines = [
    input.contractor_name,
    input.contractor_address,
    [input.contractor_city, input.contractor_state, input.contractor_zip].filter(Boolean).join(', '),
    [input.contractor_phone ? `Ph: ${input.contractor_phone}` : null, input.contractor_email]
      .filter(Boolean)
      .join('  '),
  ]

  const labLines = [
    input.lab_name,
    input.lab_address,
    input.lab_phone ? `Phone: ${input.lab_phone}` : null,
  ].filter((l): l is string => Boolean(l))

  const siteLines = [
    input.site_address,
    [input.site_city, input.site_state, input.site_zip].filter(Boolean).join(', '),
  ]

  return (
    <Document title={`Chain of custody — ${input.report_number}`}>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.orgName}>{input.contractor_name}</Text>
        <Text style={styles.title}>{input.form_title}</Text>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyHeading}>Analysis for:</Text>
            <AddressBlock lines={contractorLines} />
          </View>
          <View style={styles.party}>
            <Text style={styles.partyHeading}>Analyzed by:</Text>
            <AddressBlock lines={labLines} />
          </View>
        </View>

        <View style={styles.metaBox}>
          <View style={[styles.metaCell, { flex: 1.15 }]}>
            <Text style={styles.metaHeading}>Submitted To:</Text>
            {(input.submitted_to || '—').split('\n').map((l, i) => (
              <Text key={i} style={styles.line}>
                {l}
              </Text>
            ))}
          </View>
          <View style={[styles.metaCell, { flex: 1 }]}>
            <Text style={styles.metaHeading}>Location:</Text>
            <AddressBlock lines={siteLines} />
          </View>
          <View style={[styles.metaCellLast, { width: 108 }]}>
            <Text style={styles.metaHeading}>Date:</Text>
            <Text style={styles.line}>{input.collected_date}</Text>
          </View>
        </View>

        <View style={styles.sampleHeader}>
          <Text style={[styles.colNum, styles.headingText]}>Sample</Text>
          <Text style={[styles.colDesc, styles.headingText]}>Description and Location</Text>
        </View>

        {input.samples.map((s, i) => (
          <View key={i} style={styles.sampleRow} wrap={false}>
            <Text style={styles.colNum}>{s.sample_number}</Text>
            <View style={styles.sampleDesc}>
              <Text>{s.description}</Text>
              {s.location ? <Text style={styles.sampleLocation}>{s.location}</Text> : null}
            </View>
          </View>
        ))}

        <View style={styles.turnaround}>
          <Text>
            <Text style={styles.turnaroundLabel}>TURNAROUND TIME: </Text>
            {input.turnaround}
          </Text>
        </View>

        <View style={styles.sigRow}>
          <Text style={styles.sigLabel}>Relinquished by:</Text>
          <Text style={styles.sigLine}>{input.relinquished_by || ' '}</Text>
          <View style={styles.sigDate}>
            <Text style={styles.sigDateLine}>Date: {input.collected_date}</Text>
          </View>
        </View>

        <View style={styles.sigRow}>
          <Text style={styles.sigLabel}>Received by:</Text>
          <Text style={styles.sigLine}> </Text>
          <View style={styles.sigDate}>
            <Text style={styles.sigDateLine}>Date:</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>{input.report_number}</Text>
          <Text>
            {input.samples.length} sample{input.samples.length === 1 ? '' : 's'} submitted
          </Text>
        </View>
      </Page>
    </Document>
  )
}
