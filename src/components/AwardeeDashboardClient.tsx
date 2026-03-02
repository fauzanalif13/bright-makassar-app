'use client'

import { useState, useRef } from 'react'
import {
    LineChart, Line, BarChart, Bar, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { ChevronLeft, ChevronRight, ChevronDown, Megaphone, FileText, CheckCircle2, Calendar, TrendingUp, BookOpen, GraduationCap, Award, Users2, Briefcase } from 'lucide-react'
import type { IbadahMonthlyChartData } from '@/src/components/charts/AwardeeCharts'

// ─── Mock Data ───────────────────────────────────────────────────────

const ANNOUNCEMENTS = [
    { title: 'Pengisian Laporan Harian', desc: 'Mengingatkan kepada seluruh awardee untuk rutin mengisi form laporan ibadah harian.', tag: 'Info Umum', tagColor: 'text-[#00529C] bg-blue-50', by: 'Sistem', accent: '#15A4FA', icon: FileText },
    { title: 'Jadwal Pembinaan Rutin', desc: 'Pembinaan pekanan dilaksanakan hari Sabtu pukul 08:00 WITA. Dimohon hadir tepat waktu.', tag: 'Jadwal', tagColor: 'text-green-600 bg-green-50', by: 'Fasilitator', accent: '#10B981', icon: CheckCircle2 },
    { title: 'Pengumpulan Resume Buku', desc: 'Batas akhir pengumpulan resume buku bulan ini adalah tanggal 25. Segera kumpulkan via link Spreadsheet.', tag: 'Tenggat', tagColor: 'text-amber-600 bg-amber-50', by: 'Fasilitator', accent: '#F59E0B', icon: Calendar },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function generateTrendData(monthsBack: number) {
    const now = new Date()
    const data = []
    for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        data.push({
            bulan: `${MONTHS[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`,
            skor: Math.round(50 + Math.random() * 40),
        })
    }
    return data
}

const COMPARISON_CURRENT = [
    { aktivitas: "Jama'ah", current: 85, previous: 72 },
    { aktivitas: 'Qiyamul Lail', current: 45, previous: 38 },
    { aktivitas: 'Dzikir Pagi', current: 90, previous: 82 },
    { aktivitas: "Mendo'akan", current: 78, previous: 65 },
    { aktivitas: 'Shalat Dhuha', current: 60, previous: 55 },
    { aktivitas: 'Tilawah', current: 70, previous: 60 },
    { aktivitas: 'Shaum', current: 30, previous: 25 },
    { aktivitas: 'Berinfak', current: 55, previous: 40 },
]

const IP_IPK_DATA = [
    { semester: 'Sem 1', IP: 3.45, IPK: 3.45 },
    { semester: 'Sem 2', IP: 3.62, IPK: 3.54 },
    { semester: 'Sem 3', IP: 3.78, IPK: 3.62 },
    { semester: 'Sem 4', IP: 3.55, IPK: 3.60 },
    { semester: 'Sem 5', IP: 3.80, IPK: 3.64 },
    { semester: 'Sem 6', IP: 3.90, IPK: 3.68 },
]

const ACHIEVEMENT_DATA = [
    { name: 'Pembinaan', count: 12, fill: '#00529C' },
    { name: 'Prestasi', count: 5, fill: '#15A4FA' },
    { name: 'Organisasi', count: 3, fill: '#8B5CF6' },
    { name: 'Workshop', count: 8, fill: '#10B981' },
]

// ─── Types ───────────────────────────────────────────────────────────

type Props = {
    displayName: string
    spreadsheetConfigured: boolean
    ibadahChartData: IbadahMonthlyChartData[]
    ibadahSheetTarget: string
}

// ─── Component ───────────────────────────────────────────────────────

export default function AwardeeDashboardClient({
    displayName,
    spreadsheetConfigured,
    ibadahChartData,
    ibadahSheetTarget,
}: Props) {
    // Carousel state
    const [carouselIdx, setCarouselIdx] = useState(0)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Ibadah chart state
    const [selectedSheet, setSelectedSheet] = useState(ibadahSheetTarget)
    const [comparisonPeriod, setComparisonPeriod] = useState('1 Bulan Lalu')
    const [trendRange, setTrendRange] = useState<3 | 6 | 12>(6)

    const trendData = generateTrendData(trendRange)

    function scrollCarousel(dir: 'left' | 'right') {
        const next = dir === 'left' ? Math.max(0, carouselIdx - 1) : Math.min(ANNOUNCEMENTS.length - 1, carouselIdx + 1)
        setCarouselIdx(next)
        scrollRef.current?.children[next]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
    }

    return (
        <div className="space-y-6">
            {/* ─── Compact Welcome Banner ───────────────────────────────── */}
            <div className="bg-gradient-to-r from-[#00529C] to-[#15A4FA] rounded-2xl px-6 py-5 shadow-md text-white relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black">Halo, {displayName}!</h1>
                        <p className="text-blue-100 text-sm mt-1 max-w-lg">
                            Pertahankan skor ibadah dan pendidikanmu.
                            {!spreadsheetConfigured && <span className="text-amber-200 font-semibold"> ⚠️ Spreadsheet belum dikonfigurasi.</span>}
                        </p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-blue-100 text-xs font-medium bg-white/10 px-3 py-1.5 rounded-lg">
                        <Calendar className="w-3.5 h-3.5" />{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* ─── Announcements Carousel ────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center"><Megaphone className="w-4.5 h-4.5" /></div>
                        <h2 className="text-lg font-bold text-gray-900">Himbauan Terbaru</h2>
                    </div>
                    <div className="flex gap-1.5">
                        <button onClick={() => scrollCarousel('left')} disabled={carouselIdx === 0} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                        <button onClick={() => scrollCarousel('right')} disabled={carouselIdx === ANNOUNCEMENTS.length - 1} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-all"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
                <div ref={scrollRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1" style={{ scrollbarWidth: 'none' }}>
                    {ANNOUNCEMENTS.map((a, i) => {
                        const Icon = a.icon
                        return (
                            <div key={i} className="min-w-[280px] md:min-w-[340px] snap-start border border-gray-100 rounded-xl p-5 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all relative overflow-hidden flex-shrink-0">
                                <div className="absolute top-0 right-0 w-1 h-full" style={{ backgroundColor: a.accent }} />
                                <div className="flex gap-3">
                                    <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: a.accent }} />
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm mb-1">{a.title}</h3>
                                        <p className="text-gray-500 text-xs leading-relaxed mb-3">{a.desc}</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${a.tagColor}`}>{a.tag}</span>
                                            <span className="text-[10px] text-gray-400">Oleh: {a.by}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                {/* Dots */}
                <div className="flex justify-center gap-1.5 mt-3">
                    {ANNOUNCEMENTS.map((_, i) => (
                        <button key={i} onClick={() => { setCarouselIdx(i); scrollRef.current?.children[i]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' }) }} className={`w-2 h-2 rounded-full transition-all ${i === carouselIdx ? 'bg-[#00529C] w-5' : 'bg-gray-300'}`} />
                    ))}
                </div>
            </div>

            {/* ─── Grafik Ibadah Section ──────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#00529C]/10 text-[#00529C] flex items-center justify-center"><BookOpen className="w-4.5 h-4.5" /></div>
                        <div>
                            <h2 className="text-lg font-bold text-[#00529C]">Grafik Ibadah</h2>
                            <p className="text-xs text-gray-500">Capaian ibadah bulan ini</p>
                        </div>
                    </div>
                    {/* Sheet Selector */}
                    <div className="relative">
                        <select
                            value={selectedSheet}
                            onChange={(e) => setSelectedSheet(e.target.value)}
                            className="appearance-none pl-3 pr-8 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg text-[#00529C] focus:ring-2 focus:ring-[#15A4FA]/40 focus:border-[#15A4FA] cursor-pointer"
                        >
                            <option>Tahun ke-1</option>
                            <option>Tahun ke-2</option>
                            <option>Tahun ke-3</option>
                            <option>Tahun ke-4</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Comparison Chart */}
                    <div className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-700">Perbandingan Bulan Ini vs</h3>
                            <select
                                value={comparisonPeriod}
                                onChange={(e) => setComparisonPeriod(e.target.value)}
                                className="appearance-none text-[11px] font-semibold bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-gray-600 cursor-pointer"
                            >
                                <option>1 Bulan Lalu</option>
                                <option>2 Bulan Lalu</option>
                                <option>Tahun Lalu</option>
                            </select>
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={ibadahChartData.length > 0 ? ibadahChartData.map((d, i) => ({ ...d, previous: COMPARISON_CURRENT[i]?.previous ?? 0 })) : COMPARISON_CURRENT} margin={{ top: 10, right: 5, left: -25, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="aktivitas" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 9 }} angle={-20} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} domain={[0, 100]} />
                                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', fontSize: '12px', padding: '10px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar dataKey={ibadahChartData.length > 0 ? 'skor' : 'current'} name="Bulan Ini" fill="#00529C" radius={[4, 4, 0, 0]} maxBarSize={28} />
                                    <Bar dataKey="previous" name={comparisonPeriod} fill="#15A4FA" radius={[4, 4, 0, 0]} maxBarSize={28} opacity={0.6} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Right: Trend Line Chart */}
                    <div className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-700">Tren Skor Ibadah</h3>
                            <div className="flex gap-1">
                                {([3, 6, 12] as const).map(r => (
                                    <button key={r} onClick={() => setTrendRange(r)} className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${trendRange === r ? 'bg-[#00529C] text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                        {r} Bln
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 10, right: 5, left: -25, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00529C" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#00529C" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="bulan" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 10 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', fontSize: '12px', padding: '10px' }}
                                        formatter={(v: number | string | undefined) => [`${v ?? 0}%`, 'Skor Ibadah']}
                                    />
                                    <Area type="monotone" dataKey="skor" stroke="#00529C" strokeWidth={2.5} fill="url(#trendGrad)" dot={{ r: 3, fill: '#00529C', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Grafik Pendidikan Section ──────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2.5 mb-6">
                    <div className="w-9 h-9 rounded-lg bg-[#15A4FA]/10 text-[#15A4FA] flex items-center justify-center"><GraduationCap className="w-4.5 h-4.5" /></div>
                    <div>
                        <h2 className="text-lg font-bold text-[#00529C]">Grafik Pendidikan</h2>
                        <p className="text-xs text-gray-500">Tren akademik &amp; capaian riwayat</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chart 1: IP & IPK Trend */}
                    <div className="border border-gray-100 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Tren IP &amp; IPK per Semester</h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={IP_IPK_DATA} margin={{ top: 10, right: 5, left: -15, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="ipGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#15A4FA" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#15A4FA" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="ipkGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00529C" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#00529C" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="semester" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} domain={[0, 4]} />
                                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', fontSize: '12px', padding: '10px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Area type="monotone" dataKey="IP" stroke="#15A4FA" strokeWidth={2.5} fill="url(#ipGrad)" dot={{ r: 4, fill: '#15A4FA', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    <Area type="monotone" dataKey="IPK" stroke="#00529C" strokeWidth={2.5} fill="url(#ipkGrad)" dot={{ r: 4, fill: '#00529C', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart 2: All-Time Achievements */}
                    <div className="border border-gray-100 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Akumulasi Riwayat</h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={ACHIEVEMENT_DATA} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 12, fontWeight: 600 }} width={90} />
                                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', fontSize: '12px', padding: '10px' }} />
                                    <Bar dataKey="count" name="Jumlah" radius={[0, 6, 6, 0]} maxBarSize={32}>
                                        {ACHIEVEMENT_DATA.map((entry, index) => (
                                            <rect key={index} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 mt-3 justify-center">
                            {ACHIEVEMENT_DATA.map(a => (
                                <div key={a.name} className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.fill }} />
                                    <span className="text-[11px] text-gray-500 font-medium">{a.name}: {a.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
