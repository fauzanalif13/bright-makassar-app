'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from '@/src/components/ThemeProvider'

// ─── Types ───────────────────────────────────────────────────────────

export type FasilitatorChartData = {
    name: string;
    capaian: number;
}

// ─── Component ───────────────────────────────────────────────────────

export function FasilitatorBarChart({ data }: { data?: FasilitatorChartData[] }) {
    const chartData = data && data.length > 0 ? data : []
    const { isDark } = useTheme()

    const tickColor = isDark ? '#94a3b8' : '#6B7280'
    const gridColor = isDark ? '#334155' : '#E5E7EB'
    const barColor = isDark ? '#60b5ff' : '#00529C'
    const cursorColor = isDark ? '#334155' : '#F3F4F6'

    if (chartData.length === 0) {
        return (
            <div className="h-80 w-full mt-4 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-400 dark:text-slate-500 font-semibold text-sm">Belum ada data ibadah awardee</p>
                    <p className="text-gray-300 dark:text-slate-600 text-xs mt-1">Data akan muncul ketika awardee mulai mengirim laporan</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-80 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 10 }} dy={10} angle={-15} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip
                        cursor={{ fill: cursorColor, opacity: 0.5 }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px', backgroundColor: isDark ? '#1e293b' : '#fff', color: isDark ? '#f1f5f9' : '#111827' }}
                        labelStyle={{ color: isDark ? '#f1f5f9' : '#111827', fontWeight: 600 }}
                        itemStyle={{ color: barColor, fontWeight: 'bold' }}
                        formatter={(value: number | string | undefined) => [`${value ?? 0}%`, 'Rata-rata']}
                    />
                    <Bar dataKey="capaian" name="Rata-rata Skor Ibadah" fill={barColor} radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
