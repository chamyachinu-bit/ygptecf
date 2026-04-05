import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { PasswordInput } from '@/components/ui/password-input'
import { SaveToast } from '@/components/ui/save-toast'
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

type AdminSettingsView = 'overview' | 'settings' | 'regions' | 'roles' | 'users' | 'templates'

const ROLES: UserRole[] = [
  'regional_coordinator',
  'events_team',
  'finance_team',
  'accounts_team',
  'bot',
  'designer',
  'social_media_team',
  'admin',
]
const NOTIFICATION_TYPES: NotificationType[] = ['approval_required', 'status_changed', 'budget_flagged', 'event_reminder', 'report_due']
const APPROVAL_STATUSES: ProfileApprovalStatus[] = ['pending_admin_approval', 'approved', 'rejected']
const SAVED_MESSAGES: Record<string, string> = {
  settings: 'Settings saved',
  region: 'Region saved',
  access: 'Access updated',
  password: 'New password saved',
  template: 'Template saved',
  user: 'User deleted',
}

const SETTINGS_VIEWS: Array<{ view: AdminSettingsView; label: string }> = [
  { view: 'overview', label: 'Overview' },
  { view: 'settings', label: 'System Settings' },
  { view: 'regions', label: 'Regions' },
  { view: 'roles', label: 'Role Counts' },
  { view: 'users', label: 'User Access' },
  { view: 'templates', label: 'Email Templates' },
]

function savedRedirect(saved: keyof typeof SAVED_MESSAGES, view: AdminSettingsView) {
  return `/dashboard/admin/users?view=${view}&saved=${saved}`
}

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
      return 'app-success-soft'
    case 'rejected':
      return 'app-danger-soft'
    default:
      return 'app-warning-soft'
  }
}

function activePillClass(isActive: boolean) {
  return isActive
    ? 'app-success-soft'
    : 'app-danger-soft'
}

