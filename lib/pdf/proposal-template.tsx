import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { ProposalData } from '@/types/proposal'
import {
  formatCurrency,
  formatDate,
  getHazardTypeLabel,
  getContainmentLevelLabel,
} from '@/types/proposal'

const colors = {
  primary: '#FF6B35',
  secondary: '#1F2937',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  black: '#111827',
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: colors.black,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  companyInfo: {
    maxWidth: '50%',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  companyDetail: {
    fontSize: 9,
    color: colors.gray,
    marginBottom: 2,
  },
  proposalInfo: {
    textAlign: 'right',
  },
  proposalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 8,
  },
  proposalMeta: {
    fontSize: 9,
    color: colors.gray,
    marginBottom: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: '40%',
    color: colors.gray,
    fontSize: 9,
  },
  value: {
    width: '60%',
    fontSize: 9,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 20,
  },
  column: {
    flex: 1,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.secondary,
    padding: 8,
  },
  tableHeaderCell: {
    color: colors.white,
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    padding: 8,
  },
  tableRowAlt: {
    backgroundColor: colors.lightGray,
  },
  tableCell: {
    fontSize: 9,
  },
  col1: { width: '40%' },
  col2: { width: '20%', textAlign: 'right' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  totalsSection: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  totalLabel: {
    width: 120,
    textAlign: 'right',
    paddingRight: 20,
    fontSize: 10,
    color: colors.gray,
  },
  totalValue: {
    width: 100,
    textAlign: 'right',
    fontSize: 10,
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.secondary,
  },
  grandTotalLabel: {
    width: 120,
    textAlign: 'right',
    paddingRight: 20,
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  grandTotalValue: {
    width: 100,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  termsSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: colors.lightGray,
  },
  termsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.secondary,
  },
  termsText: {
    fontSize: 8,
    color: colors.gray,
    marginBottom: 4,
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  footerText: {
    fontSize: 8,
    color: colors.gray,
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    gap: 40,
  },
  signatureBox: {
    flex: 1,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: colors.black,
    marginBottom: 4,
    height: 30,
  },
  signatureLabel: {
    fontSize: 8,
    color: colors.gray,
  },
  disclaimer: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.gray,
  },
  disclaimerText: {
    fontSize: 7,
    color: colors.gray,
    lineHeight: 1.3,
  },
})

interface ProposalPDFProps {
  data: ProposalData
}

