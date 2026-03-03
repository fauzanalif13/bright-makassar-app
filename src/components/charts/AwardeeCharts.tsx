'use client'

import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useTheme } from '@/src/components/ThemeProvider'

// ─── Types ───────────────────────────────────────────────────────────

export type PendidikanChartData = {
    pekan: string;
    nilai: number;
}

export type IbadahDailyChartData = {
    day: number;
    'Shalat Berjamaah': number;
    'Qiyamul Lail': number;
    'Dzikir Pagi': number;
    "Mendo'akan": number;
    'Shalat Dhuha': number;
    'Membaca Al-Quran': number;
    'Shaum Sunnah': number;
    'Berinfak': number;
}

export type IbadahMonthlyChartData = {
    aktivitas: string;
    skor: number;
}

// ─── Fallback data ───────────────────────────────────────────────────

const defaultPendidikanData: PendidikanChartData[] = [
    { pekan: 'Pekan 1', nilai: 0 },
    { pekan: 'Pekan 2', nilai: 0 },
    { pekan: 'Pekan 3', nilai: 0 },
    { pekan: 'Pekan 4', nilai: 0 },
]

// ─── Color palette for daily chart lines ──────────────────────────────

const ACTIVITY_COLORS_LIGHT: Record<string, string> = {
    'Shalat Berjamaah': '#00529C',
    'Qiyamul Lail': '#15A4FA',
    'Dzikir Pagi': '#F59E0B',
    "Mendo'akan": '#10B981',
    'Shalat Dhuha': '#8B5CF6',
    'Membaca Al-Quran': '#EF4444',
    'Shaum Sunnah': '#EC4899',
    'Berinfak': '#06B6D4',
}

const ACTIVITY_COLORS_DARK: Record<string, string> = {
    'Shalat Berjamaah': '#60b5ff',
    'Qiyamul Lail': '#5cc8ff',
    'Dzikir Pagi': '#fbbf24',
    "Mendo'akan": '#34d399',
    'Shalat Dhuha': '#a78bfa',
    'Membaca Al-Quran': '#f87171',
    'Shaum Sunnah': '#f472b6',
    'Berinfak': '#22d3ee',
}

// ─── Components ──────────────────────────────────────────────────────

export function AwardeePendidikanChart({ data }: { data?: PendidikanChartData[] }) {
    const chartData = data && data.length > 0 ? data : defaultPendidikanData
    const { isDark } = useTheme()

    const tickColor = isDark ? '#94a3b8' : '#6B7280'
    const gridColor = isDark ? '#334155' : '#E5E7EB'
    const lineColor = isDark ? '#5cc8ff' : '#15A4FA'

    return (
        <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis dataKey="pekan" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px', backgroundColor: isDark ? '#1e293b' : '#fff', color: isDark ? '#f1f5f9' : '#111827' }}
                        labelStyle={{ color: isDark ? '#f1f5f9' : '#111827', fontWeight: 600 }}
                        itemStyle={{ color: lineColor, fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="nilai" name="Skor Akademik" stroke={lineColor} strokeWidth={4} dot={{ r: 5, fill: lineColor, strokeWidth: 2, stroke: isDark ? '#1e293b' : '#fff' }} activeDot={{ r: 7 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

/**
 * Daily line chart: tracks 8 activities over the days of the current month.
 */
export function AwardeeIbadahDailyChart({ data }: { data?: IbadahDailyChartData[] }) {
    const chartData = data && data.length > 0 ? data : []
    const { isDark } = useTheme()

    const tickColor = isDark ? '#94a3b8' : '#6B7280'
    const gridColor = isDark ? '#334155' : '#E5E7EB'
    const labelColor = isDark ? '#64748b' : '#9CA3AF'
    const activityColors = isDark ? ACTIVITY_COLORS_DARK : ACTIVITY_COLORS_LIGHT

    if (chartData.length === 0) {
        return (
            <div className="h-80 w-full mt-4 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-400 dark:text-slate-500 font-semibold text-sm">Belum ada data ibadah harian bulan ini</p>
                    <p className="text-gray-300 dark:text-slate-600 text-xs mt-1">Mulai isi laporan ibadah harian untuk melihat grafik</p>
                </div>
            </div>
        )
    }

    const activityKeys = Object.keys(activityColors)

    return (
        <div className="h-80 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: tickColor, fontSize: 11 }}
                        dy={10}
                        label={{ value: 'Tanggal', position: 'insideBottomRight', offset: -5, style: { fill: labelColor, fontSize: 11 } }}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px', fontSize: '12px', backgroundColor: isDark ? '#1e293b' : '#fff', color: isDark ? '#f1f5f9' : '#111827' }}
                        labelStyle={{ color: isDark ? '#f1f5f9' : '#111827', fontWeight: 600 }}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: '11px', paddingTop: '12px', color: isDark ? '#cbd5e1' : undefined }}
                        iconType="circle"
                        iconSize={8}
                    />
                    {activityKeys.map((key) => (
                        <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            name={key}
                            stroke={activityColors[key]}
                            strokeWidth={2}
                            dot={{ r: 2 }}
                            activeDot={{ r: 4 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

/**
 * Monthly bar chart: shows the average (Rerata) per activity.
 */
export function AwardeeIbadahMonthlyChart({ data }: { data?: IbadahMonthlyChartData[] }) {
    const chartData = data && data.length > 0 ? data : []
    const { isDark } = useTheme()

    const tickColor = isDark ? '#94a3b8' : '#6B7280'
    const gridColor = isDark ? '#334155' : '#E5E7EB'
    const barColor = isDark ? '#60b5ff' : '#00529C'

    if (chartData.length === 0) {
        return (
            <div className="h-72 w-full mt-4 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-400 dark:text-slate-500 font-semibold text-sm">Belum ada data rerata bulan ini</p>
                    <p className="text-gray-300 dark:text-slate-600 text-xs mt-1">Data akan muncul setelah mengisi laporan ibadah</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis dataKey="aktivitas" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 9 }} dy={10} angle={-20} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px', backgroundColor: isDark ? '#1e293b' : '#fff', color: isDark ? '#f1f5f9' : '#111827' }}
                        labelStyle={{ color: isDark ? '#f1f5f9' : '#111827', fontWeight: 600 }}
                        itemStyle={{ color: barColor, fontWeight: 'bold' }}
                        formatter={(value: number | string | undefined) => [`${value ?? 0}%`, 'Capaian']}
                    />
                    <Bar dataKey="skor" name="Rerata" fill={barColor} radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
