'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AppBrand } from '@/components/branding/AppBrand'
import type { RegionOption, UserRole } from '@/types/database'
import { ROLE_LABELS } from '@/lib/utils/permissions'
import { APP_LOGO_URL, APP_NAME } from '@/lib/branding'

const SELF_REGISTERABLE_ROLES: UserRole[] = ['regional_coordinator']

function evaluatePassword(password: string) {
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }

  const score = Object.values(checks).filter(Boolean).length
  const meetsMinimum = checks.length && score >= 4

  let label = 'Weak'
  let tone = 'bg-red-500'

  if (score >= 5) {
    label = 'Strong'
    tone = 'bg-emerald-500'
  } else if (score === 4) {
    label = 'Good'
    tone = 'bg-green-500'
  } else if (score === 3) {
    label = 'Fair'
    tone = 'bg-amber-500'
  }

  return { checks, score, label, tone, meetsMinimum }
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'regional_coordinator' as UserRole,
    region: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [regions, setRegions] = useState<RegionOption[]>([])
  const router = useRouter()
  const supabase = createClient()
  const passwordState = evaluatePassword(form.password)

  useEffect(() => {
    supabase
      .from('regions')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .then(({ data }) => setRegions((data ?? []) as RegionOption[]))
  }, [supabase])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!passwordState.meetsMinimum) {
      setError('Use a stronger password: at least 8 characters with uppercase, lowercase, number, and special character support.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          role: form.role,
          region: form.region,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-transparent px-4 py-8">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
          <Card className="w-full overflow-hidden">
            <div className="app-panel-soft border-b app-border-soft px-6 py-5 text-center">
              <img src={APP_LOGO_URL} alt={APP_NAME} className="mx-auto h-12 w-12 rounded-full object-cover" />
              <CardTitle className="mt-4">Check your email</CardTitle>
              <CardDescription className="mt-2">
                Your account has been created. Email verification comes first, then admin approval unlocks dashboard access.
              </CardDescription>
            </div>
            <CardContent className="space-y-4 pt-6 text-center">
              <p className="app-text-muted text-sm">
                We sent a confirmation link to <strong>{form.email}</strong>. After verification, your account will remain pending until an admin approves it.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full">Back to Login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden overflow-hidden rounded-[2rem] border border-slate-200/80 bg-gradient-to-br from-slate-950 via-emerald-900 to-green-800 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-6">
            <AppBrand dark />
            <div className="space-y-4">
              <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-50/90">
                Admin-approved access
              </div>
              <h1 className="max-w-xl text-4xl font-semibold leading-tight">
                Create a trusted account for proposal submission, approvals, reporting, and final review.
              </h1>
              <p className="max-w-xl text-sm leading-7 text-emerald-50/85">
                Every account enters a controlled onboarding flow. After email verification, admin approval ensures the right people have the right access before they begin using the platform.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <AuthFeature title="Controlled access" body="New accounts start as Regional Coordinator and remain blocked until approved by admin." />
            <AuthFeature title="Role-safe workflow" body="Sensitive admin and reviewer roles are assigned inside the platform, not selected publicly." />
            <AuthFeature title="Region-based operations" body="Registration is tied to active regions so the event workflow stays operationally aligned." />
          </div>
        </section>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md space-y-6">
            <div className="flex items-center justify-center lg:hidden">
              <AppBrand />
            </div>

            <Card className="overflow-hidden">
              <div className="app-panel-soft border-b app-border-soft px-6 py-5">
                <CardTitle>Create Account</CardTitle>
                <CardDescription className="mt-2">Register for controlled access to the YGPT EVENT workspace.</CardDescription>
              </div>
              <CardContent className="pt-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input
                      placeholder="Your full name"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="you@organization.org"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Password</Label>
                    <PasswordInput
                      placeholder="Minimum 8 characters"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      minLength={8}
                    />
                    <div className="app-panel-soft space-y-2 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="app-text-subtle text-xs font-semibold uppercase tracking-[0.12em]">Password strength</p>
                        <p className={`text-xs font-semibold ${passwordState.label === 'Strong' ? 'text-emerald-600' : passwordState.label === 'Good' ? 'text-green-600' : passwordState.label === 'Fair' ? 'text-amber-600' : 'text-red-600'}`}>
                          {passwordState.label}
                        </p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--app-surface-inverse)]/14">
                        <div
                          className={`h-full rounded-full transition-all ${passwordState.tone}`}
                          style={{ width: `${Math.max(form.password ? 16 : 0, passwordState.score * 20)}%` }}
                        />
                      </div>
                      <div className="grid gap-1 text-xs app-text-muted">
                        <PasswordCheck ok={passwordState.checks.length}>At least 8 characters</PasswordCheck>
                        <PasswordCheck ok={passwordState.checks.upper}>Uppercase letter</PasswordCheck>
                        <PasswordCheck ok={passwordState.checks.lower}>Lowercase letter</PasswordCheck>
                        <PasswordCheck ok={passwordState.checks.number}>Number</PasswordCheck>
                        <PasswordCheck ok={passwordState.checks.symbol}>Special character</PasswordCheck>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select
                      value={form.role}
                      onValueChange={(v) => setForm({ ...form, role: v as UserRole })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SELF_REGISTERABLE_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="app-text-subtle text-xs">
                      New accounts begin as Regional Coordinator and require admin approval before they can use the dashboard.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Region</Label>
                    <select
                      value={form.region}
                      onChange={(e) => setForm({ ...form, region: e.target.value })}
                      className="app-field flex h-10 w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select region</option>
                      {regions.map((region) => (
                        <option key={region.id} value={region.name}>{region.name}</option>
                      ))}
                    </select>
                    {regions.length === 0 && (
                      <Input
                        placeholder="e.g., Pune"
                        value={form.region}
                        onChange={(e) => setForm({ ...form, region: e.target.value })}
                      />
                    )}
                  </div>
                  {error && (
                    <div className="app-danger-soft rounded-xl p-3 text-sm">{error}</div>
                  )}
                  <Button type="submit" className="w-full" loading={loading}>
                    Create Account
                  </Button>
                  <p className="app-text-muted text-center text-sm">
                    Already have an account?{' '}
                    <Link href="/login" className="font-medium text-emerald-600 hover:underline dark:text-emerald-300">
                      Sign In
                    </Link>
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function AuthFeature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-emerald-50/85">{body}</p>
    </div>
  )
}

function PasswordCheck({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-2 ${ok ? 'text-emerald-700 dark:text-emerald-300' : 'app-text-subtle'}`}>
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
          ok ? 'app-success-soft' : 'app-panel-soft app-text-subtle'
        }`}
      >
        {ok ? '✓' : '•'}
      </span>
      <span>{children}</span>
    </div>
  )
}
