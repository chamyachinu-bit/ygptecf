'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { AppBrand } from '@/components/branding/AppBrand'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden overflow-hidden rounded-[2rem] border border-slate-200/80 bg-gradient-to-br from-slate-950 via-emerald-900 to-green-800 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-6">
            <AppBrand dark />
            <div className="space-y-4">
              <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-50/90">
                Operations platform
              </div>
              <h1 className="max-w-xl text-4xl font-semibold leading-tight">
                Executive-grade NGO event operations, approvals, reporting, and audit visibility.
              </h1>
              <p className="max-w-xl text-sm leading-7 text-emerald-50/85">
                Sign in to manage proposals, funding reviews, completion reporting, final reports, analytics, and Drive-linked documentation from one role-aware workspace.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <AuthFeature title="Role-aware" body="Dashboards and actions adapt to the work each team actually needs to do." />
            <AuthFeature title="Report-ready" body="Final reports compare proposal intent with actual delivery in a leadership-friendly format." />
            <AuthFeature title="Audit-safe" body="History, notifications, and approvals remain visible and traceable throughout the workflow." />
          </div>
        </section>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md space-y-6">
            <div className="flex items-center justify-center lg:hidden">
              <AppBrand />
            </div>

            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
                <CardTitle>Sign In</CardTitle>
                <CardDescription className="mt-2">Enter your credentials to access the YGPT EVENT workspace.</CardDescription>
              </div>
              <CardContent className="pt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@organization.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  {error && (
                    <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full" loading={loading}>
                    Sign In
                  </Button>
                  <p className="text-center text-sm text-gray-600">
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className="font-medium text-green-600 hover:underline">
                      Register
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
