import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, PageShell, SectionBlock, StatCard, StatGrid } from '@/components/ui/page-shell'
import { ROLE_LABELS } from '@/lib/utils/permissions'
import { formatDate } from '@/lib/utils/formatters'
import type {
  AppSettings,
  NotificationTemplate,
  NotificationType,
  Profile,
  ProfileApprovalStatus,
  RegionOption,
  UserRole,
} from '@/types/database'

const ROLES: UserRole[] = ['regional_coordinator', 'events_team', 'finance_team', 'accounts_team', 'admin']
const NOTIFICATION_TYPES: NotificationType[] = ['approval_required', 'status_changed', 'budget_flagged', 'event_reminder', 'report_due']
const APPROVAL_STATUSES: ProfileApprovalStatus[] = ['pending_admin_approval', 'approved', 'rejected']

function approvalLabel(status: ProfileApprovalStatus) {
  switch (status) {
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    default:
      return 'Pending Approval'
  }
}

function statusPillClass(status: ProfileApprovalStatus) {
  switch (status) {
    case 'approved':
      return 'border border-emerald-200 bg-emerald-100/90 text-emerald-700'
    case 'rejected':
      return 'border border-rose-200 bg-rose-100/90 text-rose-700'
    default:
      return 'border border-amber-200 bg-amber-100/90 text-amber-700'
  }
}

function activePillClass(isActive: boolean) {
  return isActive
    ? 'border border-emerald-200 bg-emerald-100/90 text-emerald-700'
    : 'border border-rose-200 bg-rose-100/90 text-rose-700'
}

