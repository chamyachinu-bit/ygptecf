import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import type { FinalReportViewModel } from '@/lib/reports/final-report-data'

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 34,
    paddingHorizontal: 32,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  hero: {
    backgroundColor: '#0f3f35',
    borderRadius: 18,
    padding: 24,
    marginBottom: 18,
  },
  eyebrow: {
    color: '#d1fae5',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: 8,
  },
  heroBody: {
    color: '#d1fae5',
    fontSize: 10,
    lineHeight: 1.6,
    marginBottom: 16,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroMetric: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
  },
  metricLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#0f172a',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 6,
    color: '#0f172a',
  },
  sectionBody: {
    fontSize: 10,
    lineHeight: 1.7,
    color: '#475569',
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  slateCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  greenCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  amberCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  cardTitle: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#475569',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#1e293b',
  },
  comparisonRow: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  comparisonHead: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  comparisonTitle: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  comparisonBody: {
    flexDirection: 'row',
  },
  comparisonCol: {
    width: '50%',
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  comparisonColLast: {
    borderRightWidth: 0,
  },
  comparisonLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#64748b',
    marginBottom: 5,
  },
  comparisonText: {
    fontSize: 10,
    color: '#1e293b',
    lineHeight: 1.6,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
  },
  tableHeadCell: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#64748b',
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  tableCell: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 9,
    color: '#1e293b',
  },
  miniStatRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  miniStat: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  miniStatValue: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  timelineStep: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  timelineIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    paddingTop: 5,
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 8,
  },
  timelineDone: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  timelinePending: {
    backgroundColor: '#e2e8f0',
    color: '#475569',
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  driveLink: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
  },
  linkText: {
    fontSize: 10,
    color: '#047857',
    marginTop: 6,
  },
  muted: {
    color: '#64748b',
  },
  footer: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 8,
    color: '#64748b',
  },
})

function PdfComparisonRow({
  label,
  proposed,
  actual,
}: {
  label: string
  proposed: string
  actual: string
}) {
  return (
    <View style={styles.comparisonRow}>
      <View style={styles.comparisonHead}>
        <Text style={styles.comparisonTitle}>{label}</Text>
      </View>
      <View style={styles.comparisonBody}>
        <View style={styles.comparisonCol}>
          <Text style={styles.comparisonLabel}>Planned</Text>
          <Text style={styles.comparisonText}>{proposed}</Text>
        </View>
        <View style={[styles.comparisonCol, styles.comparisonColLast]}>
          <Text style={styles.comparisonLabel}>Actual</Text>
          <Text style={styles.comparisonText}>{actual}</Text>
        </View>
      </View>
    </View>
  )
}

