import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type UserRole =
  | 'regional_coordinator'
  | 'events_team'
  | 'finance_team'
  | 'accounts_team'
  | 'admin'

type NotificationType =
  | 'approval_required'
  | 'status_changed'
  | 'budget_flagged'
  | 'event_reminder'
  | 'report_due'

type NotificationRecord = {
  id: string
  user_id: string
  event_id: string | null
  type: NotificationType
  title: string
  message: string
  email_sent: boolean
  created_at?: string
  email_delivery_key?: string | null
  email_delivery_status?: string | null
  email_delivery_attempts?: number | null
}

type ProfileRecord = {
  email: string
  full_name: string
  role: UserRole
}

type EventRecord = {
  id: string
  event_code: string | null
  title: string
  status: string
  region: string | null
  event_date: string | null
  location: string | null
}

type AppSettingsRecord = {
  media_drive_url: string | null
  notification_test_email: string | null
  notification_test_mode?: 'off' | 'all_stages' | 'stage_specific' | null
  regional_coordinator_test_email?: string | null
  events_team_test_email?: string | null
  finance_team_test_email?: string | null
  accounts_team_test_email?: string | null
  admin_test_email?: string | null
}

type NotificationTemplateRecord = {
  subject_template: string
  body_template: string
  is_active: boolean
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = Deno.env.get('APP_URL') || 'https://ygptecf.vercel.app'
const APP_NAME = 'YGPT EVENT Management System'
const APP_SHORT_NAME = 'YGPT EVENT'
const APP_LOGO_URL =
  'https://static.wixstatic.com/media/2f638f_7ecbf10649444c1c903f5054ccfbcec7~mv2.png/v1/fill/w_645,h_487,al_c/2f638f_7ecbf10649444c1c903f5054ccfbcec7~mv2.png'
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'YGPT EVENT <onboarding@resend.dev>'
const APPS_SCRIPT_WEBHOOK_URL = Deno.env.get('APPS_SCRIPT_WEBHOOK_URL')
const APPS_SCRIPT_SHARED_SECRET = Deno.env.get('APPS_SCRIPT_SHARED_SECRET')

const ROLE_LABELS: Record<UserRole, string> = {
  regional_coordinator: 'Regional Coordinator',
  events_team: 'Events Team',
  finance_team: 'Finance Team',
  accounts_team: 'Accounts Team',
  admin: 'Admin',
}

function getRoleSpecificTestEmail(role: UserRole, settings?: AppSettingsRecord | null) {
  if (!settings) return null

  switch (role) {
    case 'regional_coordinator':
      return settings.regional_coordinator_test_email?.trim() || null
    case 'events_team':
      return settings.events_team_test_email?.trim() || null
    case 'finance_team':
      return settings.finance_team_test_email?.trim() || null
    case 'accounts_team':
      return settings.accounts_team_test_email?.trim() || null
    case 'admin':
      return settings.admin_test_email?.trim() || null
  }
}

const DEFAULT_TEMPLATES: Record<
  UserRole,
  Partial<Record<NotificationType, { subject: string; body: string }>>
> = {
  regional_coordinator: {
    status_changed: {
      subject: 'YGPT EVENT: {{event_title}} status updated to {{event_status}}',
      body:
        'Hello {{recipient_name}},\n\nYour event "{{event_title}}" ({{event_code}}) is now "{{event_status}}".\n\nUpdate:\n{{notification_message}}\n\nRegion: {{event_region}}\nDate: {{event_date}}\nLocation: {{event_location}}\n\nOpen the system here:\n{{event_link}}\n',
    },
    approval_required: {
      subject: 'YGPT EVENT: action needed for {{event_title}}',
      body:
        'Hello {{recipient_name}},\n\nYour event "{{event_title}}" ({{event_code}}) needs attention.\n\nDetails:\n{{notification_message}}\n\nOpen the system here:\n{{event_link}}\n',
    },
    budget_flagged: {
      subject: 'YGPT EVENT: budget flagged for {{event_title}}',
      body:
        'Hello {{recipient_name}},\n\nThe budget for "{{event_title}}" ({{event_code}}) has been flagged.\n\nReason:\n{{notification_message}}\n\nOpen the system here:\n{{event_link}}\n',
    },
  },
  events_team: {
    approval_required: {
      subject: 'Events Team Review Needed: {{event_title}}',
      body:
        'Hello {{recipient_name}},\n\nA proposal is waiting for Events Team review.\n\nEvent: {{event_title}} ({{event_code}})\nRegion: {{event_region}}\nDate: {{event_date}}\nLocation: {{event_location}}\n\nNotes:\n{{notification_message}}\n\nReview it here:\n{{event_link}}\n',
    },
    status_changed: {
      subject: 'Events Team Update: {{event_title}} is {{event_status}}',
      body:
        'Hello {{recipient_name}},\n\nStatus update for "{{event_title}}" ({{event_code}}): {{event_status}}.\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n',
    },
    budget_flagged: {
      subject: 'Events Team Budget Alert: {{event_title}}',
      body:
        'Hello {{recipient_name}},\n\nA budget alert was raised for "{{event_title}}" ({{event_code}}).\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n',
    },
  },
  finance_team: {
    approval_required: {
      subject: 'Finance Review Needed: {{event_title}}',
      body:
        'Hello {{recipient_name}},\n\nA proposal is waiting for Finance review.\n\nEvent: {{event_title}} ({{event_code}})\nRegion: {{event_region}}\nDate: {{event_date}}\nLocation: {{event_location}}\n\nNotes:\n{{notification_message}}\n\nReview it here:\n{{event_link}}\n',
    },
    status_changed: {
      subject: 'Finance Update: {{event_title}} is {{event_status}}',
      body:
        'Hello {{recipient_name}},\n\nStatus update for "{{event_title}}" ({{event_code}}): {{event_status}}.\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n',
    },
    budget_flagged: {
      subject: 'Finance Budget Alert: {{event_title}}',
      body:
        'Hello {{recipient_name}},\n\nA budget alert was raised for "{{event_title}}" ({{event_code}}).\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n',
    },
  },
  accounts_team: {
    approval_required: {
      subject: 'Accounts Approval Needed: {{event_title}}',
      body:
        'Hello {{recipient_name}},\n\nA proposal is waiting for Accounts review.\n\nEvent: {{event_title}} ({{event_code}})\nRegion: {{event_region}}\nDate: {{event_date}}\nLocation: {{event_location}}\n\nNotes:\n{{notification_message}}\n\nReview it here:\n{{event_link}}\n',
    },
    status_changed: {
      subject: 'Accounts Update: {{event_title}} is {{event_status}}',
      body:
        'Hello {{recipient_name}},\n\nStatus update for "{{event_title}}" ({{event_code}}): {{event_status}}.\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n',
    },
    budget_flagged: {
      subject: 'Accounts Budget Alert: {{event_title}}',
      body:
        'Hello {{recipient_name}},\n\nA budget alert was raised for "{{event_title}}" ({{event_code}}).\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n',
    },
  },
  admin: {
    approval_required: {
      subject: 'Admin Alert: {{event_title}} needs attention',
      body:
        'Hello {{recipient_name}},\n\nAdministrative attention is needed for "{{event_title}}" ({{event_code}}).\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n',
    },
    status_changed: {
      subject: 'Admin Update: {{event_title}} is {{event_status}}',
      body:
        'Hello {{recipient_name}},\n\nStatus update for "{{event_title}}" ({{event_code}}): {{event_status}}.\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n',
    },
    budget_flagged: {
      subject: 'Admin Budget Alert: {{event_title}}',
      body:
        'Hello {{recipient_name}},\n\nA budget alert was raised for "{{event_title}}" ({{event_code}}).\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n',
    },
  },
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function applyTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => values[key] ?? '')
}