export default async function UsersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const adminUserId = user?.id

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: usersData }, { data: appSettings }, { data: templatesData }, { data: regionsData }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('app_settings').select('*').eq('id', 'global').maybeSingle(),
    supabase
      .from('notification_templates')
      .select('*')
      .order('recipient_role', { ascending: true })
      .order('notification_type', { ascending: true }),
    supabase.from('regions').select('*').order('name', { ascending: true }),
  ])

  const users = (usersData ?? []) as Profile[]
  const settings = appSettings as AppSettings | null
  const templates = (templatesData ?? []) as NotificationTemplate[]
  const regions = (regionsData ?? []) as RegionOption[]

  const byRole = users.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.role] = (acc[entry.role] || 0) + 1
    return acc
  }, {})

  async function updateUserAccess(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const userId = String(formData.get('user_id') || '')
    const role = String(formData.get('role') || '') as UserRole
    const isActive = formData.get('is_active') === 'true'
    const approvalStatus = String(formData.get('approval_status') || '') as ProfileApprovalStatus

    if (!userId || !ROLES.includes(role) || !APPROVAL_STATUSES.includes(approvalStatus)) return

    await supabase
      .from('profiles')
      .update({
        role,
        is_active: isActive,
        approval_status: approvalStatus,
        approved_at: approvalStatus === 'approved' ? new Date().toISOString() : null,
        approved_by: approvalStatus === 'approved' ? adminUserId : null,
      })
      .eq('id', userId)

    revalidatePath('/dashboard/admin/users')
  }

  async function updateSettings(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const mediaDriveUrl = String(formData.get('media_drive_url') || '').trim()
    const notificationTestEmail = String(formData.get('notification_test_email') || '').trim()
    const notificationTestMode = String(formData.get('notification_test_mode') || 'all_stages').trim() as AppSettings['notification_test_mode']
    const regionalCoordinatorTestEmail = String(formData.get('regional_coordinator_test_email') || '').trim()
    const eventsTeamTestEmail = String(formData.get('events_team_test_email') || '').trim()
    const financeTeamTestEmail = String(formData.get('finance_team_test_email') || '').trim()
    const accountsTeamTestEmail = String(formData.get('accounts_team_test_email') || '').trim()
    const adminTestEmail = String(formData.get('admin_test_email') || '').trim()
    const regionsNote = String(formData.get('regions_note') || '').trim()
    const driveAppsScriptUrl = String(formData.get('drive_apps_script_url') || '').trim()
    const driveAppsScriptSecret = String(formData.get('drive_apps_script_secret') || '').trim()
    const driveDefaultRootUrl = String(formData.get('drive_default_root_url') || '').trim()
    const driveDefaultProposalRootUrl = String(formData.get('drive_default_proposal_root_url') || '').trim()
    const driveDefaultMediaRootUrl = String(formData.get('drive_default_media_root_url') || '').trim()
    const driveDefaultReportRootUrl = String(formData.get('drive_default_report_root_url') || '').trim()
    const driveDefaultInvoiceRootUrl = String(formData.get('drive_default_invoice_root_url') || '').trim()

    await supabase.from('app_settings').upsert({
      id: 'global',
      media_drive_url: mediaDriveUrl || null,
      notification_test_email: notificationTestEmail || null,
      notification_test_mode: notificationTestMode || 'all_stages',
      regional_coordinator_test_email: regionalCoordinatorTestEmail || null,
      events_team_test_email: eventsTeamTestEmail || null,
      finance_team_test_email: financeTeamTestEmail || null,
      accounts_team_test_email: accountsTeamTestEmail || null,
      admin_test_email: adminTestEmail || null,
      regions_note: regionsNote || null,
      drive_apps_script_url: driveAppsScriptUrl || null,
      drive_apps_script_secret: driveAppsScriptSecret || null,
      drive_default_root_url: driveDefaultRootUrl || null,
      drive_default_proposal_root_url: driveDefaultProposalRootUrl || null,
      drive_default_media_root_url: driveDefaultMediaRootUrl || null,
      drive_default_report_root_url: driveDefaultReportRootUrl || null,
      drive_default_invoice_root_url: driveDefaultInvoiceRootUrl || null,
    })

    revalidatePath('/dashboard/admin/users')
    revalidatePath('/dashboard/events')
  }

  async function addRegion(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const name = String(formData.get('region_name') || '').trim()
    if (!name) return

    await supabase.from('regions').upsert({
      name,
      is_active: true,
      drive_root_url: String(formData.get('drive_root_url') || '').trim() || null,
      proposal_root_url: String(formData.get('proposal_root_url') || '').trim() || null,
      media_root_url: String(formData.get('media_root_url') || '').trim() || null,
      report_root_url: String(formData.get('report_root_url') || '').trim() || null,
      invoice_root_url: String(formData.get('invoice_root_url') || '').trim() || null,
    })

    revalidatePath('/dashboard/admin/users')
    revalidatePath('/register')
    revalidatePath('/dashboard/events/new')
  }

  async function updateRegion(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const regionId = String(formData.get('region_id') || '')
    const name = String(formData.get('name') || '').trim()
    const isActive = formData.get('is_active') === 'true'
    const driveRootUrl = String(formData.get('drive_root_url') || '').trim()
    const proposalRootUrl = String(formData.get('proposal_root_url') || '').trim()
    const mediaRootUrl = String(formData.get('media_root_url') || '').trim()
    const reportRootUrl = String(formData.get('report_root_url') || '').trim()
    const invoiceRootUrl = String(formData.get('invoice_root_url') || '').trim()
    if (!regionId || !name) return

    await supabase
      .from('regions')
      .update({
        name,
        is_active: isActive,
        drive_root_url: driveRootUrl || null,
        proposal_root_url: proposalRootUrl || null,
        media_root_url: mediaRootUrl || null,
        report_root_url: reportRootUrl || null,
        invoice_root_url: invoiceRootUrl || null,
      })
      .eq('id', regionId)

    revalidatePath('/dashboard/admin/users')
    revalidatePath('/register')
    revalidatePath('/dashboard/events/new')
  }

  async function updateTemplate(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const recipientRole = String(formData.get('recipient_role') || '') as UserRole
    const notificationType = String(formData.get('notification_type') || '') as NotificationType
    const subjectTemplate = String(formData.get('subject_template') || '').trim()
    const bodyTemplate = String(formData.get('body_template') || '').trim()
    const isActive = formData.get('is_active') === 'true'

    if (!ROLES.includes(recipientRole) || !NOTIFICATION_TYPES.includes(notificationType)) return
    if (!subjectTemplate || !bodyTemplate) return

    await supabase.from('notification_templates').upsert({
      recipient_role: recipientRole,
      notification_type: notificationType,
      subject_template: subjectTemplate,
      body_template: bodyTemplate,
      is_active: isActive,
    })

    revalidatePath('/dashboard/admin/users')
  }

  const findTemplate = (recipientRole: UserRole, notificationType: NotificationType) =>
    templates.find((entry) => entry.recipient_role === recipientRole && entry.notification_type === notificationType)

  return (
    <div>
      <Header
        title="Settings And Control Center"
        subtitle="Manage approvals, routing, automation, and communication settings from one executive workspace."
        eyebrow="Settings"
      />

      <PageShell>
        <StatGrid className="xl:grid-cols-6">
          <StatCard label="Users in system" value={String(users.length)} helper="Approved and pending accounts" />
          <StatCard label="Pending approval" value={String(users.filter((entry) => entry.approval_status === 'pending_admin_approval').length)} helper="Needs admin review" />
          <StatCard label="Active regions" value={String(regions.filter((entry) => entry.is_active).length)} helper="Available in registration and EPF" />
          <StatCard label="Templates live" value={String(templates.filter((entry) => entry.is_active).length)} helper="Role-specific notification copy" />
          <StatCard label="Drive automation" value={settings?.drive_apps_script_url ? 'Connected' : 'Pending'} helper="Apps Script workflow bridge" />
          <StatCard label="Test inbox" value={settings?.notification_test_email ? 'Enabled' : 'Off'} helper={settings?.notification_test_email ?? 'No email override'} />
        </StatGrid>

        <div className="sticky top-[76px] z-20 rounded-[1.4rem] border border-slate-200/80 bg-white/90 p-3 shadow-[0_16px_32px_rgba(15,23,42,0.05)] backdrop-blur">
          <div className="flex flex-wrap gap-2">
            {[
              { href: '#settings', label: 'System Settings' },
              { href: '#regions', label: 'Regions' },
              { href: '#roles', label: 'Role Counts' },
              { href: '#users', label: 'User Access' },
              { href: '#templates', label: 'Email Templates' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <section id="settings">
        <SectionBlock
          title="System Settings"
          subtitle="Use one-click Apps Script mode for the simplest setup, or add advanced routing overrides if some regions need dedicated Drive parents."
        >
          <form action={updateSettings} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <LabeledInput label="Drive Apps Script webhook URL" name="drive_apps_script_url" defaultValue={settings?.drive_apps_script_url ?? ''} type="url" />
              <LabeledInput label="Drive Apps Script shared secret" name="drive_apps_script_secret" defaultValue={settings?.drive_apps_script_secret ?? ''} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <LabeledInput label="Fallback shared drive link" name="media_drive_url" defaultValue={settings?.media_drive_url ?? ''} type="url" />
              <LabeledInput label="Notification test email" name="notification_test_email" defaultValue={settings?.notification_test_email ?? ''} type="email" placeholder="kokatenakul111@gmail.com" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-800">Temporary email routing mode</label>
                <select
                  name="notification_test_mode"
                  defaultValue={settings?.notification_test_mode ?? 'all_stages'}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-emerald-500"
                >
                  <option value="off">Off: send to real recipient emails</option>
                  <option value="all_stages">All stages: send everything to the single test inbox</option>
                  <option value="stage_specific">Stage specific: send each role to its own temporary inbox</option>
                </select>
              </div>
              <LabeledInput label="Regional Coordinator test email" name="regional_coordinator_test_email" defaultValue={settings?.regional_coordinator_test_email ?? ''} type="email" placeholder="Only used in stage-specific mode" />
              <LabeledInput label="Events Team test email" name="events_team_test_email" defaultValue={settings?.events_team_test_email ?? ''} type="email" placeholder="Only used in stage-specific mode" />
              <LabeledInput label="Finance Team test email" name="finance_team_test_email" defaultValue={settings?.finance_team_test_email ?? ''} type="email" placeholder="Only used in stage-specific mode" />
              <LabeledInput label="Accounts Team test email" name="accounts_team_test_email" defaultValue={settings?.accounts_team_test_email ?? ''} type="email" placeholder="Only used in stage-specific mode" />
              <LabeledInput label="Admin test email" name="admin_test_email" defaultValue={settings?.admin_test_email ?? ''} type="email" placeholder="Only used in stage-specific mode" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <LabeledInput label="Default region/event root" name="drive_default_root_url" defaultValue={settings?.drive_default_root_url ?? ''} type="url" />
              <LabeledInput label="Default proposal root" name="drive_default_proposal_root_url" defaultValue={settings?.drive_default_proposal_root_url ?? ''} type="url" />
              <LabeledInput label="Default media root" name="drive_default_media_root_url" defaultValue={settings?.drive_default_media_root_url ?? ''} type="url" />
              <LabeledInput label="Default report root" name="drive_default_report_root_url" defaultValue={settings?.drive_default_report_root_url ?? ''} type="url" />
              <LabeledInput label="Default invoice root" name="drive_default_invoice_root_url" defaultValue={settings?.drive_default_invoice_root_url ?? ''} type="url" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-800">Admin note for region setup</label>
              <textarea
                name="regions_note"
                defaultValue={settings?.regions_note ?? ''}
                rows={2}
                placeholder="Optional note shown to admins about region setup"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none ring-0 transition focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button className="rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(22,163,74,0.28)]">
                Save Settings
              </button>
              <p className="max-w-3xl text-sm text-slate-500">
                One-click mode only needs the Apps Script URL and shared secret. Root fields are optional advanced overrides when you want the app to steer certain regions or document types into dedicated folders.
              </p>
            </div>
          </form>
        </SectionBlock>
        </section>

        <section id="regions">
        <SectionBlock
          title="Region Master"
          subtitle="Regions control registration, event-code generation, and optional Drive routing overrides."
        >
          <div className="grid gap-6">
            <Card className="rounded-[1.5rem] border-slate-200/80">
              <CardContent className="p-6">
                <form action={addRegion} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <LabeledInput label="Region name" name="region_name" placeholder="Add region, e.g. Pune" />
                  <LabeledInput label="Region event root" name="drive_root_url" type="url" />
                  <LabeledInput label="Proposal root" name="proposal_root_url" type="url" />
                  <LabeledInput label="Media root" name="media_root_url" type="url" />
                  <LabeledInput label="Report root" name="report_root_url" type="url" />
                  <LabeledInput label="Invoice root" name="invoice_root_url" type="url" />
                  <div className="xl:col-span-3">
                    <button className="rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(22,163,74,0.28)]">
                      Add Region
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {regions.length === 0 ? (
              <EmptyState
                title="No regions configured yet"
                message="Add the first region to make registration, event creation, and region-aware Drive routing available."
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {regions.map((region) => (
                  <form key={region.id} action={updateRegion} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-[0_16px_32px_rgba(15,23,42,0.04)]">
                    <input type="hidden" name="region_id" value={region.id} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <LabeledInput label="Region name" name="name" defaultValue={region.name} />
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-800">Status</label>
                        <select
                          name="is_active"
                          defaultValue={region.is_active ? 'true' : 'false'}
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-emerald-500"
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </div>
                      <LabeledInput label="Region event root" name="drive_root_url" defaultValue={region.drive_root_url ?? ''} type="url" />
                      <LabeledInput label="Proposal root" name="proposal_root_url" defaultValue={region.proposal_root_url ?? ''} type="url" />
                      <LabeledInput label="Media root" name="media_root_url" defaultValue={region.media_root_url ?? ''} type="url" />
                      <LabeledInput label="Report root" name="report_root_url" defaultValue={region.report_root_url ?? ''} type="url" />
                      <LabeledInput label="Invoice root" name="invoice_root_url" defaultValue={region.invoice_root_url ?? ''} type="url" />
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        Save Region
                      </button>
                    </div>
                  </form>
                ))}
              </div>
            )}
          </div>
        </SectionBlock>
        </section>

        <section id="roles">
        <SectionBlock
          title="Role Distribution"
          subtitle="Quick view of current user coverage across the workflow."
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {(Object.keys(ROLE_LABELS) as Array<keyof typeof ROLE_LABELS>).map((role) => (
              <Card key={role} className="rounded-[1.4rem] border-slate-200/80">
                <CardContent className="space-y-2 p-5 text-center">
                  <p className="text-3xl font-semibold text-emerald-700">{byRole[role] ?? 0}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{ROLE_LABELS[role]}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </SectionBlock>
        </section>

        <section id="users">
        <SectionBlock
          title="User Access And Approval"
          subtitle="Approve new registrations, assign workflow roles, and manage account availability."
        >
          <Card className="rounded-[1.5rem] border-slate-200/80">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left">
                    <tr className="border-b border-slate-200/80">
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Name</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Email</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Role And Approval</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Region</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Joined</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100 align-top transition hover:bg-slate-50/80">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-semibold text-emerald-700">
                              {entry.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{entry.full_name}</p>
                              <p className="text-xs text-slate-500">{entry.phone || 'No phone on file'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-slate-600">{entry.email}</td>
                        <td className="px-6 py-5">
                          <form action={updateUserAccess} className="space-y-3">
                            <input type="hidden" name="user_id" value={entry.id} />
                            <select
                              name="role"
                              defaultValue={entry.role}
                              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-emerald-500"
                            >
                              {ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </option>
                              ))}
                            </select>
                            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                              <select
                                name="approval_status"
                                defaultValue={entry.approval_status}
                                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-emerald-500"
                              >
                                {APPROVAL_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {approvalLabel(status)}
                                  </option>
                                ))}
                              </select>
                              <select
                                name="is_active"
                                defaultValue={entry.is_active ? 'true' : 'false'}
                                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-emerald-500"
                              >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                              <button className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                                Save
                              </button>
                            </div>
                          </form>
                        </td>
                        <td className="px-6 py-5 text-slate-600">{entry.region || '—'}</td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-2">
                            <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${activePillClass(entry.is_active)}`}>
                              {entry.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusPillClass(entry.approval_status)}`}>
                              {approvalLabel(entry.approval_status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-xs text-slate-500">{formatDate(entry.created_at)}</td>
                        <td className="px-6 py-5 text-xs leading-5 text-slate-500">
                          Access changes apply on the user&apos;s next refresh or login.
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </SectionBlock>
        </section>

        <section id="templates">
        <SectionBlock
          title="Email Templates By Role"
          subtitle="Tailor communication per recipient role while keeping the notification engine centralized."
        >
          <div className="grid gap-6">
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/90 px-5 py-4 text-sm text-slate-600">
              Available placeholders: {'{{recipient_name}}'}, {'{{recipient_role}}'}, {'{{event_title}}'}, {'{{event_code}}'}, {'{{event_status}}'}, {'{{event_region}}'}, {'{{event_date}}'}, {'{{event_location}}'}, {'{{notification_title}}'}, {'{{notification_message}}'}, {'{{event_link}}'}, {'{{media_drive_link}}'}
            </div>

            {ROLES.map((role) => (
              <div key={role} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-[0_16px_32px_rgba(15,23,42,0.04)]">
                <div className="mb-5">
                  <h3 className="text-lg font-semibold text-slate-900">{ROLE_LABELS[role]}</h3>
                  <p className="mt-1 text-sm text-slate-500">Templates for notifications received by this role.</p>
                </div>

                <div className="grid gap-4">
                  {NOTIFICATION_TYPES.map((notificationType) => {
                    const template = findTemplate(role, notificationType)
                    return (
                      <form key={`${role}-${notificationType}`} action={updateTemplate} className="rounded-[1.3rem] border border-slate-200/80 bg-slate-50/70 p-4">
                        <input type="hidden" name="recipient_role" value={role} />
                        <input type="hidden" name="notification_type" value={notificationType} />

                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold capitalize text-slate-900">{notificationType.replace('_', ' ')}</p>
                            <p className="text-xs text-slate-500">Customize subject and body for this role/type pair.</p>
                          </div>
                          <select
                            name="is_active"
                            defaultValue={template?.is_active ? 'true' : 'false'}
                            className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-emerald-500"
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </div>

                        <div className="grid gap-4">
                          <LabeledInput label="Email subject template" name="subject_template" defaultValue={template?.subject_template ?? ''} />
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-800">Email body template</label>
                            <textarea
                              name="body_template"
                              defaultValue={template?.body_template ?? ''}
                              rows={7}
                              placeholder="Email body template"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none ring-0 transition focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <button className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white">
                            Save Template
                          </button>
                        </div>
                      </form>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </SectionBlock>
        </section>
      </PageShell>
    </div>
  )
}

function LabeledInput({
  label,
  name,
  defaultValue,
  type = 'text',
  placeholder,
}: {
  label: string
  name: string
  defaultValue?: string
  type?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-800">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-emerald-500"
      />
    </div>
  )
}
