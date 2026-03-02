'use client'

import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const pendidikanData = [
    { pekan: 'Pekan 1', nilai: 80 },
    { pekan: 'Pekan 2', nilai: 85 },
    { pekan: 'Pekan 3', nilai: 82 },
    { pekan: 'Pekan 4', nilai: 93 }
]

const ibadahData = [
    { hari: 'Senin', skor: 100 },
    { hari: 'Selasa', skor: 80 },
    { hari: 'Rabu', skor: 100 },
    { hari: 'Kamis', skor: 85 },
    { hari: 'Jumat', skor: 95 },
    { hari: 'Sabtu', skor: 100 },
    { hari: 'Minggu', skor: 100 },
]

export function AwardeePendidikanChart() {
    return (
        <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pendidikanData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="pekan" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                        itemStyle={{ color: '#15A4FA', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="nilai" name="Skor Akademik" stroke="#15A4FA" strokeWidth={4} dot={{ r: 5, fill: '#15A4FA', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

export function AwardeeIbadahChart() {
    return (
        <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ibadahData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorSkor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00529C" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#00529C" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="hari" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                        itemStyle={{ color: '#00529C', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="skor" name="Skor Ibadah" stroke="#00529C" strokeWidth={3} fillOpacity={1} fill="url(#colorSkor)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
