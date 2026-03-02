import { createClient } from '@/src/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardDispatcher() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: userData } = await supabase
        .from('roles_pengguna')
        .select('role')
        .eq('email', user.email)
        .single()

    if (userData?.role === 'admin' || userData?.role === 'fasilitator') {
        redirect('/dashboard/admin')
    } else if (userData?.role === 'awardee') {
        redirect('/dashboard/awardee')
    } else {
        // Default fallback
        return <div>Akses Ditolak. Role Tidak Dikenali.</div>
    }
}
