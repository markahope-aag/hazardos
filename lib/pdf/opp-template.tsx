import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { OppGenerateInput } from '@/lib/validations/opp'

// Pixel-faithful rendition of Wisconsin DHS F-44016 (Rev. 09/2020).
// Same section order, same headings, same agency footer reference so
// inspectors recognize the document at a glance. Generated as our own
// PDF because the agency-issued template is an XFA form that no
// open-source Node lib can fill.

const colors = {
  border: '#000000',
  text: '#000000',
  muted: '#404040',
  hint: '#666666',
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 28,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: colors.text,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topBarLeft: { fontSize: 8 },
  topBarRight: { fontSize: 8, textAlign: 'right' },
  topBarTitle: { fontWeight: 'bold' },
  formMeta: { fontSize: 7, color: colors.muted, marginTop: 2 },
  bigTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 6,
  },
  mandatoryNote: {
    textAlign: 'center',
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  introBox: {
    borderTopWidth: 0.6,
    borderBottomWidth: 0.6,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  introLabel: { fontWeight: 'bold' },
  sectionHeader: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderTopWidth: 0.6,
    borderBottomWidth: 0.6,
    borderColor: colors.border,
    fontWeight: 'bold',
    fontSize: 9,
  },
  table: {
    borderLeftWidth: 0.6,
    borderRightWidth: 0.6,
    borderBottomWidth: 0.6,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.6,
    borderColor: colors.border,
  },
  rowLast: {
    flexDirection: 'row',
  },
  cell: {
    padding: 4,
    borderRightWidth: 0.6,
    borderColor: colors.border,
    flexGrow: 1,
    flexBasis: 0,
  },
  cellLast: {
    padding: 4,
    flexGrow: 1,
    flexBasis: 0,
  },
  fieldLabel: {
    fontSize: 7,
    color: colors.hint,
  },
  fieldValue: {
    fontSize: 9,
    marginTop: 2,
    minHeight: 12,
  },
  protectiveBlock: {
    borderLeftWidth: 0.6,
    borderRightWidth: 0.6,
    borderBottomWidth: 0.6,
    borderColor: colors.border,
    padding: 4,
  },
  protectiveLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  protectiveHint: {
    fontSize: 7,
    color: colors.hint,
    fontWeight: 'normal',
  },
  protectiveValue: {
    fontSize: 9,
    minHeight: 36,
    lineHeight: 1.4,
  },
  shiftRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  shiftItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  checkbox: {
    width: 8,
    height: 8,
    borderWidth: 0.6,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  checkboxX: { fontSize: 7, lineHeight: 1 },
  footer: {
    marginTop: 10,
    borderTopWidth: 0.6,
    borderColor: colors.border,
    paddingTop: 4,
  },
  footerHeader: {
    fontWeight: 'bold',
    fontSize: 8,
    marginBottom: 2,
  },
  footerNote: { fontSize: 7, color: colors.muted },
})

function Cell({
  label,
  value,
  last = false,
  flex = 1,
}: {
  label: string
  value?: string
  last?: boolean
  flex?: number
}) {
  return (
    <View style={[last ? styles.cellLast : styles.cell, { flexGrow: flex }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || ' '}</Text>
    </View>
  )
}

function Checkbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <View style={styles.shiftItem}>
      <View style={styles.checkbox}>
        {checked && <Text style={styles.checkboxX}>X</Text>}
      </View>
      <Text>{label}</Text>
    </View>
  )
}

function ProtectiveSection({
  title,
  hint,
  body,
}: {
  title: string
  hint: string
  body: string
}) {
  return (
    <View style={styles.protectiveBlock}>
      <Text style={styles.protectiveLabel}>
        {title} <Text style={styles.protectiveHint}>({hint})</Text>
      </Text>
      <Text style={styles.protectiveValue}>{body || ' '}</Text>
    </View>
  )
}