function toHtmlParagraphs(text: string) {
  return text
    .split('\n\n')
    .map((block) => `<p style="color:#374151;line-height:1.7;margin:0 0 16px">${escapeHtml(block).replaceAll('\n', '<br>')}</p>`)
    .join('')
}

function getNotificationTheme(status?: string | null, title?: string, message?: string) {
  const source = `${status ?? ''} ${title ?? ''} ${message ?? ''}`.toLowerCase()

  if (source.includes('reject')) {
    return {
      accent: '#dc2626',
      softBg: '#fef2f2',
      softText: '#991b1b',
      badge: 'Rejected',
      buttonText: 'Review rejection details',
    }
  }

  if (source.includes('hold') || source.includes('on_hold') || source.includes('on hold')) {
    return {
      accent: '#d97706',
      softBg: '#fffbeb',
      softText: '#92400e',
      badge: 'On Hold',
      buttonText: 'Review hold details',
    }
  }

  if (source.includes('approved') || source.includes('funded')) {
    return {
      accent: '#16a34a',
      softBg: '#f0fdf4',
      softText: '#166534',
      badge: 'Approved',
      buttonText: `Open in ${APP_SHORT_NAME}`,
    }
  }

  return {
    accent: '#16a34a',
    softBg: '#f0fdf4',
    softText: '#166534',
    badge: 'Update',
    buttonText: `Open in ${APP_SHORT_NAME}`,
  }
}

