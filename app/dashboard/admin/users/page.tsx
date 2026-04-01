import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

    await supabase.from('regions').update({
      name,
      is_active: isActive,
      drive_root_url: driveRootUrl || null,
      proposal_root_url: proposalRootUrl || null,
      media_root_url: mediaRootUrl || null,
      report_root_url: reportRootUrl || null,
      invoice_root_url: invoiceRootUrl || null,
    }).eq('id', regionId)

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
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold">Admin Control Center</h1>
        <p className="text-sm text-gray-500 mt-0.5">{users.length} total users</p>
      </div>

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateSettings} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="url"
                  name="drive_apps_script_url"
                  defaultValue={settings?.drive_apps_script_url ?? ''}
                  placeholder="Drive Apps Script webhook URL"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  name="drive_apps_script_secret"
                  defaultValue={settings?.drive_apps_script_secret ?? ''}
                  placeholder="Drive Apps Script shared secret"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="url"
                  name="media_drive_url"
                  defaultValue={settings?.media_drive_url ?? ''}
                  placeholder="Fallback shared drive link"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                <input
                  type="email"
                  name="notification_test_email"
                  defaultValue={settings?.notification_test_email ?? ''}
                  placeholder="kokatenakul111@gmail.com"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="url"
                  name="drive_default_root_url"
                  defaultValue={settings?.drive_default_root_url ?? ''}
                  placeholder="Default region/event root"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                <input
                  type="url"
                  name="drive_default_proposal_root_url"
                  defaultValue={settings?.drive_default_proposal_root_url ?? ''}
                  placeholder="Default proposal root"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                <input
                  type="url"
                  name="drive_default_media_root_url"
                  defaultValue={settings?.drive_default_media_root_url ?? ''}
                  placeholder="Default media root"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                <input
                  type="url"
                  name="drive_default_report_root_url"
                  defaultValue={settings?.drive_default_report_root_url ?? ''}
                  placeholder="Default report root"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                <input
                  type="url"
                  name="drive_default_invoice_root_url"
                  defaultValue={settings?.drive_default_invoice_root_url ?? ''}
                  placeholder="Default invoice root"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm md:col-span-2"
                />
              </div>
              <textarea
                name="regions_note"
                defaultValue={settings?.regions_note ?? ''}
                rows={2}
                placeholder="Optional note shown to admins about region setup"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <div className="flex items-center gap-3">
                <button className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                  Save Settings
                </button>
                <p className="text-sm text-gray-500">
                  Configure Drive automation here. If region-specific roots are missing, the app falls back to these defaults.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Region Master</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={addRegion} className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                name="region_name"
                placeholder="Add region, e.g. Pune"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <input
                type="url"
                name="drive_root_url"
                placeholder="Region event root"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <input
                type="url"
                name="proposal_root_url"
                placeholder="Proposal root"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <input
                type="url"
                name="media_root_url"
                placeholder="Media root"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <input
                type="url"
                name="report_root_url"
                placeholder="Report root"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <input
                type="url"
                name="invoice_root_url"
                placeholder="Invoice root"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <button className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 md:col-span-2">
                Add Region
              </button>
            </form>

            <div className="grid gap-3 md:grid-cols-2">
              {regions.map((region) => (
                <form key={region.id} action={updateRegion} className="rounded-lg border border-gray-200 p-3 space-y-2">
                  <input type="hidden" name="region_id" value={region.id} />
                  <input
                    type="text"
                    name="name"
                    defaultValue={region.name}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="url"
                    name="drive_root_url"
                    defaultValue={region.drive_root_url ?? ''}
                    placeholder="Region event root"
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      type="url"
                      name="proposal_root_url"
                      defaultValue={region.proposal_root_url ?? ''}
                      placeholder="Proposal root"
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                    <input
                      type="url"
                      name="media_root_url"
                      defaultValue={region.media_root_url ?? ''}
                      placeholder="Media root"
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                    <input
                      type="url"
                      name="report_root_url"
                      defaultValue={region.report_root_url ?? ''}
                      placeholder="Report root"
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                    <input
                      type="url"
                      name="invoice_root_url"
                      defaultValue={region.invoice_root_url ?? ''}
                      placeholder="Invoice root"
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      name="is_active"
                      defaultValue={region.is_active ? 'true' : 'false'}
                      className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                    <button className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium hover:bg-gray-100">
                      Save Region
                    </button>
                  </div>
                </form>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(Object.keys(ROLE_LABELS) as Array<keyof typeof ROLE_LABELS>).map((role) => (
            <Card key={role}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{byRole[role] ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">{ROLE_LABELS[role]}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Access & Approval</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Role / Approval</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Region</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50 align-top">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-xs">
                            {entry.full_name.charAt(0)}
                          </div>
                          <span className="font-medium">{entry.full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{entry.email}</td>
                      <td className="px-6 py-4">
                        <form action={updateUserAccess} className="space-y-2">
                          <input type="hidden" name="user_id" value={entry.id} />
                          <select
                            name="role"
                            defaultValue={entry.role}
                            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-2">
                            <select
                              name="approval_status"
                              defaultValue={entry.approval_status}
                              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
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
                              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
                            >
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                            <button className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium hover:bg-gray-100">
                              Save
                            </button>
                          </div>
                        </form>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{entry.region || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                            entry.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {entry.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                            entry.approval_status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : entry.approval_status === 'rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {approvalLabel(entry.approval_status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{formatDate(entry.created_at)}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        Access changes apply on the user&apos;s next refresh/login.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Templates By Role</CardTitle>
            <p className="text-sm text-gray-500">
              Available placeholders: {'{{recipient_name}}'}, {'{{recipient_role}}'}, {'{{event_title}}'}, {'{{event_code}}'}, {'{{event_status}}'}, {'{{event_region}}'}, {'{{event_date}}'}, {'{{event_location}}'}, {'{{notification_title}}'}, {'{{notification_message}}'}, {'{{event_link}}'}, {'{{media_drive_link}}'}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {ROLES.map((role) => (
              <div key={role} className="space-y-4 rounded-xl border border-gray-200 p-4">
                <div>
                  <h3 className="font-semibold">{ROLE_LABELS[role]}</h3>
                  <p className="text-sm text-gray-500">Templates for notifications received by this role.</p>
                </div>

                <div className="grid gap-4">
                  {NOTIFICATION_TYPES.map((notificationType) => {
                    const template = findTemplate(role, notificationType)
                    return (
                      <form key={`${role}-${notificationType}`} action={updateTemplate} className="rounded-lg border border-gray-200 p-4 space-y-3">
                        <input type="hidden" name="recipient_role" value={role} />
                        <input type="hidden" name="notification_type" value={notificationType} />

                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{notificationType}</p>
                            <p className="text-xs text-gray-500">Customize subject and body for this role/type pair.</p>
                          </div>
                          <select
                            name="is_active"
                            defaultValue={template?.is_active ? 'true' : 'false'}
                            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </div>

                        <input
                          type="text"
                          name="subject_template"
                          defaultValue={template?.subject_template ?? ''}
                          placeholder="Email subject template"
                          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                        />

                        <textarea
                          name="body_template"
                          defaultValue={template?.body_template ?? ''}
                          rows={7}
                          placeholder="Email body template"
                          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                        />

                        <div className="flex justify-end">
                          <button className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium hover:bg-gray-100">
                            Save Template
                          </button>
                        </div>
                      </form>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
