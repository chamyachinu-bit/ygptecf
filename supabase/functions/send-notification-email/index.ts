import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = Deno.env.get('APP_URL') || 'https://your-app.vercel.app'
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'NGO Events <onboarding@resend.dev>'

serve(async (req) => {
  try {
    const payload = await req.json()
    // Supabase Database Webhook payload
    const notification = payload.record

    if (!notification || !notification.user_id) {
      return new Response('Missing notification data', { status: 400 })
    }

    // Skip if already sent
    if (notification.email_sent) {
      return new Response('Already sent', { status: 200 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', notification.user_id)
      .single()

    if (profileError || !profile) {
      return new Response('Profile not found', { status: 404 })
    }

    const eventLink = notification.event_id
      ? `<p style="margin-top:16px">
          <a href="${APP_URL}/dashboard/events/${notification.event_id}"
             style="background:#16a34a;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">
            View Event
          </a>
        </p>`
      : `<p style="margin-top:16px">
          <a href="${APP_URL}/dashboard"
             style="background:#16a34a;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">
            Open Dashboard
          </a>
        </p>`

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827">
        <div style="border-bottom:2px solid #16a34a;padding-bottom:16px;margin-bottom:24px">
          <h1 style="color:#16a34a;margin:0;font-size:20px">🌿 NGO Events</h1>
        </div>
        <h2 style="font-size:18px;margin-bottom:8px">${notification.title}</h2>
        <p style="color:#374151;line-height:1.6">Dear ${profile.full_name},</p>
        <p style="color:#374151;line-height:1.6">${notification.message}</p>
        ${eventLink}
        <p style="color:#9ca3af;font-size:12px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px">
          This is an automated notification from NGO Event Management System.<br>
          Please do not reply to this email.
        </p>
      </body>
      </html>
    `

    // Send via Resend (free: 500 emails/month)
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: profile.email,
        subject: notification.title,
        html: htmlBody,
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.text()
      console.error('Resend error:', err)
      return new Response(`Email failed: ${err}`, { status: 500 })
    }

    // Mark as sent
    await supabase
      .from('notifications')
      .update({ email_sent: true })
      .eq('id', notification.id)

    return new Response('Email sent', { status: 200 })
  } catch (err) {
    console.error('Error:', err)
    return new Response('Internal error', { status: 500 })
  }
})
