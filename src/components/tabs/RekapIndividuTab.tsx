'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { getIndividualFullData, getActiveBatches } from '@/app/dashboard/fasilitator/actions'
import type { IndividualFullResult, AwardeeFullInfo } from '@/app/dashboard/fasilitator/actions'
import { AwardeeIbadahDailyChart, AwardeeIbadahMonthlyChart } from '@/src/components/charts/AwardeeCharts'
import type { IbadahMonthlyChartData, IbadahDailyChartData } from '@/src/components/charts/AwardeeCharts'
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts'
import { useTheme } from '@/src/components/ThemeProvider'
import {
    User, Users, Loader2, BookOpen, GraduationCap, ChevronDown
} from 'lucide-react'

type Props = {
    awardees: AwardeeFullInfo[]
}

const ACHIEVEMENT_COLORS_LIGHT: Record<string, string> = {
    'Prestasi': '#15A4FA', 'Organisasi': '#8B5CF6',
}
const ACHIEVEMENT_COLORS_DARK: Record<string, string> = {
    'Prestasi': '#5cc8ff', 'Organisasi': '#a78bfa',
}

export default function RekapIndividuTab({ awardees }: Props) {
    const { isDark } = useTheme()
    const [selectedBatch, setSelectedBatch] = useState('')
    const [selectedAwName, setSelectedAwName] = useState('')
    const [individualData, setIndividualData] = useState<IndividualFullResult | null>(null)
    const [isPending, startTransition] = useTransition()
    const [batches, setBatches] = useState<{ label: string; value: string }[]>([])

    // Sanitize data to prevent NaN crashes in Recharts
    const sanitizedIndividualData = useMemo(() => {
        if (!individualData) return null
        
        return {
            ...individualData,
            ibadah: {
                monthly: individualData.ibadah.monthly.map(m => ({
                    ...m,
                    skor: isNaN(m.skor) ? 0 : (m.skor || 0)
                })),
                daily: individualData.ibadah.daily.map(d => {
                    const newD: any = { ...d }
                    for (const key in newD) {
                        if (key !== 'day') {
                            newD[key] = isNaN(newD[key]) ? 0 : (newD[key] || 0)
                        }
                    }
                    return newD
                })
            },
            ipIpk: individualData.ipIpk.map(ip => ({
                ...ip,
                IP: isNaN(ip.IP) ? 0 : (ip.IP || 0),
                IPK: isNaN(ip.IPK) ? 0 : (ip.IPK || 0)
            })),
            achievements: Array.isArray(individualData.achievements) 
                ? individualData.achievements.map(a => ({
                    ...a,
                    count: isNaN(a.count) ? 0 : (a.count || 0)
                }))
                : []
        }
    }, [individualData])

    // Load batch options
    useEffect(() => {
        getActiveBatches().then((b: {label: string, value: string}[]) => {
            setBatches(b)
            if (b.length > 0) setSelectedBatch(prev => prev === '' ? b[0].value : prev)
        }).catch(() => {})
    }, [])

    // Filter awardees by selected batch
    const filteredAwardees = useMemo(() => {
        if (!selectedBatch) return []
        return awardees.filter(a => a.spreadsheet_id && String(a.angkatan) === selectedBatch)
    }, [awardees, selectedBatch])

    // Reset awardee selection when batch changes
    function handleBatchChange(batch: string) {
        setSelectedBatch(batch)
        setSelectedAwName('')
        setIndividualData(null)
    }

    // Load data when awardee is selected
    function handleAwardeeChange(name: string) {
        setSelectedAwName(name)
        setIndividualData(null)

        if (!name) return
        const aw = awardees.find(a => a.name === name)
        if (!aw?.spreadsheet_id) return

        startTransition(async () => {
            try {
                const result = await getIndividualFullData(aw.spreadsheet_id!, aw.sheet_config, aw.angkatan)
                setIndividualData(result)
            } catch (err) {
                console.error('Failed to fetch individual data:', err)
            }
        })
    }

    const selectedAwardee = awardees.find(a => a.name === selectedAwName) || null


    // Theme colors
    const gridColor = isDark ? '#334155' : '#E5E7EB'
    const tickColor = isDark ? '#94a3b8' : '#6B7280'
    const tickColorAlt = isDark ? '#cbd5e1' : '#374151'
    const ipColor = isDark ? '#5cc8ff' : '#15A4FA'
    const ipkColor = isDark ? '#60b5ff' : '#00529C'
    const scoreColor = isDark ? '#60b5ff' : '#00529C'
    const achievementColors = isDark ? ACHIEVEMENT_COLORS_DARK : ACHIEVEMENT_COLORS_LIGHT

    return (
        <div className="space-y-6">
            {/* ─── Cascading Dropdowns: Batch → Awardee ─── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-[#00529C]/20 text-[#00529C] dark:text-[#60b5ff] flex items-center justify-center">
                        <User className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pilih Awardee</h2>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Pilih angkatan terlebih dahulu, lalu pilih awardee</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                    {/* Step 1: Batch Dropdown */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 block">1. Angkatan</label>
                        <div className="relative">
                            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500 pointer-events-none" />
                            <select
                                value={selectedBatch}
                                onChange={(e) => handleBatchChange(e.target.value)}
                                className="w-full appearance-none pl-10 pr-10 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-[#15A4FA]/40 focus:border-[#15A4FA] transition-all cursor-pointer"
                            >
                                <option value="">-- Pilih Angkatan --</option>
                                {batches.map(b => (
                                    <option key={b.value} value={b.value}>{b.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500 pointer-events-none" />
                        </div>
                    </div>

                    {/* Step 2: Awardee Dropdown (enabled after batch selected) */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 block">2. Awardee</label>
                        <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500 pointer-events-none" />
                            <select
                                value={selectedAwName}
                                onChange={(e) => handleAwardeeChange(e.target.value)}
                                disabled={!selectedBatch}
                                className="w-full appearance-none pl-10 pr-10 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-[#15A4FA]/40 focus:border-[#15A4FA] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <option value="">
                                    {!selectedBatch ? '-- Pilih Angkatan dulu --' : `-- Pilih Awardee (${filteredAwardees.length}) --`}
                                </option>
                                {filteredAwardees.map(aw => (
                                    <option key={aw.name} value={aw.name}>{aw.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Loading state ─── */}
            {isPending && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-12 flex items-center justify-center">
                    <div className="text-center space-y-3">
                        <Loader2 className="w-8 h-8 text-[#15A4FA] animate-spin mx-auto" />
                        <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Memuat data {selectedAwName}...</p>
                    </div>
                </div>
            )}

            {/* ─── Individual charts ─── */}
            {!isPending && sanitizedIndividualData && selectedAwardee && (
                <div className="space-y-6">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#00529C] to-[#15A4FA] rounded-2xl p-5 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl font-black shrink-0">
                                {selectedAwardee.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{selectedAwardee.name}</h2>
                                <p className="text-blue-100 text-sm">
                                    {selectedAwardee.angkatan ? `Angkatan ${selectedAwardee.angkatan}` : ''} {selectedAwardee.gender ? `• ${selectedAwardee.gender}` : ''}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Ibadah Charts */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="w-9 h-9 rounded-lg bg-[#00529C]/10 dark:bg-[#00529C]/20 text-[#00529C] dark:text-[#60b5ff] flex items-center justify-center">
                                <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[#00529C] dark:text-[#60b5ff]">Grafik Ibadah</h3>
                                <p className="text-xs text-gray-500 dark:text-slate-400">Data ibadah bulan ini</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-4">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 text-center mb-2">Tren Harian</h4>
                                <AwardeeIbadahDailyChart data={sanitizedIndividualData.ibadah.daily as IbadahDailyChartData[]} />
                            </div>

                            <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-4">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 text-center mb-2">Rerata Capaian (%)</h4>
                                <AwardeeIbadahMonthlyChart data={sanitizedIndividualData.ibadah.monthly as IbadahMonthlyChartData[]} />
                            </div>
                        </div>
                    </div>

                    {/* Pendidikan Charts */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="w-9 h-9 rounded-lg bg-[#15A4FA]/10 dark:bg-[#15A4FA]/20 text-[#15A4FA] dark:text-[#5cc8ff] flex items-center justify-center">
                                <GraduationCap className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[#00529C] dark:text-[#60b5ff]">Grafik Pendidikan</h3>
                                <p className="text-xs text-gray-500 dark:text-slate-400">IP/IPK dan Riwayat Kegiatan</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* IP/IPK Area Chart */}
                            <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-4">
                                <h4 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-4">Tren IP & IPK</h4>
                                {sanitizedIndividualData.ipIpk.length > 0 ? (
                                    <div className="h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={sanitizedIndividualData.ipIpk} margin={{ top: 10, right: 5, left: -15, bottom: 5 }}>
                                                <defs>
                                                    <linearGradient id="ipGradIndiv" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={ipColor} stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor={ipColor} stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="ipkGradIndiv" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={ipkColor} stopOpacity={0.15} />
                                                        <stop offset="95%" stopColor={ipkColor} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                                <XAxis dataKey="semester" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 11 }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColorAlt, fontSize: 11 }} domain={[0, 4]} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', fontSize: '12px', padding: '10px', backgroundColor: isDark ? '#1e293b' : '#fff', color: isDark ? '#f1f5f9' : '#111827' }}
                                                    labelStyle={{ color: isDark ? '#f1f5f9' : '#111827', fontWeight: 600 }}
                                                    itemStyle={{ color: isDark ? '#cbd5e1' : '#374151' }}
                                                />
                                                <Legend wrapperStyle={{ fontSize: '11px', color: isDark ? '#cbd5e1' : '#1F2937' }} />
                                                <Area type="monotone" dataKey="IP" stroke={ipColor} strokeWidth={2.5} fill="url(#ipGradIndiv)" dot={{ r: 4, fill: ipColor, stroke: isDark ? '#1e293b' : '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                                <Area type="monotone" dataKey="IPK" stroke={ipkColor} strokeWidth={2.5} fill="url(#ipkGradIndiv)" dot={{ r: 4, fill: ipkColor, stroke: isDark ? '#1e293b' : '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <EmptyState msg="Data IP/IPK belum tersedia" />
                                )}
                            </div>

                            {/* Achievement Bar Chart */}
                            <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-4">
                                <h4 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-4">Akumulasi Riwayat</h4>
                                {sanitizedIndividualData.achievements.length > 0 ? (
                                    <>
                                        <div className="h-72 relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart 
                                                    data={sanitizedIndividualData.achievements} 
                                                    layout="vertical" 
                                                    margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: tickColorAlt, fontSize: 11 }} />
                                                    <YAxis type="category" dataKey="type" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 12, fontWeight: 600 }} width={90} />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', fontSize: '12px', padding: '10px', backgroundColor: isDark ? '#1e293b' : '#fff', color: isDark ? '#f1f5f9' : '#111827' }}
                                                        labelStyle={{ color: isDark ? '#f1f5f9' : '#111827', fontWeight: 600 }}
                                                        itemStyle={{ color: isDark ? '#cbd5e1' : '#374151' }}
                                                    />
                                                    <Bar dataKey="count" name="Jumlah" radius={[0, 6, 6, 0]} maxBarSize={32}>
                                                        {sanitizedIndividualData.achievements.map((entry, idx) => (
                                                            <Cell key={idx} fill={achievementColors[entry.type] || scoreColor} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex flex-wrap gap-3 mt-3 justify-center">
                                            {sanitizedIndividualData.achievements.map(a => (
                                                <div key={a.type} className="flex items-center gap-1.5">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: achievementColors[a.type] || scoreColor }} />
                                                    <span className="text-[11px] text-gray-700 dark:text-slate-300 font-medium">{a.type}: {a.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <EmptyState msg="Data prestasi/organisasi belum tersedia" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Empty state ─── */}
            {!isPending && !sanitizedIndividualData && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-12 flex items-center justify-center">
                    <div className="text-center space-y-2">
                        <Users className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto" />
                        <p className="text-gray-400 dark:text-slate-400 font-medium">
                            {!selectedBatch
                                ? 'Pilih angkatan terlebih dahulu'
                                : !selectedAwName
                                ? 'Pilih awardee untuk melihat data individual'
                                : 'Memuat...'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

function EmptyState({ msg }: { msg: string }) {
    return (
        <div className="h-72 flex items-center justify-center">
            <div className="text-center">
                <p className="text-gray-400 dark:text-slate-500 font-semibold text-sm">{msg}</p>
                <p className="text-gray-300 dark:text-slate-600 text-xs mt-1">Konfigurasi range di profil awardee</p>
            </div>
        </div>
    )
}