export function FinalReportPdfDocument({ reportModel }: { reportModel: FinalReportViewModel }) {
  const { event, report, budgets, estimated, actual, variance, attendeeVariance, actualAttendees, driveLinks, timelineSteps, changeSummary } = reportModel

  return (
    <Document
      title={`${event.event_code} - ${event.title} Final Report`}
      author="YGPT EVENT Management System"
      subject="Executive event completion report"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>YGPT EVENT Management System</Text>
          <Text style={styles.heroTitle}>{event.title}</Text>
          <Text style={styles.heroBody}>
            Executive event completion report for {event.event_code}. This document compares the approved proposal with the actual execution outcome, budget variance, participant delivery, and next steps.
          </Text>
          <View style={styles.metricGrid}>
            <View style={styles.heroMetric}>
              <Text style={styles.metricLabel}>Region</Text>
              <Text style={styles.metricValue}>{event.region}</Text>
            </View>
            <View style={styles.heroMetric}>
              <Text style={styles.metricLabel}>Event date</Text>
              <Text style={styles.metricValue}>{formatDate(event.event_date)}</Text>
            </View>
            <View style={styles.heroMetric}>
              <Text style={styles.metricLabel}>Expected vs actual</Text>
              <Text style={styles.metricValue}>{event.expected_attendees} / {actualAttendees}</Text>
            </View>
            <View style={styles.heroMetric}>
              <Text style={styles.metricLabel}>Budget</Text>
              <Text style={styles.metricValue}>{formatCurrency(estimated)} / {formatCurrency(actual)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive summary</Text>
          <Text style={styles.sectionBody}>
            {report.outcome_summary || 'Outcome summary not provided.'}
          </Text>
          <View style={styles.cardRow}>
            <View style={[styles.card, styles.slateCard]}>
              <Text style={styles.cardTitle}>What was planned</Text>
              <Text style={styles.cardText}>{event.description || 'Proposal narrative not provided.'}</Text>
            </View>
            <View style={[styles.card, styles.greenCard]}>
              <Text style={styles.cardTitle}>What happened</Text>
              <Text style={styles.cardText}>{report.execution_details || 'Execution details not provided.'}</Text>
            </View>
            <View style={[styles.card, styles.amberCard]}>
              <Text style={styles.cardTitle}>What changed</Text>
              <Text style={styles.cardText}>{changeSummary}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery timeline</Text>
          <View style={styles.timelineRow}>
            {timelineSteps.map((step, index) => (
              <View key={step.label} style={styles.timelineStep}>
                <Text style={[styles.timelineIndex, step.done ? styles.timelineDone : styles.timelinePending]}>{index + 1}</Text>
                <Text style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{step.label}</Text>
                <Text style={styles.muted}>{step.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proposal vs execution comparison</Text>
          <PdfComparisonRow label="Venue" proposed={event.location} actual={report.actual_location || event.location} />
          <PdfComparisonRow label="Participants" proposed={String(event.expected_attendees)} actual={String(actualAttendees)} />
          <PdfComparisonRow
            label="Timings"
            proposed={`${event.start_time || 'TBD'} - ${event.end_time || 'TBD'}`}
            actual={`${report.actual_start_time || 'TBD'} - ${report.actual_end_time || 'TBD'}`}
          />
          <PdfComparisonRow
            label="Social and reporting"
            proposed={event.social_media_requirements || event.social_media_caption || 'Not provided'}
            actual={report.social_media_writeup || 'Not provided'}
          />
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Finance comparison</Text>
          <Text style={styles.sectionBody}>
            Use this section to review proposed budget lines against actual spend, donation support, and variance direction for post-event review.
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={[styles.tableHeadCell, { width: '34%' }]}>Category</Text>
              <Text style={[styles.tableHeadCell, { width: '22%' }]}>Proposed</Text>
              <Text style={[styles.tableHeadCell, { width: '22%' }]}>Actual</Text>
              <Text style={[styles.tableHeadCell, { width: '22%' }]}>Variance</Text>
            </View>
            {budgets.map((line) => {
              const lineVariance = Number(line.actual_amount || 0) - Number(line.estimated_amount || 0)
              return (
                <View key={line.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '34%' }]}>{line.category}</Text>
                  <Text style={[styles.tableCell, { width: '22%' }]}>{formatCurrency(Number(line.estimated_amount || 0))}</Text>
                  <Text style={[styles.tableCell, { width: '22%' }]}>{formatCurrency(Number(line.actual_amount || 0))}</Text>
                  <Text style={[styles.tableCell, { width: '22%' }]}>{lineVariance > 0 ? '+' : ''}{formatCurrency(lineVariance)}</Text>
                </View>
              )
            })}
          </View>
          <View style={styles.miniStatRow}>
            <View style={styles.miniStat}>
              <Text style={styles.metricLabel}>Planned budget</Text>
              <Text style={styles.miniStatValue}>{formatCurrency(estimated)}</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.metricLabel}>Actual spend</Text>
              <Text style={styles.miniStatValue}>{formatCurrency(actual)}</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.metricLabel}>Variance</Text>
              <Text style={styles.miniStatValue}>{variance > 0 ? '+' : ''}{formatCurrency(variance)}</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.metricLabel}>Donations / support</Text>
              <Text style={styles.miniStatValue}>{formatCurrency(report.donations_received ?? 0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operational notes</Text>
          <View style={styles.cardRow}>
            <View style={[styles.card, styles.slateCard]}>
              <Text style={styles.cardTitle}>Challenges</Text>
              <Text style={styles.cardText}>{report.challenges || 'No challenges recorded.'}</Text>
            </View>
            <View style={[styles.card, styles.greenCard]}>
              <Text style={styles.cardTitle}>Lessons learned</Text>
              <Text style={styles.cardText}>{report.lessons_learned || 'No lessons learned recorded.'}</Text>
            </View>
          </View>
          <View style={styles.cardRow}>
            <View style={[styles.card, styles.slateCard]}>
              <Text style={styles.cardTitle}>Budget notes</Text>
              <Text style={styles.cardText}>{report.budget_notes || 'No budget notes recorded.'}</Text>
            </View>
            <View style={[styles.card, styles.amberCard]}>
              <Text style={styles.cardTitle}>Follow-up actions</Text>
              <Text style={styles.cardText}>{report.follow_up_actions || 'No follow-up actions recorded.'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supporting Drive workspace</Text>
          <Text style={styles.sectionBody}>
            Supporting files remain in Google Drive while the YGPT EVENT system stores workflow, approvals, and report metadata.
          </Text>
          <View style={styles.linkRow}>
            {driveLinks.map((driveLink) => (
              <View key={driveLink.label} style={styles.driveLink}>
                <Text style={{ fontSize: 10, fontWeight: 700, color: '#0f172a' }}>{driveLink.label}</Text>
                {driveLink.url ? (
                  <Link src={driveLink.url} style={styles.linkText}>Open folder</Link>
                ) : (
                  <Text style={[styles.linkText, styles.muted]}>Drive routing not configured yet.</Text>
                )}
              </View>
            ))}
          </View>
          {event.venue_gmaps_link ? (
            <Link src={event.venue_gmaps_link} style={[styles.linkText, { marginTop: 12 }]}>
              Open venue map
            </Link>
          ) : null}
        </View>

        <Text style={styles.footer}>
          Generated on {formatDate(new Date().toISOString())} by YGPT EVENT Management System
        </Text>
      </Page>
    </Document>
  )
}
