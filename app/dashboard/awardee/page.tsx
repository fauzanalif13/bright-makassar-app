import { createClient } from '@/src/utils/supabase/server'
import { redirect } from 'next/navigation'
import AwardeeDashboardClient from '@/src/components/AwardeeDashboardClient'

export default async function AwardeeDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: userData, error: userError } = await supabase
        .from('roles_pengguna')
        .select('role, name, spreadsheet_id, angkatan')
        .eq('email', user.email)
        .single()

    if (userError || !userData?.role || !['awardee', 'admin', 'fasilitator'].includes(userData.role)) {
        console.error('User access error:', userError?.message || 'Role unauthorized')
        return <div className="min-h-[60vh] flex items-center justify-center bg-white rounded-3xl text-red-600 font-bold p-10 border border-red-100">Akses ditolak.</div>
    }

    const displayName = userData?.name || user.email?.split('@')[0] || 'Awardee'
    const spreadsheetId = userData?.spreadsheet_id || ''
    const angkatan = userData?.angkatan ? parseInt(String(userData.angkatan)) : new Date().getFullYear()

    return (
        <AwardeeDashboardClient
            displayName={displayName}
            spreadsheetConfigured={!!spreadsheetId}
            angkatan={angkatan}
        />
    )
}