import { createClient } from '@/src/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getIbadahMonthlyAverage } from '@/src/lib/googleSheets'
import type { IbadahMonthlyChartData } from '@/src/components/charts/AwardeeCharts'
import AwardeeDashboardClient from '@/src/components/AwardeeDashboardClient'

interface SheetConfig {
    ibadah_sheet_name?: string;
    resume_sheet_name?: string;
    resume_range?: string;
}

export default async function AwardeeDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: userData } = await supabase
        .from('roles_pengguna')
        .select('role, name, spreadsheet_id, sheet_config')
        .eq('email', user.email)
        .single()

    if (userData?.role !== 'awardee' && userData?.role !== 'admin' && userData?.role !== 'fasilitator') {
        return (
            <div className="min-h-[60vh] flex items-center justify-center bg-white rounded-3xl text-red-600 font-bold p-10 border border-red-100">
                Akses ditolak.
            </div>
        )
    }

    const displayName = userData?.name || user.email?.split('@')[0] || 'Awardee'
    const config = (userData?.sheet_config as SheetConfig) || {}
    const ibadahSheetTarget = config.ibadah_sheet_name || 'Tahun ke-1'

    const activityOrder = [
        "Shalat Berjama'ah", "Qiyamul Lail", "Dzikir Pagi", "Mendo'akan",
        "Shalat Dhuha", "Membaca Al-Quran", "Shaum Sunnah", "Berinfak"
    ]

    let ibadahChartData: IbadahMonthlyChartData[] = []

    if (userData?.spreadsheet_id) {
        try {
            const now = new Date()
            const averages = await getIbadahMonthlyAverage(
                userData.spreadsheet_id,
                ibadahSheetTarget,
                now.getMonth() + 1,
                now.getFullYear()
            )
            ibadahChartData = activityOrder.map((activity) => {
                const key = activity as keyof typeof averages
                return {
                    aktivitas: activity
                        .replace("Shalat Berjama'ah", "Jama'ah")
                        .replace("Membaca Al-Quran", "Tilawah"),
                    skor: averages[key] ?? 0,
                }
            })
        } catch (err) {
            console.error('Failed to fetch ibadah data:', err)
        }
    }

    return (
        <AwardeeDashboardClient
            displayName={displayName}
            spreadsheetConfigured={!!userData?.spreadsheet_id}
            ibadahChartData={ibadahChartData}
            ibadahSheetTarget={ibadahSheetTarget}
        />
    )
}