function regionAccessLabel(entry: Profile) {
  if (entry.region) return entry.region
  return entry.role === 'regional_coordinator' ? 'No region assigned' : 'All regions'
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ saved?: string; view?: string; user_q?: string }> }) {
  const params = await searchParams
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
  const savedMessage = params.saved ? SAVED_MESSAGES[params.saved] ?? 'Saved' : null
  const currentView: AdminSettingsView = SETTINGS_VIEWS.some((item) => item.view === params.view)
    ? (params.view as AdminSettingsView)
    : 'overview'
  const userQuery = (params.user_q ?? '').trim().toLowerCase()

  const byRole = users.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.role] = (acc[entry.role] || 0) + 1
    return acc
  }, {})
  const filteredUsers = users.filter((entry) => {
    if (!userQuery) return true
    const haystack = `${entry.full_name} ${entry.email} ${entry.role} ${entry.region ?? ''}`.toLowerCase()
    return haystack.includes(userQuery)
  })

  async function updateUserAccess(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const userId = String(formData.get('user_id') || '')
    const fullName = String(formData.get('full_name') || '').trim()
    const role = String(formData.get('role') || '') as UserRole
    const isActive = formData.get('is_active') === 'true'
    const approvalStatus = String(formData.get('approval_status') || '') as ProfileApprovalStatus
    const region = String(formData.get('region') || '').trim()

    if (!userId || !fullName || !ROLES.includes(role) || !APPROVAL_STATUSES.includes(approvalStatus)) return

    await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        role,
        region: region || null,
        is_active: isActive,
        approval_status: approvalStatus,
        approved_at: approvalStatus === 'approved' ? new Date().toISOString() : null,
        approved_by: approvalStatus === 'approved' ? adminUserId : null,
      })
      .eq('id', userId)

    revalidatePath('/dashboard/admin/users')
    redirect(savedRedirect('access', 'users'))
  }

  async function updateSettings(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const mediaDriveUrl = String(formData.get('media_drive_url') || '').trim()
    const notificationTestEmail = String(formData.get('notification_test_email') || '').trim()
    const demoAutofillEnabled = formData.get('demo_autofill_enabled') === 'true'
    const notificationTestMode = String(formData.get('notification_test_mode') || 'all_stages').trim() as AppSettings['notification_test_mode']
    const regionalCoordinatorTestEmail = String(formData.get('regional_coordinator_test_email') || '').trim()
    const eventsTeamTestEmail = String(formData.get('events_team_test_email') || '').trim()
    const financeTeamTestEmail = String(formData.get('finance_team_test_email') || '').trim()
    const accountsTeamTestEmail = String(formData.get('accounts_team_test_email') || '').trim()
    const botTestEmail = String(formData.get('bot_test_email') || '').trim()
    const designerTestEmail = String(formData.get('designer_test_email') || '').trim()
    const socialMediaTeamTestEmail = String(formData.get('social_media_team_test_email') || '').trim()
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
      demo_autofill_enabled: demoAutofillEnabled,
      notification_test_email: notificationTestEmail || null,
      notification_test_mode: notificationTestMode || 'all_stages',
      regional_coordinator_test_email: regionalCoordinatorTestEmail || null,
      events_team_test_email: eventsTeamTestEmail || null,
      finance_team_test_email: financeTeamTestEmail || null,
      accounts_team_test_email: accountsTeamTestEmail || null,
      bot_test_email: botTestEmail || null,
      designer_test_email: designerTestEmail || null,
      social_media_team_test_email: socialMediaTeamTestEmail || null,
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
    redirect(savedRedirect('settings', 'settings'))
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
    redirect(savedRedirect('region', 'regions'))
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
    redirect(savedRedirect('region', 'regions'))
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
    redirect(savedRedirect('template', 'templates'))
  }

  async function updateUserPassword(formData: FormData) {
    'use server'
    const serviceSupabase = await createServiceClient()
    const userId = String(formData.get('user_id') || '')
    const password = String(formData.get('new_password') || '')

    if (!userId || password.trim().length < 8) return

    await serviceSupabase.auth.admin.updateUserById(userId, {
      password: password.trim(),
    })

    revalidatePath('/dashboard/admin/users')
    redirect(savedRedirect('password', 'users'))
  }

  async function deleteUser(formData: FormData) {
    'use server'
    const serviceSupabase = await createServiceClient()
    const userId = String(formData.get('user_id') || '')

    if (!userId || userId === adminUserId) return

    await serviceSupabase.auth.admin.deleteUser(userId)

    revalidatePath('/dashboard/admin/users')
    redirect(savedRedirect('user', 'users'))
  }

  const findTemplate = (recipientRole: UserRole, notificationType: NotificationType) =>
    templates.find((entry) => entry.recipient_role === recipientRole && entry.notification_type === notificationType)

  return (
    <div>
      {savedMessage ? <SaveToast message={savedMessage} /> : null}
      <Header
        title="Settings And Control Center"
        subtitle="Manage approvals, routing, automation, and communication settings from one executive workspace."
        eyebrow="Settings"
      />

      <PageShell>
        <StatGrid className="xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard label="Users in system" value={String(users.length)} helper="Approved and pending accounts" />
          <StatCard label="Pending approval" value={String(users.filter((entry) => entry.approval_status === 'pending_admin_approval').length)} helper="Needs admin review" />
          <StatCard label="Active regions" value={String(regions.filter((entry) => entry.is_active).length)} helper="Available in registration and EPF" />
          <StatCard label="Templates live" value={String(templates.filter((entry) => entry.is_active).length)} helper="Role-specific notification copy" />
          <StatCard label="Drive automation" value={settings?.drive_apps_script_url ? 'Connected' : 'Pending'} helper="Apps Script workflow bridge" />
          <StatCard label="Test inbox" value={settings?.notification_test_email ? 'Enabled' : 'Off'} helper={settings?.notification_test_email ?? 'No email override'} />
        </StatGrid>

        <div className="app-panel sticky top-[76px] z-20 rounded-[1.4rem] p-3 backdrop-blur">
          <div className="flex flex-wrap gap-2">
            {SETTINGS_VIEWS.map((item) => (
              <Link
                key={item.view}
                href={`/dashboard/admin/users?view=${item.view}`}
                scroll={false}
                className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                  currentView === item.view
                    ? 'app-success-soft'
                    : 'app-panel-soft app-text-muted hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text-strong)]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {currentView === 'overview' && (
          <SectionBlock
            title="Settings Overview"
            subtitle="Choose a focused admin section below so you can work without scrolling through the entire control center."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {SETTINGS_VIEWS.filter((item) => item.view !== 'overview').map((item) => (
                <Link
                  key={item.view}
                  href={`/dashboard/admin/users?view=${item.view}`}
                  scroll={false}
                  className="app-panel rounded-[1.4rem] p-5 transition hover:border-emerald-500/25 hover:bg-[var(--app-surface-soft)]"
                >
                  <p className="app-text-strong text-sm font-semibold">{item.label}</p>
                  <p className="app-text-muted mt-2 text-sm">
                    Open the dedicated {item.label.toLowerCase()} workspace.
                  </p>
                </Link>
              ))}
            </div>
          </SectionBlock>
        )}

        {currentView === 'settings' && (
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
                <label className="app-text text-sm font-medium">Temporary demo autofill</label>
                <select
                  name="demo_autofill_enabled"
                  defaultValue={settings?.demo_autofill_enabled ? 'true' : 'false'}
                  className="app-field h-12 w-full rounded-2xl px-4 text-sm outline-none transition"
                >
                  <option value="false">Disabled</option>
                  <option value="true">Enabled</option>
                </select>
                <p className="app-text-subtle text-xs">
                  Controls whether proposal and ECR test-data autofill is available to users.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1.5">
                <label className="app-text text-sm font-medium">Temporary email routing mode</label>
                <select
                  name="notification_test_mode"
                  defaultValue={settings?.notification_test_mode ?? 'all_stages'}
                  className="app-field h-12 w-full rounded-2xl px-4 text-sm outline-none transition"
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
              <LabeledInput label="BOT test email" name="bot_test_email" defaultValue={settings?.bot_test_email ?? ''} type="email" placeholder="Only used in stage-specific mode" />
              <LabeledInput label="Designer test email" name="designer_test_email" defaultValue={settings?.designer_test_email ?? ''} type="email" placeholder="Only used in stage-specific mode" />
              <LabeledInput label="Social Media Team test email" name="social_media_team_test_email" defaultValue={settings?.social_media_team_test_email ?? ''} type="email" placeholder="Only used in stage-specific mode" />
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
              <p className="app-text-muted max-w-3xl text-sm">
                One-click mode only needs the Apps Script URL and shared secret. Root fields are optional advanced overrides when you want the app to steer certain regions or document types into dedicated folders.
              </p>
            </div>
          </form>
        </SectionBlock>
        )}

        {currentView === 'regions' && (
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
                  <form key={region.id} action={updateRegion} className="app-panel rounded-[1.5rem] p-5">
                    <input type="hidden" name="region_id" value={region.id} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <LabeledInput label="Region name" name="name" defaultValue={region.name} />
                      <div className="space-y-1.5">
                        <label className="app-text text-sm font-medium">Status</label>
                        <select
                          name="is_active"
                          defaultValue={region.is_active ? 'true' : 'false'}
                          className="app-field h-12 w-full rounded-2xl px-4 text-sm outline-none transition"
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
                      <button className="app-field app-text rounded-2xl px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--app-surface-soft)]">
                        Save Region
                      </button>
                    </div>
                  </form>
                ))}
              </div>
            )}
          </div>
        </SectionBlock>
        )}

        {currentView === 'roles' && (
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
        )}

        {currentView === 'users' && (
        <SectionBlock
          title="User Access And Approval"
          subtitle="Approve new registrations, update names and workflow roles, and manage account availability."
        >
          <div className="space-y-4">
            <div className="app-panel-soft flex flex-col gap-3 rounded-[1.35rem] px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="app-text-strong text-sm font-semibold">User directory</p>
                <p className="app-text-subtle text-xs">
                  Showing {filteredUsers.length} of {users.length} accounts
                </p>
              </div>
              <form action="/dashboard/admin/users" className="grid gap-3 md:min-w-[360px] md:grid-cols-[1fr_auto]">
                <input type="hidden" name="view" value="users" />
                <input
                  type="text"
                  name="user_q"
                  defaultValue={params.user_q ?? ''}
                  placeholder="Search by name, email, role, or region"
                  className="app-field h-11 rounded-2xl px-4 text-sm outline-none transition"
                />
                <button className="rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(22,163,74,0.24)]">
                  Search
                </button>
              </form>
            </div>

            {filteredUsers.length === 0 ? (
              <EmptyState
                title="No users match this search"
                message="Try a different name, email, role, or region filter."
              />
            ) : (
              <div className="grid gap-4">
                {filteredUsers.map((entry) => (
                  <Card key={entry.id} className="rounded-[1.5rem]">
                    <CardContent className="p-5 md:p-6">
                      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.2fr_0.95fr]">
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="app-success-soft flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold">
                              {entry.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="app-text-strong text-lg font-semibold leading-6">{entry.full_name}</p>
                              <p className="app-text-muted break-all text-sm">{entry.email}</p>
                              <p className="app-text-subtle mt-1 text-xs">{entry.phone || 'No phone on file'}</p>
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                            <div className="app-panel-soft rounded-2xl px-4 py-3">
                              <p className="app-text-subtle text-[11px] font-semibold uppercase tracking-[0.14em]">Region access</p>
                              <p className="app-text mt-2 text-sm font-medium">{regionAccessLabel(entry)}</p>
                            </div>
                            <div className="app-panel-soft rounded-2xl px-4 py-3">
                              <p className="app-text-subtle text-[11px] font-semibold uppercase tracking-[0.14em]">Joined</p>
                              <p className="app-text mt-2 text-sm font-medium">{formatDate(entry.created_at)}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${activePillClass(entry.is_active)}`}>
                              {entry.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusPillClass(entry.approval_status)}`}>
                              {approvalLabel(entry.approval_status)}
                            </span>
                          </div>
                        </div>

                        <form action={updateUserAccess} className="space-y-3">
                          <input type="hidden" name="user_id" value={entry.id} />
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1.5">
                              <label className="app-text-subtle text-[11px] font-semibold uppercase tracking-[0.14em]">Full name</label>
                              <input
                                type="text"
                                name="full_name"
                                defaultValue={entry.full_name}
                                className="app-field h-11 w-full rounded-2xl px-4 text-sm outline-none transition"
                                placeholder="Full name"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="app-text-subtle text-[11px] font-semibold uppercase tracking-[0.14em]">Role</label>
                              <select
                                name="role"
                                defaultValue={entry.role}
                                className="app-field h-11 w-full rounded-2xl px-4 text-sm outline-none transition"
                              >
                                {ROLES.map((role) => (
                                  <option key={role} value={role}>
                                    {ROLE_LABELS[role]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="app-text-subtle text-[11px] font-semibold uppercase tracking-[0.14em]">Region</label>
                              <select
                                name="region"
                                defaultValue={entry.region ?? ''}
                                className="app-field h-11 rounded-2xl px-4 text-sm outline-none transition"
                              >
                                <option value="">
                                  {entry.role === 'regional_coordinator' ? 'No region assigned' : 'All regions / No restriction'}
                                </option>
                                {regions
                                  .filter((region) => region.is_active || region.name === entry.region)
                                  .map((region) => (
                                    <option key={region.id} value={region.name}>
                                      {region.name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="app-text-subtle text-[11px] font-semibold uppercase tracking-[0.14em]">Approval</label>
                              <select
                                name="approval_status"
                                defaultValue={entry.approval_status}
                                className="app-field h-11 rounded-2xl px-4 text-sm outline-none transition"
                              >
                                {APPROVAL_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {approvalLabel(status)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1.5 md:max-w-[220px]">
                              <label className="app-text-subtle text-[11px] font-semibold uppercase tracking-[0.14em]">Account state</label>
                              <select
                                name="is_active"
                                defaultValue={entry.is_active ? 'true' : 'false'}
                                className="app-field h-11 rounded-2xl px-4 text-sm outline-none transition"
                              >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <button className="app-field app-text rounded-2xl px-5 py-2.5 text-sm font-semibold transition hover:bg-[var(--app-surface-soft)]">
                              Save Access
                            </button>
                          </div>
                        </form>

                        <div className="space-y-3">
                          <div className="app-panel-soft rounded-2xl px-4 py-3">
                            <p className="app-text-subtle text-[11px] font-semibold uppercase tracking-[0.14em]">Password reset</p>
                            <form action={updateUserPassword} className="mt-3 space-y-2">
                              <input type="hidden" name="user_id" value={entry.id} />
                              <PasswordInput
                                name="new_password"
                                minLength={8}
                                placeholder="Set new password"
                              />
                              <button className="app-success-soft w-full rounded-2xl px-4 py-2.5 text-sm font-semibold transition hover:brightness-[1.03]">
                                Save New Password
                              </button>
                            </form>
                          </div>

                          <div className="app-panel-soft rounded-2xl px-4 py-3">
                            <p className="app-text-subtle text-[11px] font-semibold uppercase tracking-[0.14em]">Admin notes</p>
                            <div className="mt-3 space-y-2">
                              <p className="app-text-subtle text-xs leading-5">
                                Existing passwords cannot be viewed for security reasons. Admin can securely set a fresh password here.
                              </p>
                              <p className="app-text-subtle text-xs leading-5">
                                Access changes apply on the user&apos;s next refresh or login.
                              </p>
                            </div>
                          </div>

                          <form action={deleteUser}>
                            <input type="hidden" name="user_id" value={entry.id} />
                            <button
                              className="app-danger-soft w-full rounded-2xl px-4 py-2.5 text-sm font-semibold transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={entry.id === adminUserId}
                            >
                              {entry.id === adminUserId ? 'Current admin cannot be deleted here' : 'Delete User'}
                            </button>
                          </form>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </SectionBlock>
        )}

        {currentView === 'templates' && (
        <SectionBlock
          title="Email Templates By Role"
          subtitle="Tailor communication per recipient role while keeping the notification engine centralized."
        >
          <div className="grid gap-6">
            <div className="app-panel-soft rounded-[1.5rem] px-5 py-4 text-sm app-text-muted">
              Available placeholders: {'{{recipient_name}}'}, {'{{recipient_role}}'}, {'{{event_title}}'}, {'{{event_code}}'}, {'{{event_status}}'}, {'{{event_region}}'}, {'{{event_date}}'}, {'{{event_location}}'}, {'{{notification_title}}'}, {'{{notification_message}}'}, {'{{event_link}}'}, {'{{media_drive_link}}'}
            </div>

            {ROLES.map((role) => (
              <div key={role} className="app-panel rounded-[1.5rem] p-5">
                <div className="mb-5">
                  <h3 className="app-text-strong text-lg font-semibold">{ROLE_LABELS[role]}</h3>
                  <p className="app-text-muted mt-1 text-sm">Templates for notifications received by this role.</p>
                </div>

                <div className="grid gap-4">
                  {NOTIFICATION_TYPES.map((notificationType) => {
                    const template = findTemplate(role, notificationType)
                    return (
                      <form key={`${role}-${notificationType}`} action={updateTemplate} className="app-panel-soft rounded-[1.3rem] p-4">
                        <input type="hidden" name="recipient_role" value={role} />
                        <input type="hidden" name="notification_type" value={notificationType} />

                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="app-text-strong text-sm font-semibold capitalize">{notificationType.replace('_', ' ')}</p>
                            <p className="app-text-subtle text-xs">Customize subject and body for this role/type pair.</p>
                          </div>
                          <select
                            name="is_active"
                            defaultValue={template?.is_active ? 'true' : 'false'}
                            className="app-field h-10 rounded-2xl px-4 text-sm outline-none transition"
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </div>

                        <div className="grid gap-4">
                          <LabeledInput label="Email subject template" name="subject_template" defaultValue={template?.subject_template ?? ''} />
                          <div className="space-y-1.5">
                            <label className="app-text text-sm font-medium">Email body template</label>
                            <textarea
                              name="body_template"
                              defaultValue={template?.body_template ?? ''}
                              rows={7}
                              placeholder="Email body template"
                              className="app-field w-full rounded-2xl px-4 py-3 text-sm outline-none ring-0 transition"
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <button className="app-field app-text rounded-2xl px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--app-surface-soft)]">
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
        )}
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
      <label className="app-text text-sm font-medium">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="app-field flex h-12 w-full rounded-2xl px-4 py-2 text-sm outline-none ring-0 transition"
      />
    </div>
  )
}
