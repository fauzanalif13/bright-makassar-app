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

    // Fetch Himbauan / Tugas Terbaru (latest 5 active, matching angkatan or Semua Angkatan)
    const { data: rawPengumuman } = await supabase
        .from('pengumuman')
        .select('*')
        .or(`angkatan.eq.Semua Angkatan,angkatan.eq.${angkatan}`)
        .order('created_at', { ascending: false })
        .limit(5)

    // Fetch Jadwal Pembinaan (Upcoming, matching angkatan or Semua Angkatan)
    // We fetch all non-'Selesai' schedules to avoid Strict UTC timezone issues, or simply fetch recent ones and filter on the client.
    // For now, let's fetch where status is 'Akan Datang'.
    const { data: rawJadwal } = await supabase
        .from('jadwal_pembinaan')
        .select('*')
        .eq('status', 'Akan Datang')
        .or(`angkatan.eq.Semua Angkatan,angkatan.eq.${angkatan}`)
        .order('tanggal_waktu', { ascending: true })

    return (
        <AwardeeDashboardClient
            displayName={displayName}
            spreadsheetConfigured={!!spreadsheetId}
            angkatan={angkatan}
            pengumumanData={rawPengumuman || []}
            jadwalData={rawJadwal || []}
        />
    )
}