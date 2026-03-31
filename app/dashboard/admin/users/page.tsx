import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ROLE_LABELS } from '@/lib/utils/permissions'
import { formatDate } from '@/lib/utils/formatters'
import type { Profile } from '@/types/database'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: usersData } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const users = usersData ?? []
  const byRole = (users as Profile[]).reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold">User Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">{users.length} total users</p>
      </div>
      <div className="p-6 space-y-6">
        {/* Role summary */}
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

        {/* Users table */}
        <Card>
          <CardHeader><CardTitle>All Users</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Region</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {(users as Profile[]).map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-xs">
                            {u.full_name.charAt(0)}
                          </div>
                          <span className="font-medium">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{u.region || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{formatDate(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
