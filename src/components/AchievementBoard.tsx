'use client'

import { useState, useEffect, useMemo } from 'react'
import { Trophy, CalendarDays, CheckCircle2, Loader2, Sparkles, ChevronDown, ChevronUp, ArrowUpDown, RefreshCw } from 'lucide-react'
import { useTheme } from '@/src/components/ThemeProvider'

export type AchievementEntry = {
    awardeeName: string
    angkatan: string
    tanggal: string
    judulPrestasi: string
    penyelenggara: string
    level: string
    _timestamp: number
}

const BULAN_OPTIONS = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
]

export default function AchievementBoard({ isHidden = false, onToggleHide }: { isHidden?: boolean, onToggleHide?: () => void }) {
    const { isDark } = useTheme()
    
    // Default to current month and year
    const defaultMonth = (new Date().getMonth() + 1).toString()
    const defaultYear = new Date().getFullYear().toString()
    
    const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
    const [selectedYear, setSelectedYear] = useState(defaultYear)
    
    const [entries, setEntries] = useState<AchievementEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState(false)
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
    
    const sortedEntries = useMemo(() => {
        if (sortOrder === 'desc') return entries;
        return [...entries].reverse();
    }, [entries, sortOrder])
    
    // Generate recent years for the dropdown
    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear()
        const years = []
        for (let i = currentYear - 2; i <= currentYear + 1; i++) {
            years.push(i.toString())
        }
        return years.sort((a, b) => parseInt(b) - parseInt(a)) // descending
    }, [])

    const fetchAchievements = async (forceRefresh = false) => {
        try {
            if (forceRefresh) setIsRefreshing(true)
            else setIsLoading(true)
            
            setError(false)
            
            const params = new URLSearchParams()
            if (selectedMonth) params.append('month', selectedMonth)
            if (selectedYear) params.append('year', selectedYear)
            if (forceRefresh) params.append('refresh', 'true')
            
            const res = await fetch(`/api/dashboard/achievements?${params.toString()}`)
            if (!res.ok) throw new Error('Bad response')
            
            const { data } = await res.json()
            setEntries(data || [])
        } catch (err) {
            setError(true)
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }

    useEffect(() => {
        fetchAchievements()
    }, [selectedMonth, selectedYear])

    return (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 lg:p-6 flex flex-col overflow-hidden relative transition-all ${isHidden ? 'h-[178px] lg:h-[190px]' : 'h-full'}`}>
            {/* Header */}
            <div className={`relative z-10 shrink-0 ${isHidden ? 'mb-2' : 'border-b border-gray-100 dark:border-slate-700/60 pb-4 mb-5'}`}>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#00529C] to-[#15A4FA] text-white flex items-center justify-center shadow-lg shadow-[#15A4FA]/20 shrink-0">
                            <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                                Prestasi Terbaru
                                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                            </h2>
                            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400">Prestasi dan kebanggaan bulan ini.</p>
                        </div>
                    </div>
                    {onToggleHide && (
                        <button onClick={onToggleHide} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 flex-shrink-0">
                            {isHidden ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                        </button>
                    )}
                </div>
            </div>
            {!isHidden && (
                /* Filters */
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700/50 p-1.5 rounded-lg border border-gray-100 dark:border-slate-700 mb-4 self-start w-full relative z-10">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="appearance-none bg-white dark:bg-slate-800 border-none shadow-sm text-xs font-semibold rounded px-2 py-1.5 text-gray-700 dark:text-slate-200 outline-none cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex-1"
                    >
                        {BULAN_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <div className="w-px h-4 bg-gray-200 dark:bg-slate-600" />
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="appearance-none bg-white dark:bg-slate-800 border-none shadow-sm text-xs font-semibold rounded px-2 py-1.5 text-gray-700 dark:text-slate-200 outline-none cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex-1"
                    >
                        {yearOptions.map(yr => (
                            <option key={yr} value={yr}>{yr}</option>
                        ))}
                    </select>
                    <div className="w-px h-4 bg-gray-200 dark:bg-slate-600" />
                    <button
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="p-1.5 text-gray-500 hover:text-gray-900 rounded dark:text-slate-400 dark:hover:text-white transition-colors"
                        title={sortOrder === 'desc' ? "Terbaru" : "Terlama"}
                        disabled={isLoading || isRefreshing}
                    >
                        <ArrowUpDown className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-200 dark:bg-slate-600" />
                    <button
                        onClick={() => fetchAchievements(true)}
                        disabled={isLoading || isRefreshing}
                        className={`p-1.5 text-gray-500 hover:text-gray-900 rounded dark:text-slate-400 dark:hover:text-white transition-colors ${isRefreshing ? 'animate-spin opacity-50' : ''}`}
                        title="Sinkronisasi Data"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            )}
            
            <div className="relative z-10 flex-1 scrollbar-minimal pr-1 -mr-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-6">
                        <Loader2 className="w-6 h-6 text-[#15A4FA] animate-spin mb-2" />
                        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Menyusun papan...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-6 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20 text-center">
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">Terjadi kesalahan</p>
                        <p className="text-xs text-red-500/80 mt-1">Gagal memuat.</p>
                    </div>
                ) : entries.length === 0 ? (
                    isHidden ? (
                        <div className="flex items-center gap-3 p-3 text-center border border-dashed border-gray-100 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-700/20">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-sm">
                                <Trophy className="w-5 h-5 text-gray-300 dark:text-slate-500 opacity-80" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300">Belum Ada Pencapaian</h3>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">
                                    Pantau terus prestasi awardee
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-100 dark:border-slate-700 rounded-2xl bg-gray-50/50 dark:bg-slate-700/20 mt-2">
                            <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center mb-4 shadow-[0_0_20px_-5px_rgba(0,0,0,0.05)]">
                                <Trophy className="w-8 h-8 text-gray-300 dark:text-slate-500 opacity-60" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-700 dark:text-slate-200 mb-1">Belum Ada Pencapaian</h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm px-4">
                                Mari ukir prestasi membanggakan di bulan ini!
                            </p>
                        </div>
                    )
                ) : (
                    <div className="flex flex-col gap-3 pb-2">
                        {sortedEntries.map((entry, idx) => (
                            <div 
                                key={idx} 
                                className="group bg-white dark:bg-slate-800/90 rounded-xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-[#15A4FA]/30 dark:hover:border-[#60b5ff]/30 transition-all duration-300 relative overflow-hidden shrink-0"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-[#15A4FA]/5 dark:bg-[#60b5ff]/10 rounded-full blur-2xl -mr-12 -mt-12 transition-all group-hover:bg-[#15A4FA]/10 group-hover:scale-150" />
                                
                                <div className="mb-3">
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-[#00529C] dark:text-[#60b5ff] text-[9px] font-black uppercase tracking-wider mb-2">
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                        Batch {entry.angkatan ? parseInt(entry.angkatan) - 2014 : '-'} / Angkatan {entry.angkatan}
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 pr-2">
                                        {entry.judulPrestasi}
                                    </h3>
                                </div>
                                
                                {!isHidden ? (
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-xs">
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-gray-600 dark:text-slate-300 font-bold uppercase shrink-0 text-[9px]">
                                                {entry.awardeeName.charAt(0)}
                                            </div>
                                            <span className="font-semibold text-gray-700 dark:text-slate-300 truncate text-xs">
                                                {entry.awardeeName}
                                            </span>
                                        </div>
                                        
                                        <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-1 leading-relaxed pl-7">
                                            {entry.level ? `${entry.level} - ` : ''}{entry.penyelenggara}
                                        </p>
                                        
                                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 dark:text-slate-500 pl-7">
                                            <CalendarDays className="w-3 h-3 text-gray-300 dark:text-slate-600" />
                                            {entry.tanggal}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
