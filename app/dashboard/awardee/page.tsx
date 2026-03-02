import { createClient } from '@/src/utils/supabase/server'
import { redirect } from 'next/navigation'
import { AwardeePendidikanChart, AwardeeIbadahChart } from '@/src/components/charts/AwardeeCharts'
import { Megaphone, FileText, CheckCircle2 } from 'lucide-react'

export default async function AwardeeDashboard() {
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

    if (userData?.role !== 'awardee' && userData?.role !== 'admin' && userData?.role !== 'fasilitator') {
        return (
            <div className="min-h-[60vh] flex items-center justify-center bg-white rounded-3xl text-red-600 font-bold p-10 border border-red-100">
                Akses ditolak.
            </div>
        )
    }

    const displayName = userData?.name || user.email?.split('@')[0] || 'Awardee'

    return (
        <div className="space-y-8">
            <div className="bg-gradient-to-r from-[#00529C] to-[#15A4FA] rounded-3xl p-8 md:p-10 shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between">
                    <div>
                        <span className="text-blue-100 font-bold tracking-wider uppercase text-sm mb-2 block">Capaian Anda Hari Ini</span>
                        <h1 className="text-3xl md:text-5xl font-black mb-3 text-white">Halo, {displayName}!</h1>
                        <p className="text-blue-50 text-lg opacity-90 max-w-xl">Tetap semangat! Pertahankan skor ibadah dan pendidikanmu bulan ini. Jangan lupa kumpulkan tugas tepat waktu.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pendidikan Chart */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Grafik Capaian Pendidikan</h2>
                            <p className="text-sm text-gray-500">Bulan Ini</p>
                        </div>
                    </div>
                    <AwardeePendidikanChart />
                </div>

                {/* Ibadah Chart */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Grafik Ibadah</h2>
                            <p className="text-sm text-gray-500">Bulan Ini</p>
                        </div>
                    </div>
                    <AwardeeIbadahChart />
                </div>
            </div>

            {/* Announcements Section */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
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
                        <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500"></div>
                        <div className="flex gap-4">
                            <div className="shrink-0 mt-1">
                                <FileText className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg mb-2">Pengumpulan Hafalan Juz 30</h3>
                                <p className="text-gray-600 text-sm leading-relaxed mb-4">Mengingatkan kembali kepada seluruh awardee untuk segera mengumpulkan video hafalan paling lambat hari Jumat.</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md">Tenggat: 3 Hari Lagi</span>
                                    <span className="text-xs font-semibold text-gray-400">Oleh: Pak Ridwan</span>
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
                                <p className="text-gray-600 text-sm leading-relaxed mb-4">Pembinaan pekanan akan dilaksanakan pada hari Sabtu pukul 08:00 WITA. Dimohon hadir tepat waktu 15 menit sebelum acara.</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-md">Info Umum</span>
                                    <span className="text-xs font-semibold text-gray-400">Oleh: Bu Aisyah</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
