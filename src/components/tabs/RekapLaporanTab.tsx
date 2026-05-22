'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import { getRekapLaporanData, getActiveBatches } from '@/app/dashboard/fasilitator/actions'
import type { RekapLaporanResult, RekapanAngkatanResult } from '@/app/dashboard/fasilitator/actions'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, ReferenceLine, Cell
} from 'recharts'
import { useTheme } from '@/src/components/ThemeProvider'
import {
    Loader2, Filter, Calendar, Users, Target,
    GraduationCap, Award, Trophy
} from 'lucide-react'

const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

type KegiatanFilter = 'semua' | 'prestasi' | 'organisasi'

export default function RekapLaporanTab() {
    const { isDark } = useTheme()

    // Filters
    const [selectedBatch, setSelectedBatch] = useState('')
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [kegiatanFilter, setKegiatanFilter] = useState<KegiatanFilter>('semua')
    const [selectedSemester, setSelectedSemester] = useState<'ipk' | number>('ipk')

    // State
    const [batches, setBatches] = useState<{ label: string; value: string }[]>([])
    const [result, setResult] = useState<RekapLaporanResult | null>(null)
    const [loadingBatches, setLoadingBatches] = useState(true)
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        getActiveBatches()
            .then((b: {label: string, value: string}[]) => {
                setBatches(b)
                if (b.length > 0) setSelectedBatch(b[0].value)
            })
            .finally(() => setLoadingBatches(false))
    }, [])

    // Load data on filter change
    useEffect(() => {
        startTransition(async () => {
            try {
                if (!selectedBatch) return // don't fetch if batch not set yet
                const data = await getRekapLaporanData({
                    angkatan: selectedBatch,
                    month: selectedMonth,
                    year: selectedYear,
                })
                setResult(data)
            } catch (err) {
                console.error('Failed to fetch Rekap Laporan:', err)
            }
        })
    }, [selectedBatch, selectedMonth, selectedYear])

    // Theme colors
    const tickColor = isDark ? '#94a3b8' : '#6B7280'
    const gridColor = isDark ? '#334155' : '#E5E7EB'
    const ibadahColor = isDark ? '#60b5ff' : '#00529C'
    const ipkColor = isDark ? '#3b82f6' : '#1e3a8a'
    const prestasiColor = isDark ? '#fbbf24' : '#D97706'
    const organisasiColor = isDark ? '#a78bfa' : '#7c3aed'
    const bgTooltip = isDark ? '#1e293b' : '#ffffff'
    const textTooltip = isDark ? '#f1f5f9' : '#111827'
    const currentYear = new Date().getFullYear()
    const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i)

    const data = result?.awardees || []
    
    // Sanitize data to prevent NaN crashes in Recharts
    const sanitizedData = useMemo(() => {
        return data.map(d => ({
            ...d,
            ibadahScore: isNaN(d.ibadahScore) ? 0 : (d.ibadahScore || 0),
            ipk: isNaN(d.ipk) ? 0 : (d.ipk || 0),
            prestasiCount: isNaN(d.prestasiCount) ? 0 : (d.prestasiCount || 0),
            organisasiCount: isNaN(d.organisasiCount) ? 0 : (d.organisasiCount || 0),
            semesterIps: d.semesterIps?.map(ip => isNaN(ip) ? 0 : (ip || 0)) || [],
        }))
    }, [data])

    const summary = result?.summary || { totalAwardees: 0, avgIbadah: 0, avgIpk: 0, totalPrestasi: 0, totalOrganisasi: 0 }
    const minChartWidth = Math.max(100, sanitizedData.length * 60)

    // Prepare kegiatan chart data based on filter
    const kegiatanData = sanitizedData.map(a => ({
        name: a.name,
        ...(kegiatanFilter === 'semua' || kegiatanFilter === 'prestasi'
            ? { Prestasi: a.prestasiCount }
            : {}),
        ...(kegiatanFilter === 'semua' || kegiatanFilter === 'organisasi'
            ? { Organisasi: a.organisasiCount }
            : {}),
    }))

    const kegiatanTotal = kegiatanFilter === 'prestasi'
        ? summary.totalPrestasi
        : kegiatanFilter === 'organisasi'
        ? summary.totalOrganisasi
        : summary.totalPrestasi + summary.totalOrganisasi

    // Prepare IPK chart data based on semester selection
    const ipkChartData = useMemo(() => {
        return sanitizedData.map(a => ({
            name: a.name,
            value: selectedSemester === 'ipk'
                ? a.ipk
                : (a.semesterIps?.[Number(selectedSemester) - 1] ?? 0),
        }))
    }, [sanitizedData, selectedSemester])

    const ipkChartAvg = useMemo(() => {
        const vals = ipkChartData.map(d => d.value).filter(v => v > 0)
        if (vals.length === 0) return 0
        return Number((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2))
    }, [ipkChartData])

    return (
        <div className="space-y-6">
            {/* ─── FILTERS ─── */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
                    <Filter className="w-5 h-5" />
                    <span className="text-sm font-semibold">Filter:</span>
                </div>

                <div className="flex-1 w-full md:w-auto relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Users className="w-4 h-4 text-gray-400" />
                    </div>
                    <select
                        value={selectedBatch}
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        disabled={loadingBatches}
                        className="w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none appearance-none disabled:opacity-50"
                    >
                        {batches.map(b => (
                            <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 w-full md:w-auto relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Calendar className="w-4 h-4 text-gray-400" />
                    </div>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none appearance-none"
                    >
                        {MONTHS.map((m, i) => (
                            <option key={i + 1} value={i + 1}>{m}</option>
                        ))}
                    </select>
                </div>

                <div className="w-full md:w-32 relative">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none appearance-none"
                    >
                        {availableYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ─── Summary Cards ─── */}
            <div className="grid grid-cols-3 gap-4">
                <SummaryCard
                    icon={Users} label="Total Awardee"
                    value={String(summary.totalAwardees)}
                    colorClass="text-[#00529C] dark:text-[#60b5ff]"
                    bgClass="bg-blue-50 dark:bg-[#00529C]/15"
                />
                <SummaryCard
                    icon={Target} label="Rata-rata Ibadah"
                    value={`${summary.avgIbadah || 0}%`}
                    colorClass="text-emerald-600 dark:text-emerald-400"
                    bgClass="bg-emerald-50 dark:bg-emerald-500/15"
                />
                <SummaryCard
                    icon={Award} label="Total Kegiatan"
                    value={String(summary.totalPrestasi + summary.totalOrganisasi)}
                    colorClass="text-amber-600 dark:text-amber-400"
                    bgClass="bg-amber-50 dark:bg-amber-500/15"
                    subtitle={`${summary.totalPrestasi} Prestasi · ${summary.totalOrganisasi} Organisasi`}
                />
            </div>

            {/* ─── Charts ─── */}
            {isPending ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm min-h-[400px]">
                    <Loader2 className="w-10 h-10 text-[#00529C] dark:text-[#60b5ff] animate-spin mb-4" />
                    <p className="text-gray-500 dark:text-slate-400 font-medium">Mengambil data dari Google Sheets...</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Proses ini mungkin memakan waktu beberapa saat.</p>
                </div>
            ) : sanitizedData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm min-h-[400px]">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-slate-400 font-semibold">Tidak ada data untuk angkatan ini.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* CHART 1: Ibadah */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Target className="w-5 h-5 text-[#15A4FA]" />
                                    Perbandingan Capaian Ibadah
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Bulan {MONTHS[selectedMonth - 1]} {selectedYear}</p>
                            </div>
                            <div className="px-4 py-2 bg-[#f0f9ff] dark:bg-slate-900 rounded-xl border border-[#bae6fd] dark:border-slate-700">
                                <span className="text-xs text-gray-500 dark:text-slate-400 font-medium mr-2">Rata-rata Batch:</span>
                                <span className="text-sm font-bold text-[#00529C] dark:text-[#60b5ff]">{summary.avgIbadah || 0}%</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto pb-4 scrollbar-minimal">
                            <div style={{ minWidth: `${minChartWidth}px` }} className="h-80 w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sanitizedData} margin={{ top: 20, right: 30, left: -20, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: tickColor, fontSize: 11 }}
                                            interval={0}
                                            tickFormatter={(val) => val.length > 12 ? val.substring(0, 10) + '...' : val}
                                            angle={-45}
                                            textAnchor="end"
                                            dy={5}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 12 }} domain={[0, 100]} />
                                        <Tooltip
                                            cursor={{ fill: isDark ? '#334155' : '#F3F4F6', opacity: 0.5 }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px', backgroundColor: bgTooltip, color: textTooltip }}
                                            labelStyle={{ color: textTooltip, fontWeight: 600, marginBottom: '8px' }}
                                            itemStyle={{ fontWeight: 'bold' }}
                                        />
                                        <ReferenceLine y={summary.avgIbadah || 0} stroke="#f43f5e" strokeDasharray="4 4" label={{ position: 'top', value: 'Avg', fill: '#f43f5e', fontSize: 12 }} />
                                        <Bar dataKey="ibadahScore" name="Skor Ibadah (%)" radius={[6, 6, 0, 0]} maxBarSize={48}>
                                            {sanitizedData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={(entry.ibadahScore || 0) >= (summary.avgIbadah || 0) ? ibadahColor : (isDark ? '#4b5563' : '#9ca3af')} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* CHARTS 2 & 3: IPK (left) + Kegiatan (right) ─── Split ─── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* CHART 2: IP/IPK per Awardee with Semester dropdown */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <GraduationCap className="w-5 h-5 text-indigo-500" />
                                        IP / IPK
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Perbandingan per Awardee (Skala 4.0)</p>
                                </div>
                                <div className="px-3 py-1.5 bg-indigo-50 dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-slate-700">
                                    <span className="text-xs text-gray-500 dark:text-slate-400 font-medium mr-1">Avg:</span>
                                    <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">{ipkChartAvg}</span>
                                </div>
                            </div>

                            {/* Semester selector */}
                            <div className="flex gap-1.5 mb-4 bg-gray-100 dark:bg-slate-900 p-1 rounded-lg w-fit flex-wrap">
                                <button
                                    onClick={() => setSelectedSemester('ipk')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                        selectedSemester === 'ipk'
                                            ? 'bg-white dark:bg-slate-700 text-[#00529C] dark:text-[#60b5ff] shadow-sm'
                                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    IPK
                                </button>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                    <button
                                        key={sem}
                                        onClick={() => setSelectedSemester(sem)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                            selectedSemester === sem
                                                ? 'bg-white dark:bg-slate-700 text-[#00529C] dark:text-[#60b5ff] shadow-sm'
                                                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        Sem {sem}
                                    </button>
                                ))}
                            </div>

                            <div className="overflow-x-auto pb-4 scrollbar-minimal">
                                <div style={{ minWidth: `${minChartWidth}px` }} className="h-72 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={ipkChartData} margin={{ top: 15, right: 20, left: -20, bottom: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: tickColor, fontSize: 10 }}
                                                interval={0}
                                                tickFormatter={(val) => val.length > 10 ? val.substring(0, 8) + '...' : val}
                                                angle={-45}
                                                textAnchor="end"
                                                dy={5}
                                            />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 11 }} domain={[0, 4]} />
                                            <Tooltip
                                                cursor={{ fill: isDark ? '#334155' : '#F3F4F6', opacity: 0.5 }}
                                                contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', padding: '10px', backgroundColor: bgTooltip, color: textTooltip }}
                                                labelStyle={{ color: textTooltip, fontWeight: 600 }}
                                            />
                                            <ReferenceLine y={ipkChartAvg} stroke="#f59e0b" strokeDasharray="4 4" label={{ position: 'top', value: `Avg ${ipkChartAvg}`, fill: '#f59e0b', fontSize: 11 }} />
                                            <Bar dataKey="value" name={selectedSemester === 'ipk' ? 'IPK' : `IP Sem ${selectedSemester}`} fill={ipkColor} radius={[6, 6, 0, 0]} maxBarSize={40}>
                                                {ipkChartData.map((entry, index) => (
                                                    <Cell key={`ipk-${index}`} fill={entry.value >= ipkChartAvg ? ipkColor : (isDark ? '#4b5563' : '#9ca3af')} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* CHART 3: Kegiatan with Filter */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-amber-500" />
                                        Total Kegiatan
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Prestasi & Organisasi per Awardee</p>
                                </div>
                                <div className="px-3 py-1.5 bg-amber-50 dark:bg-slate-900 rounded-xl border border-amber-100 dark:border-slate-700">
                                    <span className="text-xs text-gray-500 dark:text-slate-400 font-medium mr-1">Total:</span>
                                    <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{kegiatanTotal}</span>
                                </div>
                            </div>

                            {/* Kegiatan Filter Tabs */}
                            <div className="flex gap-1.5 mb-4 bg-gray-100 dark:bg-slate-900 p-1 rounded-lg w-fit">
                                {([
                                    { key: 'semua' as KegiatanFilter, label: 'Semua' },
                                    { key: 'prestasi' as KegiatanFilter, label: 'Prestasi' },
                                    { key: 'organisasi' as KegiatanFilter, label: 'Organisasi' },
                                ]).map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => setKegiatanFilter(key)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                            kegiatanFilter === key
                                                ? 'bg-white dark:bg-slate-700 text-[#00529C] dark:text-[#60b5ff] shadow-sm'
                                                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="overflow-x-auto pb-4 scrollbar-minimal">
                                <div style={{ minWidth: `${minChartWidth}px` }} className="h-60 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={kegiatanData} margin={{ top: 15, right: 20, left: -20, bottom: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: tickColor, fontSize: 10 }}
                                                interval={0}
                                                tickFormatter={(val) => val.length > 10 ? val.substring(0, 8) + '...' : val}
                                                angle={-45}
                                                textAnchor="end"
                                                dy={5}
                                            />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 11 }} allowDecimals={false} />
                                            <Tooltip
                                                cursor={{ fill: isDark ? '#334155' : '#F3F4F6', opacity: 0.5 }}
                                                contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', padding: '10px', backgroundColor: bgTooltip, color: textTooltip }}
                                                labelStyle={{ color: textTooltip, fontWeight: 600 }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" />
                                            {(kegiatanFilter === 'semua' || kegiatanFilter === 'prestasi') && (
                                                <Bar dataKey="Prestasi" name="Prestasi" fill={prestasiColor} radius={[4, 4, 0, 0]} maxBarSize={32} stackId="kegiatan" />
                                            )}
                                            {(kegiatanFilter === 'semua' || kegiatanFilter === 'organisasi') && (
                                                <Bar dataKey="Organisasi" name="Organisasi" fill={organisasiColor} radius={[4, 4, 0, 0]} maxBarSize={32} stackId="kegiatan" />
                                            )}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Summary Card ────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, colorClass, bgClass, subtitle }: {
    icon: any
    label: string
    value: string
    colorClass: string
    bgClass: string
    subtitle?: string
}) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">{label}</p>
                    <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
                    {subtitle && (
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{subtitle}</p>
                    )}
                </div>
            </div>
        </div>
    )
}
