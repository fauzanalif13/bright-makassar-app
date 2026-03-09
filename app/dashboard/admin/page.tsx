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
            <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 dark:bg-slate-900 text-red-600 font-bold p-10 rounded-2xl border border-red-100 dark:border-red-900">
                Akses ditolak. Halaman ini hanya untuk Admin/Fasilitator.
            </div>
        )
    }

    // Fetch real stats
    const { count: totalAktif } = await supabase
        .from('roles_pengguna')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aktif')

    const { count: totalNonaktif } = await supabase
        .from('roles_pengguna')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'nonaktif')

    const { count: totalAwardee } = await supabase
        .from('roles_pengguna')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'awardee')

    const { count: totalFasilitator } = await supabase
        .from('roles_pengguna')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'fasilitator')

    // Distinct angkatan count
    const { data: angkatanData } = await supabase
        .from('roles_pengguna')
        .select('angkatan')
        .eq('role', 'awardee')
        .not('angkatan', 'is', null)

    const uniqueAngkatan = new Set(angkatanData?.map(a => a.angkatan).filter(Boolean))

    const totalAll = (totalAktif || 0) + (totalNonaktif || 0)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    Dashboard Admin
                </h1>
                <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">
                    Ringkasan data dan aktivitas seluruh pengguna BRIGHT Makassar.
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Pengguna */}
                <div className="relative bg-white dark:bg-slate-800/70 rounded-2xl border border-gray-100 dark:border-slate-700/60 p-6 overflow-hidden group hover:shadow-lg transition-all">
                    <div className="absolute -right-6 -top-6 w-28 h-28 bg-gradient-to-br from-[#00529C]/5 to-[#15A4FA]/15 dark:from-[#00529C]/10 dark:to-[#15A4FA]/20 rounded-full blur-2xl group-hover:scale-110 transition-transform" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#00529C] to-[#15A4FA] text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            </div>
                            <span className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 text-xs font-bold px-2.5 py-1 rounded-full">
                                {totalAktif || 0} aktif
                            </span>
                        </div>
                        <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Pengguna</h3>
                        <p className="text-4xl font-black text-gray-800 dark:text-white tracking-tight">{totalAll}</p>
                    </div>
                </div>

                {/* Awardee */}
                <div className="relative bg-white dark:bg-slate-800/70 rounded-2xl border border-gray-100 dark:border-slate-700/60 p-6 overflow-hidden group hover:shadow-lg transition-all">
                    <div className="absolute -right-6 -top-6 w-28 h-28 bg-gradient-to-br from-emerald-500/5 to-teal-500/15 dark:from-emerald-500/10 dark:to-teal-500/20 rounded-full blur-2xl group-hover:scale-110 transition-transform" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                        </div>
                        <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Awardee</h3>
                        <p className="text-4xl font-black text-gray-800 dark:text-white tracking-tight">{totalAwardee || 0}</p>
                    </div>
                </div>

                {/* Fasilitator */}
                <div className="relative bg-white dark:bg-slate-800/70 rounded-2xl border border-gray-100 dark:border-slate-700/60 p-6 overflow-hidden group hover:shadow-lg transition-all">
                    <div className="absolute -right-6 -top-6 w-28 h-28 bg-gradient-to-br from-violet-500/5 to-purple-500/15 dark:from-violet-500/10 dark:to-purple-500/20 rounded-full blur-2xl group-hover:scale-110 transition-transform" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            </div>
                        </div>
                        <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Fasilitator</h3>
                        <p className="text-4xl font-black text-gray-800 dark:text-white tracking-tight">{totalFasilitator || 0}</p>
                    </div>
                </div>

                {/* Angkatan */}
                <div className="relative bg-white dark:bg-slate-800/70 rounded-2xl border border-gray-100 dark:border-slate-700/60 p-6 overflow-hidden group hover:shadow-lg transition-all">
                    <div className="absolute -right-6 -top-6 w-28 h-28 bg-gradient-to-br from-amber-500/5 to-orange-500/15 dark:from-amber-500/10 dark:to-orange-500/20 rounded-full blur-2xl group-hover:scale-110 transition-transform" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            </div>
                            {totalNonaktif ? (
                                <span className="bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-bold px-2.5 py-1 rounded-full">
                                    {totalNonaktif} nonaktif
                                </span>
                            ) : null}
                        </div>
                        <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Angkatan Aktif</h3>
                        <p className="text-4xl font-black text-gray-800 dark:text-white tracking-tight">{uniqueAngkatan.size}</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-slate-800/70 rounded-2xl border border-gray-100 dark:border-slate-700/60 p-6">
                <h2 className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">Aksi Cepat</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a
                        href="/dashboard/admin/pengguna/awardee"
                        className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-700/60 hover:border-[#15A4FA] dark:hover:border-[#00529C] hover:bg-blue-50/50 dark:hover:bg-[#00529C]/10 transition-all group"
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-[#00529C] to-[#15A4FA] text-white rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-lg group-hover:shadow-blue-500/20 transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 dark:text-white text-sm">Kelola Awardee</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Tambah, edit, atau hapus pengguna awardee</p>
                        </div>
                    </a>
                    <a
                        href="/dashboard/admin/pengguna/fasilitator"
                        className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-700/60 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-all group"
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-lg group-hover:shadow-violet-500/20 transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 dark:text-white text-sm">Kelola Fasilitator</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Kelola akun fasilitator program</p>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    )
}
