import { createClient } from '@/src/utils/supabase/server'
import { redirect } from 'next/navigation'
import FasilitatorDashboardClient from '@/src/components/FasilitatorDashboardClient'
import type { AwardeeFullInfo } from '@/app/dashboard/fasilitator/actions'

export default async function FasilitatorDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: userData } = await supabase
        .from('roles_pengguna')
        .select('role, name')
        .eq('email', user.email)
        .single()

    if (userData?.role !== 'fasilitator' && userData?.role !== 'admin') {
        return (
            <div className="min-h-[60vh] flex items-center justify-center text-red-600 font-bold p-10 bg-white rounded-3xl border border-red-100">
                Akses ditolak. Halaman ini khusus untuk Fasilitator.
            </div>
        )
    }

    const displayName = userData?.name || user.email?.split('@')[0] || 'Fasilitator'

    // ─── Fetch all active awardees with full info ────────────────────
    const { data: awardees } = await supabase
        .from('roles_pengguna')
        .select('name, spreadsheet_id, sheet_config, angkatan, gender')
        .eq('role', 'awardee')
        .eq('status', 'aktif')
        .order('name')

    const awardeeList: AwardeeFullInfo[] = (awardees || []).map(a => ({
        name: a.name || 'Tanpa Nama',
        spreadsheet_id: a.spreadsheet_id || null,
        sheet_config: a.sheet_config || null,
        angkatan: a.angkatan || null,
        gender: a.gender || null,
    }))

    return (
        <FasilitatorDashboardClient
            displayName={displayName}
            awardees={awardeeList}
        />
    )
}
