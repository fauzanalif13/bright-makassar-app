import { createClient } from '@/src/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminDashboard() {
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

    if (userData?.role !== 'admin' && userData?.role !== 'fasilitator') {
        return (
            <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 text-red-600 font-bold p-10 rounded-2xl border border-red-100">
                Akses ditolak. Halaman ini hanya untuk Admin/Fasilitator.
            </div>
        )
    }

    // Fetch total active users
    const { count, error } = await supabase
        .from('roles_pengguna')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aktif')

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard Admin</h1>
                <p className="text-gray-500 mt-1">Ringkasan data dan aktivitas seluruh pengguna Bright Makassar.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Premium KPI Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col hover:shadow-md transition-all relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-br from-[#00529C]/5 to-[#15A4FA]/20 rounded-full blur-2xl group-hover:scale-110 transition-transform"></div>

                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="w-14 h-14 bg-gradient-to-br from-[#00529C] to-[#15A4FA] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <span className="bg-green-50 text-green-600 border border-green-200 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">+12% Bulan Ini</span>
                    </div>

                    <div className="relative z-10">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Total Pengguna</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black text-gray-800 tracking-tight">
                                {error ? 'Err' : count ?? 0}
                            </span>
                            <span className="text-gray-400 font-semibold text-lg">Aktif</span>
                        </div>
                    </div>
                </div>

                {/* Additional Mock Cards to fill space */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-purple-50 rounded-full blur-2xl"></div>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="w-14 h-14 bg-white border border-gray-100 text-gray-600 rounded-2xl flex items-center justify-center shadow-sm">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Tugas Selesai</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-gray-800 tracking-tight">1,204</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