function formatDateMDY(iso: string): string {
  // YYYY-MM-DD → MM/DD/YY to match the form's hint text.
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${m}/${d}/${y.slice(2)}`
}

export function OppPdf(data: OppGenerateInput) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.topBarTitle}>DEPARTMENT OF HEALTH SERVICES</Text>
            <Text>Division of Public Health</Text>
            <Text style={styles.formMeta}>F-44016 (Rev. 09/2020)</Text>
            <Text style={styles.formMeta}>Page 1 of 1</Text>
          </View>
          <View style={styles.topBarRight}>
            <Text style={styles.topBarTitle}>STATE OF WISCONSIN</Text>
            <Text>Bureau of Environmental and Occupational Health</Text>
            <Text style={styles.formMeta}>DHS 159, Wis. Adm. Code</Text>
          </View>
        </View>

        <Text style={styles.bigTitle}>ASBESTOS OCCUPANT PROTECTION PLAN</Text>

        <Text style={styles.mandatoryNote}>
          This occupant protection plan is mandatory for asbestos abatement in an occupied or
          furnished facility and shall remain posted for the duration of the asbestos project.{'\n'}
          Anyone entering the regulated area must sign in to the project log and should wear
          appropriate personal protection.
        </Text>

        <View style={styles.introBox}>
          <Text>
            <Text style={styles.introLabel}>Contractor -</Text> Describe the actions taken to
            ensure the health and safety of building occupants during this project in space below.
            If handwritten, write clearly and legibly. Post this plan in plain view outside the
            regulated area for the project.
          </Text>
          <Text style={{ marginTop: 4 }}>
            <Text style={styles.introLabel}>Occupants -</Text> Asbestos is a hazardous substance.
            The actions described below are meant to protect you and others nearby during this
            asbestos removal project. It is important to stay out of work areas while work is in
            progress and until permission is given to re-enter upon completion. The contractor
            will do daily clean-up, but the regulated work area may still contain dangerous levels
            of asbestos until final cleaning is completed.
          </Text>
        </View>

        <Text style={styles.sectionHeader}>ASBESTOS COMPANY INFORMATION</Text>
        <View style={styles.table}>
          <View style={styles.row}>
            <Cell label="Company Name" value={data.company_name} flex={3} />
            <Cell label="DHS company No." value={data.company_license_number} last />
          </View>
          <View style={styles.row}>
            <Cell label="Address" value={data.company_address} flex={3} />
            <Cell label="City" value={data.company_city} flex={2} />
            <Cell label="State" value={data.company_state} flex={1} />
            <Cell label="Zip Code" value={data.company_zip} last />
          </View>
          <View style={styles.rowLast}>
            <Cell label="Company Contact Person" value={data.company_contact_name} flex={3} />
            <Cell label="Telephone No." value={data.company_phone} last />
          </View>
        </View>

        <View style={{ marginTop: 8 }}>
          <Text style={styles.sectionHeader}>ASBESTOS PROJECT INFORMATION</Text>
          <View style={styles.table}>
            <View style={styles.row}>
              <Cell label="Property Type or Property Name" value={data.property_name} last />
            </View>
            <View style={styles.row}>
              <Cell label="Address" value={data.property_address} flex={3} />
              <Cell label="City" value={data.property_city} last />
            </View>
            <View style={styles.row}>
              <Cell label="Property Contact Person" value={data.property_contact_name} flex={3} />
              <Cell label="Telephone No." value={data.property_phone} last />
            </View>
            <View style={styles.rowLast}>
              <Cell
                label="Project start date (mm/dd/yy)"
                value={formatDateMDY(data.project_start_date)}
                flex={2}
              />
              <Cell
                label="Project end date (mm/dd/yy)"
                value={formatDateMDY(data.project_end_date)}
                flex={2}
              />
              <View style={styles.cellLast}>
                <Text style={styles.fieldLabel}>Project work shifts</Text>
                <View style={styles.shiftRow}>
                  <Checkbox checked={data.shift_am} label="am" />
                  <Checkbox checked={data.shift_pm} label="pm" />
                  <Checkbox checked={data.shift_night} label="night" />
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 8 }}>
          <Text style={styles.sectionHeader}>
            PROJECT DESCRIPTION{' '}
            <Text style={{ fontWeight: 'normal', fontSize: 8, color: colors.hint }}>
              (Type of project, include type and amount of asbestos-containing material being
              removed or disturbed)
            </Text>
          </Text>
          <View
            style={{
              borderLeftWidth: 0.6,
              borderRightWidth: 0.6,
              borderBottomWidth: 0.6,
              borderColor: colors.border,
              padding: 4,
            }}
          >
            <Text style={{ minHeight: 36, lineHeight: 1.4 }}>{data.project_description || ' '}</Text>
          </View>
        </View>

        <View style={{ marginTop: 8 }}>
          <Text style={styles.sectionHeader}>
            PROTECTIVE MEASURES{' '}
            <Text style={{ fontWeight: 'normal', fontSize: 8, color: colors.hint }}>
              (Describe below actions taken to ensure occupant safety – attach additional sheet, if needed)
            </Text>
          </Text>
          <ProtectiveSection
            title="Containment or barrier system"
            hint="describe negative air system, glovebag, full containment, mini-containment used for barrier"
            body={data.containment}
          />
          <ProtectiveSection
            title="Ventilation system shutdown"
            hint="describe areas where ventilation system has been shut down"
            body={data.ventilation}
          />
          <ProtectiveSection
            title="Work practices"
            hint="Describe use of wet methods, debris-lowering system, waste handling methods, etc."
            body={data.work_practices}
          />
          <ProtectiveSection
            title="Final cleaning and clearance"
            hint="Describe air scrubbing, HEPA vacuuming, wet cleaning, use of encapsulant, air sampling, etc."
            body={data.final_cleaning}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerHeader}>
            WISCONSIN DEPARTMENT OF HEALTH SERVICES – ASBESTOS PROGRAM
          </Text>
          <Text style={styles.footerNote}>
            Questions or Concerns? Contact the Asbestos and Lead Section at: 608-261-6876
          </Text>
        </View>
      </Page>
    </Document>
  )
}
