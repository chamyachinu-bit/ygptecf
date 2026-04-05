'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { AppBrand } from '@/components/branding/AppBrand'
import { QuoteDisplay } from '@/components/ui/quote-display'
import { Mascot } from '@/components/branding/Mascot'

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
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="hidden overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(140deg,#071321_0%,#0d2a3c_32%,#0e6a4b_100%)] p-10 text-white shadow-[0_36px_80px_rgba(2,6,23,0.34)] lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <AppBrand dark />
              <Mascot size={52} className="opacity-90" />
            </div>
            <div className="space-y-5">
              <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100/90">
                Secure Sign In
              </div>
              <div className="space-y-4">
                <h1 className="max-w-xl text-[3.25rem] font-semibold leading-[1.06] tracking-[-0.03em]">
                  Welcome back to your YGPT EVENT workspace.
                </h1>
                <p className="max-w-lg text-base leading-8 text-slate-100/78">
                  Access your account from one clean, secure sign-in experience designed for daily coordination and leadership review.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <QuoteDisplay variant="dark" intervalMs={7000} />
            <div className="grid gap-4 md:grid-cols-3">
              <LoginFeature title="Trusted access" body="Each sign-in starts from a secure, controlled account experience." />
              <LoginFeature title="Calm workflow" body="A focused workspace helps teams move faster with less confusion." />
              <LoginFeature title="Professional view" body="Built for internal teams who need clarity, consistency, and speed." />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-[33rem] space-y-6">
            <div className="flex items-center justify-center lg:hidden">
              <AppBrand />
            </div>

            <Card className="overflow-hidden rounded-[2rem] border-white/8 shadow-[0_26px_64px_rgba(2,6,23,0.22)]">
              <div className="app-panel-soft border-b app-border-soft px-7 py-6">
                <div className="space-y-2">
                  <p className="app-text-subtle text-xs font-semibold uppercase tracking-[0.18em]">Microsoft-style sign in</p>
                  <CardTitle className="text-[1.8rem] tracking-[-0.02em]">Sign in</CardTitle>
                  <CardDescription className="text-sm leading-6">
                    Enter your email and password to continue.
                  </CardDescription>
                </div>
              </div>
              <CardContent className="px-7 pb-7 pt-7">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
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
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <PasswordInput id="password" placeholder="Minimum 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                  </div>
                  {error && (
                    <div className="app-danger-soft rounded-xl p-3 text-sm">
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="h-12 w-full rounded-2xl text-base font-semibold" loading={loading}>
                    Sign In
                  </Button>
                  <div className="space-y-3 pt-1 text-center">
                    <p className="app-text-muted text-sm">
                      Don&apos;t have an account?{' '}
                      <Link href="/register" className="font-medium text-emerald-600 hover:underline dark:text-emerald-300">
                        Register
                      </Link>
                    </p>
                    <p className="app-text-subtle text-xs">
                      By continuing, you confirm you are authorized to access this workspace.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoginFeature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-100/78">{body}</p>
    </div>
  )
}
