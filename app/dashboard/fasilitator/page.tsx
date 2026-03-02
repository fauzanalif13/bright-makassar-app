import { createClient } from '@/src/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getIbadahMonthlyAverage } from '@/src/lib/googleSheets'
import type { IbadahActivity, IbadahAverage } from '@/src/lib/googleSheets'
import { IBADAH_ACTIVITIES } from '@/src/lib/googleSheets'
import FasilitatorDashboardClient from '@/src/components/FasilitatorDashboardClient'
import type { FasilitatorChartData } from '@/src/components/charts/FasilitatorCharts'

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

    // ─── Fetch all active awardees ──────────────────────────────────
    const { data: awardees } = await supabase
        .from('roles_pengguna')
        .select('name, spreadsheet_id, sheet_config')
        .eq('role', 'awardee')
        .eq('status', 'aktif')

    const awardeeList = (awardees || []).map(a => ({
        name: a.name || 'Tanpa Nama',
        spreadsheet_id: a.spreadsheet_id || null,
        sheet_config: (a.sheet_config as { ibadah_sheet?: string; ibadah_sheet_name?: string } | null) || null,
    }))

    // ─── Aggregation for Rekapan tab ────────────────────────────────
    let aggregatedData: FasilitatorChartData[] = []

    try {
        if (awardeeList.length > 0) {
            const now = new Date()
            const currentMonth = now.getMonth() + 1
            const currentYear = now.getFullYear()

            const results = await Promise.all(
                awardeeList
                    .filter((a) => a.spreadsheet_id)
                    .map(async (awardee) => {
                        try {
                            const sheetName = awardee.sheet_config?.ibadah_sheet || awardee.sheet_config?.ibadah_sheet_name || 'LaporanIbadah'
                            const avg = await getIbadahMonthlyAverage(
                                awardee.spreadsheet_id!,
                                sheetName,
                                currentMonth,
                                currentYear
                            )
                            return avg
                        } catch {
                            return null
                        }
                    })
            )

            const validResults = results.filter((r): r is IbadahAverage => r !== null)

            if (validResults.length > 0) {
                aggregatedData = IBADAH_ACTIVITIES.map((activity: IbadahActivity) => {
                    const sum = validResults.reduce((acc, r) => acc + r[activity], 0)
                    const avg = Math.round(sum / validResults.length)
                    return {
                        name: activity
                            .replace("Shalat Berjama'ah", "Jama'ah")
                            .replace("Membaca Al-Quran", "Tilawah"),
                        capaian: avg,
                    }
                })
            }
        }
    } catch (err) {
        console.error('Failed to aggregate fasilitator data:', err)
    }

    return (
        <FasilitatorDashboardClient
            displayName={displayName}
            aggregatedData={aggregatedData}
            awardees={awardeeList}
        />
    )
}