async function createDeliveryKey(notification: NotificationRecord) {
  const source = [
    notification.user_id,
    notification.event_id ?? '',
    notification.type,
    notification.title.trim(),
    notification.message.trim(),
  ].join('|')

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function logNotificationAudit(
  supabase: ReturnType<typeof createClient>,
  notification: NotificationRecord,
  action: string,
  details: Record<string, unknown>
) {
  await supabase.from('audit_logs').insert({
    event_id: notification.event_id,
    user_id: notification.user_id,
    action,
    new_value: details,
  })
}

serve(async (req) => {
  try {
    const payload = await req.json()
    const notification = payload.record as NotificationRecord | undefined

    if (!notification || !notification.user_id) {
      return new Response('Missing notification data', { status: 400 })
    }

    if (notification.email_sent) {
      return new Response('Already sent', { status: 200 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const deliveryKey = notification.email_delivery_key ?? await createDeliveryKey(notification)

    await supabase
      .from('notifications')
      .update({
        email_delivery_key: deliveryKey,
        email_delivery_status: 'sending',
        email_delivery_attempts: (notification.email_delivery_attempts ?? 0) + 1,
        email_last_attempted_at: new Date().toISOString(),
        email_last_error: null,
      })
      .eq('id', notification.id)

    const duplicateWindowStart = new Date(notification.created_at ?? new Date().toISOString())
    duplicateWindowStart.setMinutes(duplicateWindowStart.getMinutes() - 10)

    const { data: deliveredSibling } = await supabase
      .from('notifications')
      .select('id')
      .eq('email_delivery_key', deliveryKey)
      .eq('email_delivery_status', 'sent')
      .neq('id', notification.id)
      .gte('created_at', duplicateWindowStart.toISOString())
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (deliveredSibling) {
      await supabase
        .from('notifications')
        .update({
          email_sent: true,
          email_delivery_key: deliveryKey,
          email_delivery_status: 'duplicate_skipped',
          email_sent_at: new Date().toISOString(),
          email_last_error: `Duplicate delivery skipped; original notification ${deliveredSibling.id} already sent.`,
        })
        .eq('id', notification.id)

      await logNotificationAudit(supabase, notification, 'notification_email_duplicate_skipped', {
        notification_id: notification.id,
        delivery_key: deliveryKey,
        original_notification_id: deliveredSibling.id,
      })

      return new Response('Duplicate email skipped', { status: 200 })
    }

    const [{ data: profile, error: profileError }, { data: appSettings }, { data: eventData }] = await Promise.all([
      supabase
        .from('profiles')
        .select('email, full_name, role')
        .eq('id', notification.user_id)
        .single<ProfileRecord>(),
      supabase
        .from('app_settings')
        .select('media_drive_url, notification_test_email, notification_test_mode, regional_coordinator_test_email, events_team_test_email, finance_team_test_email, accounts_team_test_email, admin_test_email')
        .eq('id', 'global')
        .maybeSingle<AppSettingsRecord>(),
      notification.event_id
        ? supabase
            .from('events')
            .select('id, event_code, title, status, region, event_date, location')
            .eq('id', notification.event_id)
            .maybeSingle<EventRecord>()
        : Promise.resolve({ data: null, error: null }),
    ])

    if (profileError || !profile) {
      return new Response('Profile not found', { status: 404 })
    }

    const { data: dbTemplate } = await supabase
      .from('notification_templates')
      .select('subject_template, body_template, is_active')
      .eq('recipient_role', profile.role)
      .eq('notification_type', notification.type)
      .maybeSingle<NotificationTemplateRecord>()

    const fallbackTemplate = DEFAULT_TEMPLATES[profile.role]?.[notification.type] ?? {
      subject: notification.title,
      body: `Hello {{recipient_name}},\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n`,
    }

    const templateSubject = dbTemplate?.is_active ? dbTemplate.subject_template : fallbackTemplate.subject
    const templateBody = dbTemplate?.is_active ? dbTemplate.body_template : fallbackTemplate.body

    const eventTitle = eventData?.title ?? notification.title
    const eventLinkUrl = notification.event_id
      ? `${APP_URL}/dashboard/events/${notification.event_id}`
      : `${APP_URL}/dashboard`

    const variables = {
      recipient_name: profile.full_name,
      recipient_role: ROLE_LABELS[profile.role],
      event_title: eventTitle,
      event_code: eventData?.event_code ?? 'Pending code',
      event_status: eventData?.status ?? 'updated',
      event_region: eventData?.region ?? 'Not specified',
      event_date: eventData?.event_date ?? 'TBD',
      event_location: eventData?.location ?? 'TBD',
      notification_title: notification.title,
      notification_message: notification.message,
      event_link: eventLinkUrl,
      media_drive_link: appSettings?.media_drive_url ?? 'Coming soon',
    }

    const renderedSubject = applyTemplate(templateSubject, variables)
    const renderedBody = applyTemplate(templateBody, variables)
    const roleSpecificTestEmail = getRoleSpecificTestEmail(profile.role, appSettings)
    const testMode = appSettings?.notification_test_mode ?? 'all_stages'
    const deliveredTo =
      testMode === 'all_stages'
        ? appSettings?.notification_test_email?.trim() || profile.email
        : testMode === 'stage_specific'
          ? roleSpecificTestEmail || profile.email
          : profile.email
    const theme = getNotificationTheme(eventData?.status, notification.title, notification.message)

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827;background:#f8fafc">
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:28px">
          <div style="border-bottom:2px solid ${theme.accent};padding-bottom:16px;margin-bottom:24px">
            <div style="display:flex;align-items:center;gap:12px">
              <img src="${APP_LOGO_URL}" alt="${APP_NAME}" style="width:52px;height:52px;border-radius:12px;object-fit:cover" />
              <div>
                <p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;color:#6b7280;text-transform:uppercase">${APP_NAME}</p>
                <h1 style="color:${theme.accent};margin:0;font-size:22px">Workflow Notification</h1>
              </div>
            </div>
          </div>
          <div style="display:inline-flex;align-items:center;padding:6px 12px;border-radius:999px;background:${theme.softBg};color:${theme.softText};font-size:12px;font-weight:700;letter-spacing:.02em;margin-bottom:18px">
            ${theme.badge}
          </div>
          <h2 style="font-size:20px;margin:0 0 18px">${escapeHtml(renderedSubject)}</h2>
          ${toHtmlParagraphs(renderedBody)}
          <p style="margin-top:20px">
            <a href="${eventLinkUrl}" style="display:inline-block;background:${theme.accent};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:14px;font-weight:600">
              ${theme.buttonText}
            </a>
          </p>
          ${appSettings?.media_drive_url ? `<p style="margin-top:14px"><a href="${appSettings.media_drive_url}" style="color:#2563eb;text-decoration:none">Open shared media drive</a></p>` : ''}
          ${deliveredTo !== profile.email ? `<p style="margin-top:24px;color:#9ca3af;font-size:12px">Testing override active. Intended recipient: ${escapeHtml(profile.email)}. Delivered to: ${escapeHtml(deliveredTo)}.</p>` : ''}
        </div>
      </body>
      </html>
    `

    if (APPS_SCRIPT_WEBHOOK_URL) {
      const appScriptRes = await fetch(APPS_SCRIPT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: APPS_SCRIPT_SHARED_SECRET ?? '',
          to: deliveredTo,
          subject: renderedSubject,
          html: htmlBody,
          notification_id: notification.id,
        }),
      })

      if (!appScriptRes.ok) {
        const err = await appScriptRes.text()
        console.error('Apps Script error:', err)
        await supabase
          .from('notifications')
          .update({
            email_delivery_key: deliveryKey,
            email_delivery_status: 'failed',
            email_last_error: err,
          })
          .eq('id', notification.id)
        await logNotificationAudit(supabase, notification, 'notification_email_failed', {
          notification_id: notification.id,
          delivery_key: deliveryKey,
          provider: 'apps_script',
          error: err,
        })
        return new Response(`Email failed: ${err}`, { status: 500 })
      }
    } else if (RESEND_API_KEY) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: RESEND_FROM_EMAIL,
          to: deliveredTo,
          subject: renderedSubject,
          html: htmlBody,
        }),
      })

      if (!emailRes.ok) {
        const err = await emailRes.text()
        console.error('Resend error:', err)
        await supabase
          .from('notifications')
          .update({
            email_delivery_key: deliveryKey,
            email_delivery_status: 'failed',
            email_last_error: err,
          })
          .eq('id', notification.id)
        await logNotificationAudit(supabase, notification, 'notification_email_failed', {
          notification_id: notification.id,
          delivery_key: deliveryKey,
          provider: 'resend',
          error: err,
        })
        return new Response(`Email failed: ${err}`, { status: 500 })
      }
    } else {
      await supabase
        .from('notifications')
        .update({
          email_delivery_key: deliveryKey,
          email_delivery_status: 'failed',
          email_last_error: 'No email provider configured',
        })
        .eq('id', notification.id)
      return new Response('No email provider configured', { status: 500 })
    }

    await supabase
      .from('notifications')
      .update({
        email_sent: true,
        email_delivery_key: deliveryKey,
        email_delivery_status: 'sent',
        email_sent_at: new Date().toISOString(),
        email_last_error: null,
      })
      .eq('id', notification.id)

    await logNotificationAudit(supabase, notification, 'notification_email_sent', {
      notification_id: notification.id,
      delivery_key: deliveryKey,
      delivered_to: deliveredTo,
    })

    return new Response('Email sent', { status: 200 })
  } catch (err) {
    console.error('Error:', err)
    return new Response('Internal error', { status: 500 })
  }
})
