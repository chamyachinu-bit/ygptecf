# NGO Event Management System — Deployment Guide

## Prerequisites
- Node.js 18+
- Git
- Supabase account (free): https://supabase.com
- Vercel account (free): https://vercel.com
- Resend account (free): https://resend.com

---

## STEP 1: Supabase Project Setup

1. Go to https://supabase.com → New Project
2. Name it `ngo-events`, pick a strong DB password, choose nearest region
3. Wait for provisioning (~2 minutes)

---

## STEP 2: Run Database Migrations

In Supabase Dashboard → SQL Editor, run each file **in order**:

```
supabase/migrations/00001_schema.sql   ← Tables, enums, views
supabase/migrations/00002_rls.sql      ← Row Level Security
supabase/migrations/00003_triggers.sql ← Automation triggers
supabase/migrations/00005_storage.sql  ← Storage bucket + policies
supabase/migrations/00006_epf_ecr_workflow.sql ← NGO-specific EPF/ECR fields + report workflow
```

For `00004_cron.sql`:
1. Dashboard → Database → Extensions → Enable `pg_cron`
2. Then run `00004_cron.sql` in SQL Editor

---

## STEP 3: Storage Setup

Already handled by `00005_storage.sql`.
Verify at: Dashboard → Storage → `event-files` bucket exists.

---

## STEP 4: Auth Configuration

Dashboard → Authentication → URL Configuration:
- Site URL: `http://localhost:3000` (update to Vercel URL after deploy)
- Redirect URLs: Add `https://YOUR_APP.vercel.app/auth/callback`

Dashboard → Authentication → Providers → Email:
- Enable email confirmations: OFF (for faster testing, turn ON for production)

---

## STEP 5: Deploy Edge Functions

Install Supabase CLI:
```bash
npm install --save-dev supabase
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Get your project ref from: Dashboard → Settings → General → Reference ID

```bash
# Deploy all functions
npx supabase functions deploy send-notification-email
npx supabase functions deploy generate-event-summary
npx supabase functions deploy submit-event

# Set secrets
npx supabase secrets set RESEND_API_KEY=re_YOUR_KEY
npx supabase secrets set RESEND_FROM_EMAIL="NGO Events <onboarding@resend.dev>"
npx supabase secrets set APP_URL=https://YOUR_APP.vercel.app

# Optional: use Google Apps Script instead of Resend
npx supabase secrets set APPS_SCRIPT_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
npx supabase secrets set APPS_SCRIPT_SHARED_SECRET=your_shared_secret
```

If `APPS_SCRIPT_WEBHOOK_URL` is set, the function will send mail through Apps Script first.
If it is not set, the function falls back to Resend.

---

## STEP 6: Set Up Email Webhook

1. Register at https://resend.com → verify your domain
2. Get your API key from Resend dashboard
3. In Supabase Dashboard → Database → Webhooks → Create:
   - Name: `email-notifications`
   - Table: `notifications`
   - Events: INSERT
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/send-notification-email`
   - HTTP headers: Add `Authorization: Bearer YOUR_SUPABASE_ANON_KEY`

---

## STEP 7: Local Development

```bash
# Clone and install
cd ngo-events
npm install

# Create .env.local (copy from .env.local.example)
cp .env.local.example .env.local
# Fill in your Supabase URL and keys from Dashboard → Settings → API

# Run dev server
npm run dev
# → http://localhost:3000
```

---

## STEP 8: Vercel Deployment

```bash
# Push to GitHub
git init
git add .
git commit -m "Initial commit: NGO Event Management System"
git remote add origin https://github.com/YOUR_ORG/ngo-events.git
git push -u origin main
```

2. Go to https://vercel.com → New Project → Import from GitHub
3. Select `ngo-events` repository
4. Add Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL     = https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   SUPABASE_SERVICE_ROLE_KEY    = eyJ...
   NEXT_PUBLIC_APP_URL          = https://your-app.vercel.app
   ```
5. Click Deploy

---

## STEP 9: Post-Deploy Configuration

1. Update Supabase Auth Site URL to your Vercel URL
2. Update `APP_URL` secret in Supabase Edge Functions:
   ```bash
   supabase secrets set APP_URL=https://YOUR_APP.vercel.app
   ```

---

## STEP 10: Create Your First Admin User

1. Register at your app → use any email
2. In Supabase SQL Editor:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'your@email.com';
   ```
3. Sign out and sign back in

---

## Test the Full Workflow

1. Register 5 users with different roles
2. As coordinator: Create event → Submit
3. As events_team: Review → Approve
4. As finance_team: Review → Approve
5. As accounts_team: Release funds → Approve
6. As coordinator: Mark as Completed
7. As coordinator: Submit post-event report
8. Check notifications and audit logs

---

## Free Tier Limits Reference

| Service     | Limit          | Expected Usage |
|-------------|---------------|----------------|
| Supabase DB | 500 MB         | ~50MB/1000 events |
| Auth        | 50,000 MAU     | NGO scale: fine |
| Storage     | 1 GB           | Fine |
| Edge Funcs  | 500K/month     | Fine |
| Vercel      | 100 GB BW      | Fine |
| Resend      | 500 emails/mo  | Fine for small NGO |

---

## Troubleshooting

**RLS blocking queries?**
→ Check `get_my_role()` returns correct role for your user.
→ Verify profile exists: `SELECT * FROM profiles WHERE id = auth.uid();`

**Triggers not firing?**
→ Check Supabase Logs → Edge Functions tab.
→ Verify trigger is attached: `SELECT * FROM information_schema.triggers;`

**Email not sending?**
→ Check Resend domain is verified.
→ Check webhook is configured correctly.
→ Check Edge Function logs in Dashboard → Edge Functions.

**pg_cron not working?**
→ Verify extension is enabled: `SELECT * FROM cron.job;`
→ Check Supabase plan (pg_cron available on free tier).
