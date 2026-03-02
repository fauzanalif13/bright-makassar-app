import { createClient } from '@/src/utils/supabase/server'
import { redirect } from 'next/navigation'
import { FasilitatorBarChart } from '@/src/components/charts/FasilitatorCharts'
import type { FasilitatorChartData } from '@/src/components/charts/FasilitatorCharts'
import { getIbadahMonthlyAverage } from '@/src/lib/googleSheets'
import type { IbadahActivity, IbadahAverage } from '@/src/lib/googleSheets'
import { Bell, Award, UserCheck } from 'lucide-react'

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

    // ─── Aggregation: fetch all active awardees' ibadah data ─────────
    let aggregatedData: FasilitatorChartData[] = []

    try {
        const { data: awardees } = await supabase
            .from('roles_pengguna')
            .select('name, spreadsheet_id')
            .eq('role', 'awardee')
            .eq('status', 'aktif')

        if (awardees && awardees.length > 0) {
            const now = new Date()
            const currentMonth = now.getMonth() + 1
            const currentYear = now.getFullYear()

            // Fetch ibadah averages for all awardees concurrently
            const results = await Promise.all(
                awardees
                    .filter((a) => a.spreadsheet_id) // skip those without spreadsheets
                    .map(async (awardee) => {
                        try {
                            const avg = await getIbadahMonthlyAverage(
                                awardee.spreadsheet_id,
                                'LaporanIbadah',
                                currentMonth,
                                currentYear
                            )
                            return avg
                        } catch {
                            return null // skip on error
                        }
                    })
            )

            const validResults = results.filter((r): r is IbadahAverage => r !== null)

            if (validResults.length > 0) {
                // Calculate Grand Average for each activity (exclude Tilawah for percentage chart)
                const activities: IbadahActivity[] = [
                    "Shalat Berjama'ah",
                    "Qiyamul Lail",
                    "Dzikir Pagi",
                    "Mendo'akan",
                    "Shalat Dhuha",
                    "Membaca Al-Quran",
                    "Shaum Sunnah",
                    "Berinfak",
                ]

                aggregatedData = activities.map((activity) => {
                    const sum = validResults.reduce((acc, r) => acc + r[activity], 0)
                    const avg = Math.round(sum / validResults.length)
                    return {
                        name: activity.replace('Shalat ', ''),
                        capaian: avg,
                    }
                })
            }
        }
    } catch (err) {
        console.error('Failed to aggregate fasilitator data:', err)
    }

    return (
        <div className="space-y-8">
            <div className="bg-gradient-to-r from-[#00529C] to-[#15A4FA] rounded-3xl p-8 md:p-10 shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                    <h1 className="text-3xl md:text-4xl font-black mb-3">Selamat pagi, {displayName}!</h1>
                    <p className="text-blue-50 text-lg opacity-90 max-w-2xl">Pantau perkembangan ibadah dan aktivitas seluruh awardee di wilayah Anda melalui dashboard ini.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Section */}
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Rerata Ibadah Awardee (Angkatan)</h2>
                            <p className="text-sm text-gray-500">Rata-rata capaian ibadah seluruh awardee aktif bulan ini</p>
                        </div>
                    </div>
                    <FasilitatorBarChart data={aggregatedData} />
                </div>

                {/* Activity Feed Section */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                            <Bell className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Berita Baru</h2>
                    </div>

                    <div className="flex-1 space-y-6">
                        {/* Feed Item 1 */}
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                <Award className="w-4 h-4 text-[#00529C]" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">Update Prestasi Awardee</h4>
                                <p className="text-sm text-gray-500 mt-1 leading-relaxed">Andi (Angkatan 3) baru saja memenangkan Juara 1 Lomba Essay Tingkat Nasional.</p>
                                <span className="text-xs font-semibold text-gray-400 mt-2 block">2 Jam yang lalu</span>
                            </div>
                        </div>

                        {/* Feed Item 2 */}
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
                                <UserCheck className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">Laporan Ibadah Lengkap</h4>
                                <p className="text-sm text-gray-500 mt-1 leading-relaxed">Seluruh awardee Angkatan 4 telah mensubmit laporan ibadah pekan ini.</p>
                                <span className="text-xs font-semibold text-gray-400 mt-2 block">5 Jam yang lalu</span>
                            </div>
                        </div>

                        {/* Feed Item 3 */}
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-gray-500">SN</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">Siti Nurhaliza</h4>
                                <p className="text-sm text-gray-500 mt-1 leading-relaxed">Mengajukan izin tidak mengikuti pembinaan pekan depan.</p>
                                <span className="text-xs font-semibold text-gray-400 mt-2 block">1 Hari yang lalu</span>
                            </div>
                        </div>
                    </div>

                    <button className="w-full mt-6 py-3 text-sm font-semibold text-[#00529C] bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors">
                        Lihat Semua Notifikasi
                    </button>
                </div>
            </div>
        </div>
    )
}
