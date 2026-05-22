import { createClient } from '@/src/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminFasilitatorClient from '@/src/components/AdminFasilitatorClient'
import { fetchFasilitatorUsers } from '@/app/dashboard/admin/pengguna/actions'

export default async function AdminFasilitatorPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: userData } = await supabase
        .from('roles_pengguna')
        .select('role')
        .eq('email', user.email)
        .single()

    if (userData?.role !== 'admin') {
        return (
            <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 dark:bg-slate-900 text-red-600 font-bold p-10 rounded-2xl border border-red-100 dark:border-red-900">
                Akses ditolak. Halaman ini hanya untuk Admin.
            </div>
        )
    }

    const users = await fetchFasilitatorUsers()

    // Extract distinct angkatan values for filter dropdown
    const batchOptions = Array.from(
        new Set(users.map(u => u.angkatan).filter(Boolean) as string[])
    ).sort((a, b) => String(b).localeCompare(String(a)))

    return (
        <AdminFasilitatorClient
            initialUsers={users}
            batchOptions={batchOptions}
        />
    )
}
