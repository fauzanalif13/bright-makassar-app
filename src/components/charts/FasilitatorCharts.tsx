'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────

export type FasilitatorChartData = {
    name: string;
    capaian: number;
}

// ─── Component ───────────────────────────────────────────────────────

export function FasilitatorBarChart({ data }: { data?: FasilitatorChartData[] }) {
    const chartData = data && data.length > 0 ? data : []

    if (chartData.length === 0) {
        return (
            <div className="h-80 w-full mt-4 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-400 font-semibold text-sm">Belum ada data ibadah awardee</p>
                    <p className="text-gray-300 text-xs mt-1">Data akan muncul ketika awardee mulai mengirim laporan</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-80 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 10 }} dy={10} angle={-15} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip
                        cursor={{ fill: '#F3F4F6', opacity: 0.5 }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                        itemStyle={{ color: '#00529C', fontWeight: 'bold' }}
                        formatter={(value: number | string | undefined) => [`${value ?? 0}%`, 'Rata-rata']}
                    />
                    <Bar dataKey="capaian" name="Rata-rata Skor Ibadah" fill="#00529C" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
