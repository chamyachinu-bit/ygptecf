import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { SaveToast } from '@/components/ui/save-toast'
import { PageShell, SectionBlock } from '@/components/ui/page-shell'
import { Quote } from 'lucide-react'
import type { Quote as QuoteType } from '@/lib/quotes'

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const service = await createServiceClient()
  const { data: quotesData } = await service
    .from('quotes')
    .select('*')
    .order('sort_order', { ascending: true })

  const quotes = (quotesData ?? []) as QuoteType[]
  const savedMessage = params.saved === '1' ? 'Saved' : null

  async function addQuote(formData: FormData) {
    'use server'
    const text = String(formData.get('text') || '').trim()
    const author = String(formData.get('author') || '').trim()
    if (!text) return

    const service = await createServiceClient()
    const { data: existing } = await service.from('quotes').select('sort_order').order('sort_order', { ascending: false }).limit(1)
    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

    await service.from('quotes').insert({ text, author, active: true, sort_order: nextOrder })
    revalidatePath('/dashboard/admin/quotes')
    redirect('/dashboard/admin/quotes?saved=1')
  }

  async function importJson(formData: FormData) {
    'use server'
    const raw = String(formData.get('json_input') || '').trim()
    if (!raw) return

    let parsed: { text: string; author?: string }[]
    try {
      parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
    } catch {
      return
    }

    const service = await createServiceClient()
    const { data: existing } = await service.from('quotes').select('sort_order').order('sort_order', { ascending: false }).limit(1)
    let nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

    const rows = parsed
      .filter((q) => q.text?.trim())
      .map((q) => ({ text: q.text.trim(), author: (q.author ?? '').trim(), active: true, sort_order: nextOrder++ }))

    if (rows.length > 0) {
      await service.from('quotes').insert(rows)
    }

    revalidatePath('/dashboard/admin/quotes')
    redirect('/dashboard/admin/quotes?saved=1')
  }

  async function toggleQuote(formData: FormData) {
    'use server'
    const id = String(formData.get('quote_id') || '')
    const active = formData.get('active') === 'true'
    if (!id) return
    const service = await createServiceClient()
    await service.from('quotes').update({ active: !active }).eq('id', id)
    revalidatePath('/dashboard/admin/quotes')
    redirect('/dashboard/admin/quotes?saved=1')
  }

  async function deleteQuote(formData: FormData) {
    'use server'
    const id = String(formData.get('quote_id') || '')
    if (!id) return
    const service = await createServiceClient()
    await service.from('quotes').delete().eq('id', id)
    revalidatePath('/dashboard/admin/quotes')
    redirect('/dashboard/admin/quotes?saved=1')
  }

  return (
    <PageShell>
      <Header
        eyebrow="Admin"
        title="Quotes"
        subtitle="Manage motivational quotes shown during loading, login, and dashboard screens."
      />
      {savedMessage && <SaveToast message={savedMessage} />}

      <div className="grid gap-6 px-6 pb-8 lg:px-8">
        {/* Add quote form */}
        <SectionBlock title="Add a quote" subtitle="Quotes appear randomly across the app.">
          <Card>
            <CardContent className="p-6">
              <form action={addQuote} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] app-text-subtle">
                      Quote text
                    </label>
                    <textarea
                      name="text"
                      required
                      rows={2}
                      placeholder="Enter an inspirational quote…"
                      className="app-field w-full resize-none rounded-xl px-3 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] app-text-subtle">
                      Author
                    </label>
                    <input
                      name="author"
                      type="text"
                      placeholder="e.g. Helen Keller"
                      className="app-field h-[4.5rem] w-full rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.97]"
                >
                  <Quote className="h-3.5 w-3.5" />
                  Add quote
                </button>
              </form>
            </CardContent>
          </Card>
        </SectionBlock>

        {/* JSON bulk import */}
        <SectionBlock
          title="Bulk import (JSON)"
          subtitle='Paste a JSON array: [{"text":"...", "author":"..."}]'
        >
          <Card>
            <CardContent className="p-6">
              <form action={importJson} className="space-y-4">
                <textarea
                  name="json_input"
                  rows={5}
                  placeholder={'[\n  {"text": "Quote here", "author": "Author name"},\n  ...\n]'}
                  className="app-field w-full resize-y rounded-xl px-3 py-2.5 font-mono text-xs"
                />
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-2 rounded-xl border app-border bg-transparent px-4 text-sm font-semibold transition hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-[0.97]"
                >
                  Import JSON
                </button>
              </form>
            </CardContent>
          </Card>
        </SectionBlock>

        {/* Quotes list */}
        <SectionBlock
          title={`All quotes (${quotes.length})`}
          subtitle="Toggle visibility or remove quotes. Active quotes rotate across the app."
        >
          {quotes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Quote className="mx-auto mb-3 h-8 w-8 app-text-subtle opacity-40" />
                <p className="text-sm app-text-muted">No quotes yet. Add one above.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {quotes.map((q) => (
                <Card key={q.id} className={q.active ? '' : 'opacity-50'}>
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="mt-0.5 flex-1 space-y-0.5">
                      <p className="text-sm leading-6">&ldquo;{q.text}&rdquo;</p>
                      {q.author && (
                        <p className="text-xs font-semibold uppercase tracking-[0.13em] app-text-subtle">
                          — {q.author}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <form action={toggleQuote}>
                        <input type="hidden" name="quote_id" value={q.id} />
                        <input type="hidden" name="active" value={String(q.active)} />
                        <button
                          type="submit"
                          className={`h-8 rounded-lg border px-3 text-xs font-semibold transition active:scale-[0.97] ${
                            q.active
                              ? 'app-success-soft border-emerald-200 dark:border-emerald-800 hover:opacity-80'
                              : 'app-border bg-transparent app-text-subtle hover:opacity-80'
                          }`}
                        >
                          {q.active ? 'Active' : 'Hidden'}
                        </button>
                      </form>
                      <form action={deleteQuote}>
                        <input type="hidden" name="quote_id" value={q.id} />
                        <button
                          type="submit"
                          className="h-8 rounded-lg border app-border bg-transparent px-3 text-xs font-semibold app-text-subtle transition hover:app-danger-soft hover:border-red-200 active:scale-[0.97]"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </SectionBlock>
      </div>
    </PageShell>
  )
}
