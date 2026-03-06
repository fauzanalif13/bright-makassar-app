'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import {
    BarChart, Bar, AreaChart, Area, LineChart, Line, Brush,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts'
import {
    ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Megaphone,
    FileText, CheckCircle2, Calendar, BookOpen, GraduationCap,
    AlertTriangle, CalendarDays, MapPin, UserCheck, Clock, Eye, EyeOff
} from 'lucide-react'
import { enrichTrendData, getCurrentAcademicYear } from '@/src/lib/chartHelpers'
import type { EnrichedTrendItem } from '@/src/lib/chartHelpers'
import IbadahComparisonChart from '@/src/components/charts/IbadahComparisonChart'
import { useTheme } from '@/src/components/ThemeProvider'

// ─── Announcements (Replaced by Dynamic Data) ────────────────────────
// Constant arrays removed. We map DB `tipe` dynamically.
const TYPE_CONFIG: Record<string, { tagColor: string, accent: string, icon: any }> = {
    'Tugas': { tagColor: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30', accent: '#EF4444', icon: FileText },
    'Peringatan': { tagColor: 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30', accent: '#F59E0B', icon: AlertTriangle },
    'Info': { tagColor: 'text-[#00529C] bg-blue-100 dark:text-[#60b5ff] dark:bg-[#00529C]/30', accent: '#15A4FA', icon: Megaphone }
}

const ACHIEVEMENT_COLORS_LIGHT: Record<string, string> = {
    'Pembinaan': '#00529C', 'Prestasi': '#15A4FA', 'Organisasi': '#8B5CF6', 'Workshop': '#10B981',
}
const ACHIEVEMENT_COLORS_DARK: Record<string, string> = {
    'Pembinaan': '#60b5ff', 'Prestasi': '#5cc8ff', 'Organisasi': '#a78bfa', 'Workshop': '#34d399',
}

// ─── Types ──────────────────────────────────────────────────────────

export type IbadahComparisonItem = { aktivitas: string; current: number; previous: number }
export type IbadahTrendItem = { bulan: string; skor: number | null; tahun: number }
export type IpIpkItem = { semester: string; IP: number; IPK: number }
export type AchievementItem = { name: string; count: number }

type Props = {
    displayName: string
    spreadsheetConfigured: boolean
    angkatan: number
    pengumumanData: any[]
    jadwalData: any[]
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

    if (data.skor === null) {
        return (
            <div className={`rounded-xl shadow-lg border px-4 py-3 min-w-[200px] ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                <p className={`text-sm font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{label}</p>
                <p className={`text-xs italic ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Belum ada data</p>
            </div>
        )
    }

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
                    <span className={`font-bold ${isDark ? 'text-[#a78bfa]' : 'text-[#8B5CF6]'}`}>{data.rataRataKeseluruhan ?? 0}%</span>
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
    displayName, spreadsheetConfigured, angkatan, pengumumanData, jadwalData
}: Props) {
    const [carouselIdx, setCarouselIdx] = useState(0)
    const scrollRef = useRef<HTMLDivElement>(null)
    const { isDark } = useTheme()

    const [hiddenSections, setHiddenSections] = useState({
        pengumuman: false,
        pembinaan: false,
        ibadah: false,
        pendidikan: false
    })
    
    const toggleSection = (key: keyof typeof hiddenSections) => {
        setHiddenSections(prev => ({ ...prev, [key]: !prev[key] }))
    }

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

                    setIbadahComparison(prev => JSON.stringify(prev) === JSON.stringify(data.ibadahComparison) ? prev : (data.ibadahComparison || []))
                    setAllTrendData(prev => JSON.stringify(prev) === JSON.stringify(data.allTrendData) ? prev : (data.allTrendData || []))

                    setCachedData('dashboard_ibadah', {
                        ibadahComparison: data.ibadahComparison || [],
                        allTrendData: data.allTrendData || [],
                    })
                })
                .catch(() => { }) // silently fail background refresh
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

                setIbadahComparison(prev => JSON.stringify(prev) === JSON.stringify(data.ibadahComparison) ? prev : (data.ibadahComparison || []))
                setAllTrendData(prev => JSON.stringify(prev) === JSON.stringify(data.allTrendData) ? prev : (data.allTrendData || []))

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

                    setIpIpkData(prev => JSON.stringify(prev) === JSON.stringify(data.ipIpkData) ? prev : (data.ipIpkData || []))
                    setAchievementData(prev => JSON.stringify(prev) === JSON.stringify(data.achievementData) ? prev : (data.achievementData || []))

                    setCachedData('dashboard_pendidikan', {
                        ipIpkData: data.ipIpkData || [],
                        achievementData: data.achievementData || [],
                    })
                })
                .catch(() => { })
            return
        }

        fetch('/api/dashboard/pendidikan')
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json()
            })
            .then(data => {
                if (cancelled) return

                setIpIpkData(prev => JSON.stringify(prev) === JSON.stringify(data.ipIpkData) ? prev : (data.ipIpkData || []))
                setAchievementData(prev => JSON.stringify(prev) === JSON.stringify(data.achievementData) ? prev : (data.achievementData || []))

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

    const [brushStart, setBrushStart] = useState(0)
    const [brushEnd, setBrushEnd] = useState(5)

    const enrichedData = useMemo(() => enrichTrendData(allTrendData), [allTrendData])

    // Provide initial jump to the default tahun when data first loads
    const initialJumpDone = useRef(false)
    useEffect(() => {
        if (!initialJumpDone.current && enrichedData.length > 0) {
            initialJumpDone.current = true
            const startIdx = enrichedData.findIndex(d => d.tahun === selectedTahun)
            const start = startIdx >= 0 ? startIdx : 0
            const end = Math.min(start + selectedSpan - 1, Math.max(0, enrichedData.length - 1))
            setBrushStart(start)
            setBrushEnd(end)
        }
    }, [enrichedData, selectedTahun, selectedSpan])

    const handleTahunChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = parseInt(e.target.value)
        setSelectedTahun(val)
        const startIdx = enrichedData.findIndex(d => d.tahun === val)
        const start = startIdx >= 0 ? startIdx : 0
        const end = Math.min(start + selectedSpan - 1, Math.max(0, enrichedData.length - 1))
        setBrushStart(start)
        setBrushEnd(end)
    }, [selectedSpan, enrichedData])

    const handleSpanChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = parseInt(e.target.value)
        setSelectedSpan(val)
        const end = Math.min(brushStart + val - 1, Math.max(0, enrichedData.length - 1))
        setBrushEnd(end)
    }, [brushStart, enrichedData.length])

    const handleBrushChange = useCallback((range: { startIndex?: number; endIndex?: number }) => {
        if (range.startIndex !== undefined) setBrushStart(range.startIndex)
        if (range.endIndex !== undefined) setBrushEnd(range.endIndex)
    }, [])

    function scrollCarousel(dir: 'left' | 'right') {
        const next = dir === 'left'
            ? Math.max(0, carouselIdx - 1)
            : Math.min(pengumumanData.length - 1, carouselIdx + 1)
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
                data={pengumumanData}
                isHidden={hiddenSections.pengumuman}
                onToggleHide={() => toggleSection('pengumuman')}
                onDotClick={(i) => {
                    setCarouselIdx(i)
                    scrollRef.current?.children[i]?.scrollIntoView({
                        behavior: 'smooth', inline: 'start', block: 'nearest'
                    })
                }}
            />

            {/* ─── Papan Informasi Pembinaan Bulanan ───────────────────── */}
            <PembinaanBoard 
                jadwalData={jadwalData} 
                isHidden={hiddenSections.pembinaan}
                onToggleHide={() => toggleSection('pembinaan')}
            />

            {/* ─── Grafik Ibadah ──────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 lg:p-5">
                <div className={`flex flex-wrap items-center justify-between gap-3 ${hiddenSections.ibadah ? '' : 'mb-6'}`}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#00529C]/10 dark:bg-[#00529C]/20 text-[#00529C] dark:text-[#60b5ff] flex items-center justify-center">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[#00529C] dark:text-[#60b5ff]">Grafik Ibadah</h2>
                            {!hiddenSections.ibadah && (
                                <p className="text-xs text-gray-600 dark:text-slate-400">
                                    Timeline {angkatan} – {angkatan + 4}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {!hiddenSections.ibadah && (
                            <>
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
                                <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-slate-700 ml-1" />
                            </>
                        )}
                        <button onClick={() => toggleSection('ibadah')} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50">
                            {hiddenSections.ibadah ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {!hiddenSections.ibadah && (
                    <>
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
                            ) : <EmptyChart msg="Konfigurasi range Ibadah di Profil." />}
                            </div>
                        </div>
                        )}
                    </>
                )}
            </div>

            {/* ─── Grafik Pendidikan ──────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                <div className={`flex items-center justify-between gap-3 ${hiddenSections.pendidikan ? '' : 'mb-6'}`}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#15A4FA]/10 dark:bg-[#15A4FA]/20 text-[#15A4FA] dark:text-[#5cc8ff] flex items-center justify-center">
                            <GraduationCap className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[#00529C] dark:text-[#60b5ff]">Grafik Pendidikan</h2>
                            {!hiddenSections.pendidikan && (
                                <p className="text-xs text-gray-600 dark:text-slate-400">Data dari sheet Resume</p>
                            )}
                        </div>
                    </div>
                    <button onClick={() => toggleSection('pendidikan')} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        {hiddenSections.pendidikan ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>
                </div>

                {!hiddenSections.pendidikan && (
                    <>
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
                    </>
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

function AnnouncementCarousel({ carouselIdx, scrollRef, onScroll, onDotClick, data, isHidden, onToggleHide }: {
    carouselIdx: number
    scrollRef: React.RefObject<HTMLDivElement | null>
    onScroll: (dir: 'left' | 'right') => void
    onDotClick: (i: number) => void
    data: any[]
    isHidden: boolean
    onToggleHide: () => void
}) {
    if (!data || data.length === 0) {
        return null // Hide entirely if no data
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
            <div className={`flex flex-wrap items-center justify-between gap-3 ${isHidden ? '' : 'mb-4'}`}>
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center">
                        <Megaphone className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Himbauan / Tugas Terbaru</h2>
                </div>
                <div className="flex gap-1.5 items-center">
                    {!isHidden && (
                        <>
                            <button onClick={() => onScroll('left')} disabled={carouselIdx === 0} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-600 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-all">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={() => onScroll('right')} disabled={carouselIdx === data.length - 1} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-600 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-all">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1.5" />
                        </>
                    )}
                    <button onClick={onToggleHide} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        {isHidden ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>
                </div>
            </div>
            
            {!isHidden && (
                <>
                    <div ref={scrollRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1 scrollbar-minimal">
                        {data.map((a, i) => {
                    const config = TYPE_CONFIG[a.tipe] || TYPE_CONFIG['Info']
                    const Icon = config.icon
                    const by = a.author?.name || 'Fasilitator'
                    const deadline = a.tenggat_waktu 
                        ? new Date(a.tenggat_waktu).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) 
                        : null

                    return (
                        <div key={a.id} className="min-w-[280px] md:min-w-[340px] snap-start border border-gray-100 dark:border-slate-700 rounded-xl p-5 bg-gray-50/50 dark:bg-slate-700/30 hover:bg-white dark:hover:bg-slate-700/60 hover:shadow-sm transition-all relative overflow-hidden flex-shrink-0 group">
                            <div className="absolute top-0 right-0 w-1.5 h-full transition-all group-hover:w-2" style={{ backgroundColor: config.accent }} />
                            <div className="flex gap-3">
                                <div className="mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${config.accent}15` }}>
                                    <Icon className="w-4 h-4" style={{ color: config.accent }} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-[13px] leading-tight mb-1.5 pr-2">{a.judul}</h3>
                                    <p className="text-gray-600 dark:text-slate-300 text-xs leading-relaxed mb-3 line-clamp-2">{a.deskripsi}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${config.tagColor}`}>{a.tipe}</span>
                                        <span className="text-[10px] text-gray-500 dark:text-slate-400 flex items-center gap-1">Oleh: {by}</span>
                                        {deadline && (
                                            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                <CalendarDays className="w-3 h-3" /> {deadline}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
            {data.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                    {data.map((_, i) => (
                        <button key={i} onClick={() => onDotClick(i)} className={`w-2 h-2 rounded-full transition-all ${i === carouselIdx ? 'bg-[#00529C] dark:bg-[#60b5ff] w-5' : 'bg-gray-300 dark:bg-slate-600'}`} />
                    ))}
                </div>
            )}
                </>
            )}
        </div>
    )
}

function PembinaanBoard({ jadwalData, isHidden, onToggleHide }: { jadwalData: any[], isHidden: boolean, onToggleHide: () => void }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
            <div className={`flex flex-wrap items-center justify-between gap-3 ${isHidden ? '' : 'mb-4'}`}>
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#00529C]/10 dark:bg-[#00529C]/20 text-[#00529C] dark:text-[#60b5ff] flex items-center justify-center">
                        <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Papan Informasi Pembinaan</h2>
                    </div>
                </div>
                <div className="flex gap-1.5 items-center">
                    <button onClick={onToggleHide} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        {isHidden ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {!isHidden && (
                <>
                    {!jadwalData || jadwalData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-slate-700 flex items-center justify-center mb-2">
                                <CheckCircle2 className="w-4 h-4 text-[#15A4FA] opacity-60" />
                            </div>
                            <h3 className="text-gray-900 dark:text-white font-bold text-sm mb-1">Semua Selesai</h3>
                            <p className="text-gray-500 dark:text-slate-400 text-xs">Tidak ada jadwal pembinaan untuk waktu dekat.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {jadwalData.map((j) => {
                                const eventDate = new Date(j.tanggal_waktu)
                                eventDate.setHours(0, 0, 0, 0)
                                const today = new Date()
                                today.setHours(0, 0, 0, 0)
                                const diffDays = Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                                
                                let HBadge = null;
                                if (diffDays === 0) {
                                    HBadge = <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm animate-pulse flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> HARI INI</span>
                                } else if (diffDays <= 3 && diffDays > 0) {
                                    HBadge = <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">H-{diffDays}</span>
                                } else if (diffDays > 3) {
                                    HBadge = <span className="bg-[#15A4FA] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">H-{diffDays}</span>
                                }

                                return (
                                    <div key={j.id} className="border border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-700/30 rounded-xl p-4 hover:shadow-sm hover:bg-white dark:hover:bg-slate-700/60 transition-all flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2.5 gap-2">
                                                <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2">{j.judul_materi}</h3>
                                                <div className="shrink-0">{HBadge}</div>
                                            </div>
                                            <div className="space-y-2 mb-3">
                                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                                                    <Clock className="w-3.5 h-3.5 text-[#15A4FA]" />
                                                    <span>{new Date(j.tanggal_waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • {new Date(j.tanggal_waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA</span>
                                                </div>
                                                <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-300">
                                                    <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                                    <span className="line-clamp-2" title={j.lokasi_atau_link}>{j.lokasi_atau_link}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-gray-50 dark:border-slate-700/50">
                                            <UserCheck className="w-3.5 h-3.5 text-[#00529C] dark:text-[#60b5ff]" />
                                            <span className="truncate">Pemateri: {j.narasumber}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </>
            )}
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
