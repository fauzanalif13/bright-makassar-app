'use client'

import { useState, useEffect } from 'react'
import { getActiveBatches, getRekapanAngkatanData, RekapanAngkatanResult } from '@/app/dashboard/fasilitator/actions'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ComposedChart, Legend, Line, ReferenceLine, Cell
} from 'recharts'
import { useTheme } from '@/src/components/ThemeProvider'
import { Loader2, Filter, Calendar, Users, BarChart3, Target } from 'lucide-react'

const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export default function RekapanAngkatan() {
    const { isDark } = useTheme()
    
    // Filters
    const [selectedBatch, setSelectedBatch] = useState('Semua Angkatan')
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    
    // State
    const [batches, setBatches] = useState<{label: string, value: string}[]>([])
    const [data, setData] = useState<RekapanAngkatanResult[]>([])
    const [loadingBatches, setLoadingBatches] = useState(true)
    const [loadingData, setLoadingData] = useState(false)

    // Load active batches on mount
    useEffect(() => {
        async function loadBatches() {
            setLoadingBatches(true)
            try {
                const fetchedBatches = await getActiveBatches()
                setBatches(fetchedBatches)
            } finally {
                setLoadingBatches(false)
            }
        }
        loadBatches()
    }, [])

    // Load data when filters change
    useEffect(() => {
        async function loadData() {
            setLoadingData(true)
            try {
                const fetchedData = await getRekapanAngkatanData({
                    angkatan: selectedBatch,
                    month: selectedMonth,
                    year: selectedYear
                })
                setData(fetchedData)
            } finally {
                setLoadingData(false)
            }
        }
        loadData()
    }, [selectedBatch, selectedMonth, selectedYear])

    // Styling constants
    const tickColor = isDark ? '#94a3b8' : '#6B7280'
    const gridColor = isDark ? '#334155' : '#E5E7EB'
    const ibadahColor = isDark ? '#60b5ff' : '#00529C' // Bank BRI Light Blue
    const ipkColor = isDark ? '#3b82f6' : '#1e3a8a'    // Deep Blue
    const bgTooltip = isDark ? '#1e293b' : '#ffffff'
    const textTooltip = isDark ? '#f1f5f9' : '#111827'

    const currentYear = new Date().getFullYear()
    const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i)

    // Averages
    const avgIbadah = data.length > 0 
        ? Math.round(data.reduce((acc, curr) => acc + curr.ibadahScore, 0) / data.length)
        : 0
    const avgIpk = data.length > 0 
        ? Number((data.reduce((acc, curr) => acc + curr.ipk, 0) / data.length).toFixed(2))
        : 0

    // Chart min-width calculation for horizontal scroll if there are many awardees
    const minChartWidth = Math.max(100, data.length * 60) // 60px per awardee min

    return (
        <div className="space-y-6">
            {/* ─── FILTERS ─── */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
                    <Filter className="w-5 h-5" />
                    <span className="text-sm font-semibold">Filter:</span>
                </div>

                {/* Batch Dropdown */}
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
                        <option value="Semua Angkatan">Semua Angkatan (All BS)</option>
                        {batches.map(b => (
                            <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                    </select>
                </div>

                {/* Month Dropdown */}
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

                {/* Year Dropdown */}
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

            {/* ─── CHARTS ─── */}
            {loadingData ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm min-h-[400px]">
                    <Loader2 className="w-10 h-10 text-[#00529C] animate-spin mb-4" />
                    <p className="text-gray-500 dark:text-slate-400 font-medium">Mengambil data dari Google Sheets...</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Proses ini mungkin memakan waktu beberapa saat.</p>
                </div>
            ) : data.length === 0 ? (
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
                                <span className="text-sm font-bold text-[#00529C] dark:text-[#60b5ff]">{avgIbadah}%</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto pb-4 custom-scrollbar">
                            <div style={{ minWidth: `${minChartWidth}px` }} className="h-80 w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data} margin={{ top: 20, right: 30, left: -20, bottom: 40 }}>
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
                                        <ReferenceLine y={avgIbadah} stroke="#f43f5e" strokeDasharray="4 4" label={{ position: 'top', value: 'Avg', fill: '#f43f5e', fontSize: 12 }} />
                                        <Bar dataKey="ibadahScore" name="Skor Ibadah (%)" radius={[6, 6, 0, 0]} maxBarSize={48}>
                                            {data.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.ibadahScore >= avgIbadah ? ibadahColor : (isDark ? '#4b5563' : '#9ca3af')} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* CHART 2: Pendidikan */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                                    Perbandingan Capaian Pendidikan
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">IPK dan Aktivitas (Prestasi / Organisasi)</p>
                            </div>
                            <div className="px-4 py-2 bg-indigo-50 dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-slate-700">
                                <span className="text-xs text-gray-500 dark:text-slate-400 font-medium mr-2">Rata-rata IPK:</span>
                                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">{avgIpk}</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto pb-4 custom-scrollbar">
                            <div style={{ minWidth: `${minChartWidth}px` }} className="h-80 w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={data} margin={{ top: 20, right: 30, left: -20, bottom: 40 }}>
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
                                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 12 }} domain={[0, 4]} />
                                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 12 }} />
                                        <Tooltip
                                            cursor={{ fill: isDark ? '#334155' : '#F3F4F6', opacity: 0.5 }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px', backgroundColor: bgTooltip, color: textTooltip }}
                                            labelStyle={{ color: textTooltip, fontWeight: 600, marginBottom: '8px' }}
                                        />
                                        <Legend verticalAlign="top" height={36} iconType="circle" />
                                        <ReferenceLine y={avgIpk} yAxisId="left" stroke="#f59e0b" strokeDasharray="4 4" label={{ position: 'top', value: 'Avg IPK', fill: '#f59e0b', fontSize: 12 }} />
                                        <Bar yAxisId="left" dataKey="ipk" name="IPK (Skala 4.0)" fill={ipkColor} radius={[6, 6, 0, 0]} maxBarSize={48} />
                                        <Line yAxisId="right" type="monotone" dataKey="prestasiOrganisasiCount" name="Total Kegiatan" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
