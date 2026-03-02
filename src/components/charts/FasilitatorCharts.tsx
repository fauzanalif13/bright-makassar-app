'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const mockData = [
    { name: 'Angkatan 1', capaian: 85 },
    { name: 'Angkatan 2', capaian: 78 },
    { name: 'Angkatan 3', capaian: 92 },
    { name: 'Angkatan 4', capaian: 64 },
    { name: 'Angkatan 5', capaian: 96 }
]

export function FasilitatorBarChart() {
    return (
        <div className="h-80 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip
                        cursor={{ fill: '#F3F4F6', opacity: 0.5 }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                        itemStyle={{ color: '#00529C', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="capaian" name="Rata-rata Skor Ibadah" fill="#00529C" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
