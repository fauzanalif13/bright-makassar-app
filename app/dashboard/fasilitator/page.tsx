import { createClient } from '@/src/utils/supabase/server'
import { redirect } from 'next/navigation'
import { FasilitatorBarChart } from '@/src/components/charts/FasilitatorCharts'
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
                            <h2 className="text-xl font-bold text-gray-900">Statistik Ibadah per Angkatan</h2>
                            <p className="text-sm text-gray-500">Rata-rata skor ibadah dalam 30 hari terakhir</p>
                        </div>
                        <select className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-[#15A4FA] focus:border-[#15A4FA] block p-2.5 outline-none">
                            <option>Bulan Ini</option>
                            <option>Bulan Lalu</option>
                        </select>
                    </div>
                    <FasilitatorBarChart />
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
