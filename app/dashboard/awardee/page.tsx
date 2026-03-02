import { createClient } from '@/src/utils/supabase/server'
import { redirect } from 'next/navigation'
import { AwardeePendidikanChart, AwardeeIbadahMonthlyChart, AwardeeIbadahDailyChart } from '@/src/components/charts/AwardeeCharts'
import type { IbadahMonthlyChartData, IbadahDailyChartData } from '@/src/components/charts/AwardeeCharts'
import { getIbadahMonthlyAverage } from '@/src/lib/googleSheets'
import { Megaphone, FileText, CheckCircle2 } from 'lucide-react'

// Mendefinisikan tipe data untuk Konfigurasi
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

    // Mengambil data user beserta sheet_config yang sudah kita buat sebelumnya
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
    
    // Parsing sheet_config untuk mendapatkan target sheet dinamis (Fallback ke "Tahun ke-1")
    const config = (userData?.sheet_config as SheetConfig) || {};
    const ibadahSheetTarget = config.ibadah_sheet_name || 'Tahun ke-1';

    // Array 8 Aktivitas Ibadah sesuai template CSV terbaru
    const activityOrder = [
        "Shalat Berjama'ah",
        "Qiyamul Lail",
        "Dzikir Pagi",
        "Mendo'akan",
        "Shalat Dhuha",
        "Membaca Al-Quran",
        "Shaum Sunnah",
        "Berinfak"
    ];

    // Karena activityOrder menggunakan nama tampilan, kita butuh mapping ke key IbadahAverage jika berbeda
    // Namun di googleSheets.ts, IbadahActivity sudah sesuai dengan nama-nama di atas.
    // Error "No index signature" muncul karena 'activity' bertipe 'string' tapi 'averages' bertipe 'IbadahAverage'
    
    let ibadahChartData: IbadahMonthlyChartData[] = []

    // Fetch data ibadah dari Google Sheets
    if (userData?.spreadsheet_id) {
        try {
            const now = new Date()
            
            // Mengambil rata-rata bulan ini menggunakan fungsi terbaru
            const averages = await getIbadahMonthlyAverage(
                userData.spreadsheet_id,
                ibadahSheetTarget, 
                now.getMonth() + 1, // Bulan saat ini
                now.getFullYear()   // Tahun saat ini
            )

            // Mapping data dari Google Sheets agar sesuai dengan format Recharts
            ibadahChartData = activityOrder.map((activity) => {
                // Konversi string persentase atau angka dari averages ke numericScore
                // Gunakan type casting ke any untuk indexing dinamis atau gunakan IbadahActivity
                const key = activity as keyof typeof averages;
                const numericScore = averages[key] ?? 0;
                
                return {
                    // Menyingkat nama agar rapi di dalam Chart
                    aktivitas: activity
                        .replace("Shalat Berjama'ah", "Jama'ah")
                        .replace("Qiyamul Lail", "Qiyamul Lail")
                        .replace("Mendo'akan", "Mendo'akan")
                        .replace("Membaca Al-Quran", "Tilawah"),
                    skor: numericScore,
                };
            })
        } catch (err) {
            console.error('Failed to fetch ibadah data:', err)
        }
    }

    return (
        <div className="space-y-8">
            {/* Banner Utama */}
            <div className="bg-gradient-to-r from-[#00529C] to-[#15A4FA] rounded-3xl p-8 md:p-10 shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between">
                    <div>
                        <span className="text-blue-100 font-bold tracking-wider uppercase text-sm mb-2 block">Dashboard Utama</span>
                        <h1 className="text-3xl md:text-5xl font-black mb-3 text-white">Halo, {displayName}!</h1>
                        <p className="text-blue-50 text-lg opacity-90 max-w-xl">
                            Tetap semangat! Pertahankan skor ibadah dan pendidikanmu bulan ini. 
                            {!userData?.spreadsheet_id && " (⚠️ Anda belum mengatur link Spreadsheet di menu Profil)"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Grup Chart Pendidikan & Ibadah */}
            <div className="grid grid-cols-1 gap-8">
                {/* Pendidikan Chart */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-[#00529C]">Grafik Pendidikan</h2>
                            <p className="text-sm text-gray-500">Capaian Akademik & Skill Bulan Ini</p>
                        </div>
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        <AwardeePendidikanChart />
                    </div>
                </div>

                {/* Ibadah Charts */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-[#00529C]">Grafik Ibadah</h2>
                            <p className="text-sm text-gray-500">
                                Pantauan Harian & Rata-rata Bulan Ini - <span className="font-semibold text-[#15A4FA]">{ibadahSheetTarget}</span>
                            </p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
                        {/* Chart Harian */}
                        <div className="flex-1 w-full">
                            <h3 className="text-sm font-semibold text-gray-700 text-center mb-2">Tren Harian</h3>
                            {/* Untuk sementara data harian dikosongkan agar memunculkan UI fallback "Belum ada data" */}
                            <AwardeeIbadahDailyChart data={[]} /> 
                        </div>

                        {/* Chart Bulanan (Rerata) */}
                        <div className="flex-1 w-full">
                            <h3 className="text-sm font-semibold text-gray-700 text-center mb-2">Rerata Capaian (%)</h3>
                            {ibadahChartData.length > 0 ? (
                                <AwardeeIbadahMonthlyChart data={ibadahChartData} />
                            ) : (
                                <div className="h-72 w-full mt-4 flex items-center justify-center">
                                    <p className="text-gray-400 font-medium italic text-center">
                                        Data rerata belum tersedia.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Announcements Section */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                        <Megaphone className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Himbauan / Tugas Terbaru</h2>
                        <p className="text-sm text-gray-500">Informasi dari Fasilitator</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Announcement 1 */}
                    <div className="group border border-gray-100 rounded-2xl p-6 hover:border-blue-200 hover:shadow-md transition-all bg-gray-50/50 hover:bg-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1.5 h-full bg-[#15A4FA]"></div>
                        <div className="flex gap-4">
                            <div className="shrink-0 mt-1">
                                <FileText className="w-6 h-6 text-[#15A4FA]" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg mb-2">Pengisian Laporan Harian</h3>
                                <p className="text-gray-600 text-sm leading-relaxed mb-4">Mengingatkan kembali kepada seluruh awardee untuk rutin mengisi form laporan ibadah harian sesuai target yang ada di Spreadsheet.</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-[#00529C] bg-blue-50 px-2.5 py-1 rounded-md">Info Umum</span>
                                    <span className="text-xs font-semibold text-gray-400">Oleh: Sistem</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Announcement 2 */}
                    <div className="group border border-gray-100 rounded-2xl p-6 hover:border-blue-200 hover:shadow-md transition-all bg-gray-50/50 hover:bg-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1.5 h-full bg-green-500"></div>
                        <div className="flex gap-4">
                            <div className="shrink-0 mt-1">
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg mb-2">Jadwal Pembinaan Rutin</h3>
                                <p className="text-gray-600 text-sm leading-relaxed mb-4">Pembinaan pekanan akan dilaksanakan pada hari Sabtu pukul 08:00 WITA. Dimohon hadir tepat waktu.</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-md">Jadwal</span>
                                    <span className="text-xs font-semibold text-gray-400">Oleh: Fasilitator</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}