export function ProposalPDF({ data }: ProposalPDFProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{data.organization.name}</Text>
            {data.organization.address && (
              <Text style={styles.companyDetail}>{data.organization.address}</Text>
            )}
            {data.organization.city && (
              <Text style={styles.companyDetail}>
                {data.organization.city}, {data.organization.state} {data.organization.zip}
              </Text>
            )}
            {data.organization.phone && (
              <Text style={styles.companyDetail}>{data.organization.phone}</Text>
            )}
            {data.organization.email && (
              <Text style={styles.companyDetail}>{data.organization.email}</Text>
            )}
            {data.organization.license_number && (
              <Text style={styles.companyDetail}>License: {data.organization.license_number}</Text>
            )}
          </View>
          <View style={styles.proposalInfo}>
            <Text style={styles.proposalTitle}>PROPOSAL</Text>
            <Text style={styles.proposalMeta}>Proposal #: {data.proposalNumber}</Text>
            <Text style={styles.proposalMeta}>Date: {formatDate(data.proposalDate)}</Text>
            <Text style={styles.proposalMeta}>Valid Until: {formatDate(data.validUntil)}</Text>
          </View>
        </View>

        {/* Customer & Site Info */}
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Information</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{data.customerName}</Text>
              </View>
              {data.customerEmail && (
                <View style={styles.row}>
                  <Text style={styles.label}>Email:</Text>
                  <Text style={styles.value}>{data.customerEmail}</Text>
                </View>
              )}
              {data.customerPhone && (
                <View style={styles.row}>
                  <Text style={styles.label}>Phone:</Text>
                  <Text style={styles.value}>{data.customerPhone}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.column}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Site Location</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>{data.siteAddress}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>City/State:</Text>
                <Text style={styles.value}>
                  {data.siteCity}, {data.siteState} {data.siteZip}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Project Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Details</Text>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <View style={styles.row}>
                <Text style={styles.label}>Job Name:</Text>
                <Text style={styles.value}>{data.jobName}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Service Type:</Text>
                <Text style={styles.value}>{getHazardTypeLabel(data.hazardType)}</Text>
              </View>
              {data.hazardSubtype && (
                <View style={styles.row}>
                  <Text style={styles.label}>Material:</Text>
                  <Text style={styles.value}>{data.hazardSubtype}</Text>
                </View>
              )}
              {data.containmentLevel && (
                <View style={styles.row}>
                  <Text style={styles.label}>Containment:</Text>
                  <Text style={styles.value}>{getContainmentLevelLabel(data.containmentLevel)}</Text>
                </View>
              )}
            </View>
            <View style={styles.column}>
              <View style={styles.row}>
                <Text style={styles.label}>Est. Duration:</Text>
                <Text style={styles.value}>{data.estimatedDurationDays} days</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Crew Size:</Text>
                <Text style={styles.value}>{data.crewSize} workers</Text>
              </View>
              {data.areaSqft && (
                <View style={styles.row}>
                  <Text style={styles.label}>Area:</Text>
                  <Text style={styles.value}>{data.areaSqft.toLocaleString()} sq ft</Text>
                </View>
              )}
              {data.linearFt && (
                <View style={styles.row}>
                  <Text style={styles.label}>Linear Feet:</Text>
                  <Text style={styles.value}>{data.linearFt.toLocaleString()} ft</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Scope of Work */}
        {data.scopeOfWork && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scope of Work</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.4 }}>{data.scopeOfWork}</Text>
          </View>
        )}

        {/* Cost Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cost Breakdown</Text>

          {/* Labor */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.col1]}>Description</Text>
              <Text style={[styles.tableHeaderCell, styles.col2]}>Qty/Hours</Text>
              <Text style={[styles.tableHeaderCell, styles.col3]}>Rate</Text>
              <Text style={[styles.tableHeaderCell, styles.col4]}>Amount</Text>
            </View>

            {/* Labor Row */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.col1]}>
                Labor ({data.crewType || 'Standard Crew'})
              </Text>
              <Text style={[styles.tableCell, styles.col2]}>{data.laborHours} hrs</Text>
              <Text style={[styles.tableCell, styles.col3]}>{formatCurrency(data.laborRate)}/hr</Text>
              <Text style={[styles.tableCell, styles.col4]}>{formatCurrency(data.laborCost)}</Text>
            </View>

            {/* Equipment Items */}
            {data.equipmentItems.map((item, index) => (
              <View key={`equip-${index}`} style={[styles.tableRow, index % 2 === 0 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.tableCell, styles.col1]}>{item.name}</Text>
                <Text style={[styles.tableCell, styles.col2]}>{item.days_needed} days</Text>
                <Text style={[styles.tableCell, styles.col3]}>{formatCurrency(item.daily_rate)}/day</Text>
                <Text style={[styles.tableCell, styles.col4]}>{formatCurrency(item.total_cost)}</Text>
              </View>
            ))}

            {/* Materials Items */}
            {data.materialItems.map((item, index) => (
              <View key={`mat-${index}`} style={[styles.tableRow, (data.equipmentItems.length + index) % 2 === 0 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.tableCell, styles.col1]}>{item.name}</Text>
                <Text style={[styles.tableCell, styles.col2]}>{item.quantity} {item.unit}</Text>
                <Text style={[styles.tableCell, styles.col3]}>{formatCurrency(item.unit_cost)}/{item.unit}</Text>
                <Text style={[styles.tableCell, styles.col4]}>{formatCurrency(item.total_cost)}</Text>
              </View>
            ))}

            {/* Disposal */}
            {data.disposalCost > 0 && (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.col1]}>
                  Disposal ({data.disposalMethod || 'Standard'})
                </Text>
                <Text style={[styles.tableCell, styles.col2]}>-</Text>
                <Text style={[styles.tableCell, styles.col3]}>-</Text>
                <Text style={[styles.tableCell, styles.col4]}>{formatCurrency(data.disposalCost)}</Text>
              </View>
            )}
          </View>

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.subtotal)}</Text>
            </View>
            {data.markupPercentage > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Overhead & Profit ({data.markupPercentage}%):
                </Text>
                <Text style={styles.totalValue}>{formatCurrency(data.markupAmount)}</Text>
              </View>
            )}
            <View style={styles.grandTotal}>
              <Text style={styles.grandTotalLabel}>TOTAL:</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(data.totalPrice)}</Text>
            </View>
          </View>
        </View>

        {/* Terms & Conditions */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>
            {data.paymentTerms || 'Payment Terms: 50% deposit upon acceptance, 50% upon completion.'}
          </Text>
          <Text style={styles.termsText}>
            This proposal is valid for 30 days from the date above. Prices may be subject to change after the expiration date.
          </Text>
          {data.exclusions && data.exclusions.length > 0 && (
            <>
              <Text style={[styles.termsText, { fontWeight: 'bold', marginTop: 8 }]}>Exclusions:</Text>
              {data.exclusions.map((exclusion, index) => (
                <Text key={index} style={styles.termsText}>• {exclusion}</Text>
              ))}
            </>
          )}
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Customer Signature & Date</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Company Representative & Date</Text>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            IMPORTANT: This proposal is for environmental remediation services only. All work will be performed
            in accordance with applicable federal, state, and local regulations including OSHA, EPA, and state
            environmental agency requirements. The customer is responsible for obtaining any necessary permits.
            Clearance testing is not included unless specifically listed above. Additional charges may apply if
            conditions differ from those observed during the initial assessment.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {data.organization.name} | {data.organization.phone}
          </Text>
          <Text style={styles.footerText}>
            Generated by HazardOS
          </Text>
        </View>
      </Page>
    </Document>
  )
}
