'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import {
    BarChart, Bar, AreaChart, Area, LineChart, Line, Brush,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts'
import {
    ChevronLeft, ChevronRight, ChevronDown, Megaphone,
    FileText, CheckCircle2, Calendar, BookOpen, GraduationCap
} from 'lucide-react'
import { enrichTrendData, getCurrentAcademicYear } from '@/src/lib/chartHelpers'
import type { EnrichedTrendItem } from '@/src/lib/chartHelpers'
import IbadahComparisonChart from '@/src/components/charts/IbadahComparisonChart'
import { useTheme } from '@/src/components/ThemeProvider'

// ─── Announcements ──────────────────────────────────────────────────

const ANNOUNCEMENTS = [
    { title: 'Pengisian Laporan Harian', desc: 'Mengingatkan kepada seluruh awardee untuk rutin mengisi form laporan ibadah harian.', tag: 'Info Umum', tagColor: 'text-[#00529C] bg-blue-50 dark:text-[#60b5ff] dark:bg-[#00529C]/20', by: 'Sistem', accent: '#15A4FA', icon: FileText },
    { title: 'Jadwal Pembinaan Rutin', desc: 'Pembinaan pekanan dilaksanakan hari Sabtu pukul 08:00 WITA. Dimohon hadir tepat waktu.', tag: 'Jadwal', tagColor: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20', by: 'Fasilitator', accent: '#10B981', icon: CheckCircle2 },
    { title: 'Pengumpulan Resume Buku', desc: 'Batas akhir pengumpulan resume buku bulan ini adalah tanggal 25.', tag: 'Tenggat', tagColor: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20', by: 'Fasilitator', accent: '#F59E0B', icon: Calendar },
]

const ACHIEVEMENT_COLORS_LIGHT: Record<string, string> = {
    'Pembinaan': '#00529C', 'Prestasi': '#15A4FA', 'Organisasi': '#8B5CF6', 'Workshop': '#10B981',
}
const ACHIEVEMENT_COLORS_DARK: Record<string, string> = {
    'Pembinaan': '#60b5ff', 'Prestasi': '#5cc8ff', 'Organisasi': '#a78bfa', 'Workshop': '#34d399',
}

// ─── Types ──────────────────────────────────────────────────────────

export type IbadahComparisonItem = { aktivitas: string; current: number; previous: number }
export type IbadahTrendItem = { bulan: string; skor: number }
export type IpIpkItem = { semester: string; IP: number; IPK: number }
export type AchievementItem = { name: string; count: number }

type Props = {
    displayName: string
    spreadsheetConfigured: boolean
    angkatan: number
}

const SPAN_OPTIONS = [
    { value: 3, label: '3 Bulan' },
    { value: 6, label: '6 Bulan' },
    { value: 9, label: '9 Bulan' },
    { value: 12, label: '12 Bulan' },
]

// ─── Cache Utilities ────────────────────────────────────────────────

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

function hasStorageConsent(): boolean {
    try {
        return localStorage.getItem('storage_consent') === 'true'
    } catch { return false }
}

function getCachedData<T>(key: string): T | null {
    if (!hasStorageConsent()) return null
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        const { data, expiry } = JSON.parse(raw)
        if (Date.now() > expiry) {
            localStorage.removeItem(key)
            return null
        }
        return data as T
    } catch { return null }
}

function setCachedData(key: string, data: any): void {
    if (!hasStorageConsent()) return
    try {
        localStorage.setItem(key, JSON.stringify({
            data,
            expiry: Date.now() + CACHE_TTL_MS,
        }))
    } catch { /* quota exceeded — silently skip */ }
}

// ─── Custom Tooltip ─────────────────────────────────────────────────

function IbadahCustomTooltip({ active, payload, label }: any) {
    const { isDark } = useTheme()
    if (!active || !payload?.length) return null

    const data = payload[0]?.payload as EnrichedTrendItem | undefined
    if (!data) return null

    const delta = data.selisihBulanLalu
    const isUp = delta > 0
    const hasChange = delta !== 0

    return (
        <div className={`rounded-xl shadow-lg border px-4 py-3 min-w-[200px] ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            <p className={`text-sm font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{label}</p>
            <div className="space-y-1">
                <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    <span className="font-semibold">Skor Ibadah:</span>{' '}
                    <span className={`font-bold ${isDark ? 'text-[#60b5ff]' : 'text-[#00529C]'}`}>{data.skor}%</span>
                </p>
                <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    <span className="font-semibold">Rata-rata ibadah keseluruhan:</span>{' '}
                    <span className={`font-bold ${isDark ? 'text-[#a78bfa]' : 'text-[#8B5CF6]'}`}>{data.rataRataKeseluruhan}%</span>
                </p>
                {hasChange && (
                    <p className={`text-xs italic mt-1 ${isUp ? 'text-emerald-500' : 'text-red-400'}`}>
                        {isUp ? '▲' : '▼'} {isUp ? 'naik' : 'turun'} {Math.abs(delta)}% dibanding bulan lalu
                    </p>
                )}
            </div>
        </div>
    )
}

// ─── Section Loading Skeleton ───────────────────────────────────────

function SectionSkeleton() {
    return (
        <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
                <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-4">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded mb-4" />
                    <div className="h-72 bg-gray-50 dark:bg-slate-700/50 rounded-xl" />
                </div>
                <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-4">
                    <div className="h-4 w-28 bg-gray-200 dark:bg-slate-700 rounded mb-4" />
                    <div className="h-72 bg-gray-50 dark:bg-slate-700/50 rounded-xl" />
                </div>
            </div>
        </div>
    )
}

// ─── Main Component ─────────────────────────────────────────────────

export default function AwardeeDashboardClient({
    displayName, spreadsheetConfigured, angkatan
}: Props) {
    const [carouselIdx, setCarouselIdx] = useState(0)
    const scrollRef = useRef<HTMLDivElement>(null)
    const { isDark } = useTheme()

    // ─── Lazy-loaded data state ──────────────────────────────────────
    const [ibadahComparison, setIbadahComparison] = useState<IbadahComparisonItem[]>([])
    const [allTrendData, setAllTrendData] = useState<IbadahTrendItem[]>([])
    const [ipIpkData, setIpIpkData] = useState<IpIpkItem[]>([])
    const [achievementData, setAchievementData] = useState<AchievementItem[]>([])

    const [ibadahLoading, setIbadahLoading] = useState(true)
    const [pendidikanLoading, setPendidikanLoading] = useState(true)
    const [ibadahError, setIbadahError] = useState(false)
    const [pendidikanError, setPendidikanError] = useState(false)

    // ─── Fetch ibadah data (lazy, with cache) ────────────────────────
    useEffect(() => {
        if (!spreadsheetConfigured) {
            setIbadahLoading(false)
            return
        }
        let cancelled = false

        // Try cache first
        const cachedIbadah = getCachedData<{
            ibadahComparison: IbadahComparisonItem[]
            allTrendData: IbadahTrendItem[]
        }>('dashboard_ibadah')

        if (cachedIbadah) {
            setIbadahComparison(cachedIbadah.ibadahComparison)
            setAllTrendData(cachedIbadah.allTrendData)
            setIbadahLoading(false)
            // Stale-while-revalidate: silently refresh in background
            fetch('/api/dashboard/ibadah-trend')
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                    if (cancelled || !data) return
                    setIbadahComparison(data.ibadahComparison || [])
                    setAllTrendData(data.allTrendData || [])
                    setCachedData('dashboard_ibadah', {
                        ibadahComparison: data.ibadahComparison || [],
                        allTrendData: data.allTrendData || [],
                    })
                })
                .catch(() => {}) // silently fail background refresh
            return
        }

        // No cache — fetch fresh
        fetch('/api/dashboard/ibadah-trend')
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json()
            })
            .then(data => {
                if (cancelled) return
                setIbadahComparison(data.ibadahComparison || [])
                setAllTrendData(data.allTrendData || [])
                setCachedData('dashboard_ibadah', {
                    ibadahComparison: data.ibadahComparison || [],
                    allTrendData: data.allTrendData || [],
                })
            })
            .catch(() => { if (!cancelled) setIbadahError(true) })
            .finally(() => { if (!cancelled) setIbadahLoading(false) })

        return () => { cancelled = true }
    }, [spreadsheetConfigured])

    // ─── Fetch pendidikan data (lazy, with cache) ────────────────────
    useEffect(() => {
        if (!spreadsheetConfigured) {
            setPendidikanLoading(false)
            return
        }
        let cancelled = false

        const cachedPendidikan = getCachedData<{
            ipIpkData: IpIpkItem[]
            achievementData: AchievementItem[]
        }>('dashboard_pendidikan')

        if (cachedPendidikan) {
            setIpIpkData(cachedPendidikan.ipIpkData)
            setAchievementData(cachedPendidikan.achievementData)
            setPendidikanLoading(false)
            // Stale-while-revalidate
            fetch('/api/dashboard/pendidikan')
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                    if (cancelled || !data) return
                    setIpIpkData(data.ipIpkData || [])
                    setAchievementData(data.achievementData || [])
                    setCachedData('dashboard_pendidikan', {
                        ipIpkData: data.ipIpkData || [],
                        achievementData: data.achievementData || [],
                    })
                })
                .catch(() => {})
            return
        }

        fetch('/api/dashboard/pendidikan')
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json()
            })
            .then(data => {
                if (cancelled) return
                setIpIpkData(data.ipIpkData || [])
                setAchievementData(data.achievementData || [])
                setCachedData('dashboard_pendidikan', {
                    ipIpkData: data.ipIpkData || [],
                    achievementData: data.achievementData || [],
                })
            })
            .catch(() => { if (!cancelled) setPendidikanError(true) })
            .finally(() => { if (!cancelled) setPendidikanLoading(false) })

        return () => { cancelled = true }
    }, [spreadsheetConfigured])

    // ─── Trend chart controls ────────────────────────────────────────
    const defaultTahun = useMemo(() => getCurrentAcademicYear(angkatan), [angkatan])
    const [selectedTahun, setSelectedTahun] = useState(defaultTahun)
    const [selectedSpan, setSelectedSpan] = useState(6)

    const defaultStart = (defaultTahun - 1) * 12
    const [brushStart, setBrushStart] = useState(defaultStart)
    const [brushEnd, setBrushEnd] = useState(defaultStart + 5)

    // Update brush end when trend data arrives
    useEffect(() => {
        if (allTrendData.length > 0) {
            setBrushEnd(Math.min(brushStart + selectedSpan - 1, allTrendData.length - 1))
        }
    }, [allTrendData.length]) // eslint-disable-line react-hooks/exhaustive-deps

    const enrichedData = useMemo(() => enrichTrendData(allTrendData), [allTrendData])

    const handleTahunChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = parseInt(e.target.value)
        setSelectedTahun(val)
        const start = (val - 1) * 12
        const end = Math.min(start + selectedSpan - 1, enrichedData.length - 1)
        setBrushStart(start)
        setBrushEnd(end)
    }, [selectedSpan, enrichedData.length])

    const handleSpanChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = parseInt(e.target.value)
        setSelectedSpan(val)
        const end = Math.min(brushStart + val - 1, enrichedData.length - 1)
        setBrushEnd(end)
    }, [brushStart, enrichedData.length])

    const handleBrushChange = useCallback((range: { startIndex?: number; endIndex?: number }) => {
        if (range.startIndex !== undefined) setBrushStart(range.startIndex)
        if (range.endIndex !== undefined) setBrushEnd(range.endIndex)
    }, [])

    function scrollCarousel(dir: 'left' | 'right') {
        const next = dir === 'left'
            ? Math.max(0, carouselIdx - 1)
            : Math.min(ANNOUNCEMENTS.length - 1, carouselIdx + 1)
        setCarouselIdx(next)
        scrollRef.current?.children[next]?.scrollIntoView({
            behavior: 'smooth', inline: 'start', block: 'nearest'
        })
    }

    const hasIbadahData = ibadahComparison.length > 0
    const hasTrendData = enrichedData.length > 0
    const hasIpIpkData = ipIpkData.length > 0
    const hasAchievementData = achievementData.length > 0

    // Theme-aware chart colors
    const gridColor = isDark ? '#334155' : '#E5E7EB'
    const tickColor = isDark ? '#94a3b8' : '#1F2937'
    const tickColorAlt = isDark ? '#cbd5e1' : '#374151'
    const scoreColor = isDark ? '#60b5ff' : '#00529C'
    const avgColor = isDark ? '#a78bfa' : '#8B5CF6'
    const ipColor = isDark ? '#5cc8ff' : '#15A4FA'
    const ipkColor = isDark ? '#60b5ff' : '#00529C'
    const achievementColors = isDark ? ACHIEVEMENT_COLORS_DARK : ACHIEVEMENT_COLORS_LIGHT

    return (
        <div className="space-y-6">
            {/* ─── Welcome Banner ─────────────────────────────────────── */}
            <WelcomeBanner
                displayName={displayName}
                spreadsheetConfigured={spreadsheetConfigured}
            />

            {/* ─── Announcements Carousel ─────────────────────────────── */}
            <AnnouncementCarousel
                carouselIdx={carouselIdx}
                scrollRef={scrollRef}
                onScroll={scrollCarousel}
                onDotClick={(i) => {
                    setCarouselIdx(i)
                    scrollRef.current?.children[i]?.scrollIntoView({
                        behavior: 'smooth', inline: 'start', block: 'nearest'
                    })
                }}
            />

            {/* ─── Grafik Ibadah ──────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 lg:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#00529C]/10 dark:bg-[#00529C]/20 text-[#00529C] dark:text-[#60b5ff] flex items-center justify-center">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[#00529C] dark:text-[#60b5ff]">Grafik Ibadah</h2>
                            <p className="text-xs text-gray-600 dark:text-slate-400">
                                Timeline {angkatan} – {angkatan + 4}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <DropdownSelect
                            value={selectedSpan}
                            onChange={handleSpanChange}
                            options={SPAN_OPTIONS}
                        />
                        <DropdownSelect
                            value={selectedTahun}
                            onChange={handleTahunChange}
                            options={[1, 2, 3, 4].map(v => ({
                                value: v, label: `Tahun ke-${v}`
                            }))}
                        />
                    </div>
                </div>

                {ibadahLoading ? (
                    <SectionSkeleton />
                ) : ibadahError ? (
                    <ErrorMessage msg="Gagal memuat data ibadah. Silakan muat ulang halaman." />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
                        {/* Comparison Chart */}
                        <IbadahComparisonChart
                            angkatan={angkatan}
                            initialComparison={ibadahComparison}
                        />

                        {/* Scrollable Trend Timeline with Trendline */}
                        <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">
                                Tren Skor Ibadah
                            </h3>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-4">
                                Geser brush di bawah grafik untuk navigasi timeline
                            </p>
                            {hasTrendData ? (
                                <div className="h-[360px] overflow-x-auto scrollbar-minimal">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={enrichedData} margin={{ top: 10, right: 5, left: -20, bottom: 5 }}>
                                            <defs>
                                                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={scoreColor} stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor={scoreColor} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                            <XAxis
                                                dataKey="bulan"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: tickColor, fontSize: 10, fontWeight: 500 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: tickColorAlt, fontSize: 11 }}
                                                domain={[0, 100]}
                                            />
                                            <Tooltip content={<IbadahCustomTooltip />} />
                                            <Legend
                                                wrapperStyle={{ fontSize: '11px', color: isDark ? '#cbd5e1' : '#1F2937' }}
                                                iconType="plainline"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="skor"
                                                name="Skor Ibadah"
                                                stroke={scoreColor}
                                                strokeWidth={2.5}
                                                fill="url(#trendGrad)"
                                                dot={{ r: 3, fill: scoreColor, stroke: isDark ? '#1e293b' : '#fff', strokeWidth: 2 }}
                                                activeDot={{ r: 6 }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="rataRataKeseluruhan"
                                                name="Rata-rata Keseluruhan"
                                                stroke={avgColor}
                                                strokeWidth={2}
                                                strokeDasharray="6 3"
                                                dot={false}
                                                activeDot={{ r: 4, fill: avgColor, stroke: isDark ? '#1e293b' : '#fff', strokeWidth: 2 }}
                                            />
                                            <Brush
                                                dataKey="bulan"
                                                height={28}
                                                stroke={scoreColor}
                                                fill={isDark ? '#1e293b' : '#F8FAFC'}
                                                travellerWidth={8}
                                                startIndex={brushStart}
                                                endIndex={brushEnd}
                                                onChange={handleBrushChange}
                                                tickFormatter={(val: string) => val}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <EmptyChart msg="Belum ada data tren." />}
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Grafik Pendidikan ──────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                <div className="flex items-center gap-2.5 mb-6">
                    <div className="w-9 h-9 rounded-lg bg-[#15A4FA]/10 dark:bg-[#15A4FA]/20 text-[#15A4FA] dark:text-[#5cc8ff] flex items-center justify-center">
                        <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-[#00529C] dark:text-[#60b5ff]">Grafik Pendidikan</h2>
                        <p className="text-xs text-gray-600 dark:text-slate-400">Data dari sheet Resume</p>
                    </div>
                </div>

                {pendidikanLoading ? (
                    <SectionSkeleton />
                ) : pendidikanError ? (
                    <ErrorMessage msg="Gagal memuat data pendidikan. Silakan muat ulang halaman." />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* IP & IPK */}
                        <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-4">Tren IP &amp; IPK</h3>
                            {hasIpIpkData ? (
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={ipIpkData} margin={{ top: 10, right: 5, left: -15, bottom: 5 }}>
                                            <defs>
                                                <linearGradient id="ipGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={ipColor} stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor={ipColor} stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="ipkGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={ipkColor} stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor={ipkColor} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                            <XAxis dataKey="semester" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 11 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColorAlt, fontSize: 11 }} domain={[0, 4]} />
                                            <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', fontSize: '12px', padding: '10px', backgroundColor: isDark ? '#1e293b' : '#fff', color: isDark ? '#f1f5f9' : '#111827' }} labelStyle={{ color: isDark ? '#f1f5f9' : '#111827', fontWeight: 600 }} itemStyle={{ color: isDark ? '#cbd5e1' : '#374151' }} />
                                            <Legend wrapperStyle={{ fontSize: '11px', color: isDark ? '#cbd5e1' : '#1F2937' }} />
                                            <Area type="monotone" dataKey="IP" stroke={ipColor} strokeWidth={2.5} fill="url(#ipGrad)" dot={{ r: 4, fill: ipColor, stroke: isDark ? '#1e293b' : '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                            <Area type="monotone" dataKey="IPK" stroke={ipkColor} strokeWidth={2.5} fill="url(#ipkGrad)" dot={{ r: 4, fill: ipkColor, stroke: isDark ? '#1e293b' : '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <EmptyChart msg="Konfigurasi range IP/IPK di Profil." />}
                        </div>

                        {/* Achievements */}
                        <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-4">Akumulasi Riwayat</h3>
                            {hasAchievementData ? (
                                <>
                                    <div className="h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={achievementData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: tickColorAlt, fontSize: 11 }} />
                                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 12, fontWeight: 600 }} width={90} />
                                                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', fontSize: '12px', padding: '10px', backgroundColor: isDark ? '#1e293b' : '#fff', color: isDark ? '#f1f5f9' : '#111827' }} labelStyle={{ color: isDark ? '#f1f5f9' : '#111827', fontWeight: 600 }} itemStyle={{ color: isDark ? '#cbd5e1' : '#374151' }} />
                                                <Bar dataKey="count" name="Jumlah" radius={[0, 6, 6, 0]} maxBarSize={32}>
                                                    {achievementData.map((entry, idx) => (
                                                        <Cell key={idx} fill={achievementColors[entry.name] || scoreColor} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex flex-wrap gap-3 mt-3 justify-center">
                                        {achievementData.map(a => (
                                            <div key={a.name} className="flex items-center gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: achievementColors[a.name] || scoreColor }} />
                                                <span className="text-[11px] text-gray-700 dark:text-slate-300 font-medium">{a.name}: {a.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : <EmptyChart msg="Konfigurasi range Pendidikan di Profil." />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Modular Sub-Components ─────────────────────────────────────────

function WelcomeBanner({ displayName, spreadsheetConfigured }: {
    displayName: string
    spreadsheetConfigured: boolean
}) {
    return (
        <div className="bg-gradient-to-r from-[#00529C] to-[#15A4FA] rounded-2xl px-6 py-5 shadow-md text-white relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black">Halo, {displayName}!</h1>
                    <p className="text-blue-100 text-sm mt-1 max-w-lg">
                        Pertahankan skor ibadah dan pendidikanmu.
                        {!spreadsheetConfigured && (
                            <span className="text-amber-200 font-semibold">
                                {' '}⚠️ Spreadsheet belum dikonfigurasi.
                            </span>
                        )}
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-2 text-blue-100 text-xs font-medium bg-white/10 px-3 py-1.5 rounded-lg">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date().toLocaleDateString('id-ID', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                </div>
            </div>
        </div>
    )
}

function AnnouncementCarousel({ carouselIdx, scrollRef, onScroll, onDotClick }: {
    carouselIdx: number
    scrollRef: React.RefObject<HTMLDivElement | null>
    onScroll: (dir: 'left' | 'right') => void
    onDotClick: (i: number) => void
}) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center">
                        <Megaphone className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Himbauan Terbaru</h2>
                </div>
                <div className="flex gap-1.5">
                    <button onClick={() => onScroll('left')} disabled={carouselIdx === 0} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-600 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-all">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => onScroll('right')} disabled={carouselIdx === ANNOUNCEMENTS.length - 1} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-600 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-all">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div ref={scrollRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1 scrollbar-minimal">
                {ANNOUNCEMENTS.map((a, i) => {
                    const Icon = a.icon
                    return (
                        <div key={i} className="min-w-[280px] md:min-w-[340px] snap-start border border-gray-100 dark:border-slate-700 rounded-xl p-5 bg-gray-50/50 dark:bg-slate-700/30 hover:bg-white dark:hover:bg-slate-700/60 hover:shadow-sm transition-all relative overflow-hidden flex-shrink-0">
                            <div className="absolute top-0 right-0 w-1 h-full" style={{ backgroundColor: a.accent }} />
                            <div className="flex gap-3">
                                <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: a.accent }} />
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{a.title}</h3>
                                    <p className="text-gray-600 dark:text-slate-300 text-xs leading-relaxed mb-3">{a.desc}</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${a.tagColor}`}>{a.tag}</span>
                                        <span className="text-[10px] text-gray-500 dark:text-slate-400">Oleh: {a.by}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
            <div className="flex justify-center gap-1.5 mt-3">
                {ANNOUNCEMENTS.map((_, i) => (
                    <button key={i} onClick={() => onDotClick(i)} className={`w-2 h-2 rounded-full transition-all ${i === carouselIdx ? 'bg-[#00529C] dark:bg-[#60b5ff] w-5' : 'bg-gray-300 dark:bg-slate-600'}`} />
                ))}
            </div>
        </div>
    )
}

function DropdownSelect({ value, onChange, options }: {
    value: number
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
    options: { value: number; label: string }[]
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={onChange}
                className="appearance-none pl-3 pr-8 py-2 text-xs font-semibold bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-[#00529C] dark:text-[#60b5ff] focus:ring-2 focus:ring-[#15A4FA]/40 cursor-pointer"
            >
                {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-slate-500 pointer-events-none" />
        </div>
    )
}

function EmptyChart({ msg }: { msg: string }) {
    return (
        <div className="h-72 flex items-center justify-center">
            <p className="text-gray-500 dark:text-slate-400 text-sm font-medium italic text-center">{msg}</p>
        </div>
    )
}

function ErrorMessage({ msg }: { msg: string }) {
    return (
        <div className="h-48 flex items-center justify-center">
            <p className="text-red-500 dark:text-red-400 text-sm font-medium text-center">{msg}</p>
        </div>
    )
}
