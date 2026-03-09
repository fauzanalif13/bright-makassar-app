import { createClient } from '@/src/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminAwardeeClient from '@/src/components/AdminAwardeeClient'
import { fetchAwardeeUsers } from '@/app/dashboard/admin/pengguna/actions'

export default async function AdminAwardeePage() {
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

    const users = await fetchAwardeeUsers()

    // Extract distinct angkatan values for filter dropdown
    const batchOptions = Array.from(
        new Set(users.map(u => u.angkatan).filter(Boolean) as string[])
    ).sort((a, b) => String(b).localeCompare(String(a)))

    // Extract distinct universitas values for dropdown
    const univOptions = Array.from(
        new Set([
            'Universitas Hasanuddin',
            'UIN Alauddin Makassar',
            ...(users.map(u => u.asal_univ).filter(Boolean) as string[])
        ])
    ).sort((a, b) => String(a).localeCompare(String(b)))

    return (
        <AdminAwardeeClient
            initialUsers={users}
            batchOptions={batchOptions}
            univOptions={univOptions}
        />
    )
}
