'use client'

import { useState, useCallback, useMemo } from 'react'
import {
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { ChevronDown } from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────

/** BRI-palette bar colors — distinct & accessible */
const COLOR_MONTH_A = '#00529C'     // Bank BRI dark blue
const COLOR_MONTH_B = '#F5A623'     // BRI gold/amber

/** Month labels (Indonesian, 1-indexed) */
const BULAN_OPTIONS = [
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
    { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' }, { value: 12, label: 'Desember' },
]

// ─── Types ───────────────────────────────────────────────────────────

type ComparisonItem = { aktivitas: string; bulanA: number; bulanB: number }

export type IbadahComparisonChartProps = {
    /** User's scholarship intake year */
    angkatan: number
    /** Initial comparison data (current month vs previous month, as percentages) */
    initialComparison: { aktivitas: string; current: number; previous: number }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Dynamic academic year options (same logic as Trendline chart) */
function getYearOptions(angkatan: number): { value: number; label: string }[] {
    return [1, 2, 3, 4].map(yr => ({
        value: yr,
        label: `Tahun ke-${yr}`,
    }))
}

/** Get previous month/year */
function getPreviousMonth(month: number, year: number) {
    return month === 1
        ? { month: 12, year: year - 1 }
        : { month: month - 1, year }
}

/** Convert calendar month + academic year selection → calendar year */
function toCalendarYear(angkatan: number, tahunKe: number, calMonth: number): number {
    const baseYear = angkatan + tahunKe - 1
    return calMonth >= 7 ? baseYear : baseYear + 1
}

/** Determine academic year from calendar month/year */
function toAcademicYear(angkatan: number, calMonth: number, calYear: number): number {
    const baseYear = calMonth >= 7 ? calYear : calYear - 1
    return Math.max(1, Math.min(4, baseYear - angkatan + 1))
}

// ─── Main Component ─────────────────────────────────────────────────

export default function IbadahComparisonChart({
    angkatan,
    initialComparison,
}: IbadahComparisonChartProps) {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const prev = getPreviousMonth(currentMonth, currentYear)

    // ─── State: Month A (defaults to current month) ──────────────────
    const [monthA, setMonthA] = useState(currentMonth)
    const [yearA, setYearA] = useState(currentYear)

    // ─── State: Month B (defaults to previous month) ─────────────────
    const [monthB, setMonthB] = useState(prev.month)
    const [yearB, setYearB] = useState(prev.year)

    const [loading, setLoading] = useState(false)
    const [chartData, setChartData] = useState<ComparisonItem[]>(
        initialComparison.map(d => ({
            aktivitas: d.aktivitas,
            bulanA: d.current,
            bulanB: d.previous,
        }))
    )

    // ─── Derived: Academic year for each side ────────────────────────
    const academicYearA = useMemo(() => toAcademicYear(angkatan, monthA, yearA), [angkatan, monthA, yearA])
    const academicYearB = useMemo(() => toAcademicYear(angkatan, monthB, yearB), [angkatan, monthB, yearB])
    const yearOptions = useMemo(() => getYearOptions(angkatan), [angkatan])

    // ─── Fetch comparison data via API ───────────────────────────────
    const fetchComparison = useCallback(async (
        mA: number, yA: number, tA: number,
        mB: number, yB: number, tB: number
    ) => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                monthA: String(mA),
                yearA: String(yA),
                tahunKeA: String(tA), // <-- Tambahan baru
                monthB: String(mB),
                yearB: String(yB),
                tahunKeB: String(tB), // <-- Tambahan baru
            })
            const res = await fetch(`/api/ibadah-comparison?${params}`)
            if (!res.ok) {
                console.error('[ComparisonChart] API error:', res.status, await res.text())
                return
            }
            const data = await res.json()
            console.log('[ComparisonChart] API response:', data)

            if (data.totalsA && data.totalsB) {
                setChartData(data.totalsA.map((a: any, i: number) => ({
                    aktivitas: a.aktivitas,
                    bulanA: a.total,
                    bulanB: data.totalsB[i]?.total ?? 0,
                })))
            }
        } catch (err) {
            console.error('[ComparisonChart] Fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    // ─── Change handlers ─────────────────────────────────────────────
    const handleMonthAChange = useCallback((month: number) => {
        const newYear = toCalendarYear(angkatan, academicYearA, month)
        setMonthA(month)
        setYearA(newYear)
        // Kirim academicYearA dan academicYearB
        fetchComparison(month, newYear, academicYearA, monthB, yearB, academicYearB)
    }, [angkatan, academicYearA, monthB, yearB, academicYearB, fetchComparison])

    const handleYearAChange = useCallback((tahunKe: number) => {
        const newYear = toCalendarYear(angkatan, tahunKe, monthA)
        setYearA(newYear)
        // Kirim tahunKe yang baru dipilih
        fetchComparison(monthA, newYear, tahunKe, monthB, yearB, academicYearB)
    }, [angkatan, monthA, monthB, yearB, academicYearB, fetchComparison])

    const handleMonthBChange = useCallback((month: number) => {
        const newYear = toCalendarYear(angkatan, academicYearB, month)
        setMonthB(month)
        setYearB(newYear)
        // Kirim academicYearA dan academicYearB
        fetchComparison(monthA, yearA, academicYearA, month, newYear, academicYearB)
    }, [angkatan, academicYearB, monthA, yearA, academicYearA, fetchComparison])

    const handleYearBChange = useCallback((tahunKe: number) => {
        const newYear = toCalendarYear(angkatan, tahunKe, monthB)
        setYearB(newYear)
        // Kirim tahunKe yang baru dipilih
        fetchComparison(monthA, yearA, academicYearA, monthB, newYear, tahunKe)
    }, [angkatan, monthB, monthA, yearA, academicYearA, fetchComparison])

    // ─── Labels ──────────────────────────────────────────────────────
    const labelA = `${BULAN_OPTIONS[monthA - 1]?.label} ${yearA}`
    const labelB = `${BULAN_OPTIONS[monthB - 1]?.label} ${yearB}`

    // ─── Render ──────────────────────────────────────────────────────
    return (
        <div className="border border-gray-100 rounded-xl p-3 md:p-4">
            {/* Inline header with double dropdowns */}
            <div className="flex flex-wrap items-center gap-1 mb-5">
                <h3 className="text-[13px] font-semibold text-gray-800 mr-1 whitespace-nowrap">Perbandingan:</h3>

                {/* Month A selectors */}
                <CompactSelect
                    value={monthA}
                    onChange={(v) => handleMonthAChange(v)}
                    options={BULAN_OPTIONS}
                />
                <CompactSelect
                    value={academicYearA}
                    onChange={(v) => handleYearAChange(v)}
                    options={yearOptions}
                />

                <span className="text-[13px] font-semibold text-gray-500 mx-1 whitespace-nowrap">vs</span>

                {/* Month B selectors */}
                <CompactSelect
                    value={monthB}
                    onChange={(v) => handleMonthBChange(v)}
                    options={BULAN_OPTIONS}
                />
                <CompactSelect
                    value={academicYearB}
                    onChange={(v) => handleYearBChange(v)}
                    options={yearOptions}
                />
            </div>

            {/* Chart */}
            {loading ? (
                <LoadingSpinner />
            ) : chartData.length > 0 ? (
                <div className="h-[370px] w-full overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 30 }} style={{ outline: 'none' }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis
                                dataKey="aktivitas"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#1F2937', fontSize: 9 }}
                                angle={-30}
                                dy={15}
                                textAnchor="end"
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#374151', fontSize: 11 }}
                                domain={[0, 100]}
                            />
                            <Tooltip
                                cursor={{ fill: '#f3f4f6' }}
                                content={<CustomTooltip />}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '16px', color: '#1F2937' }} />
                            <Bar
                                dataKey="bulanA"
                                name={labelA}
                                fill={COLOR_MONTH_A}
                                radius={[4, 4, 0, 0]}
                                maxBarSize={24}
                            />
                            <Bar
                                dataKey="bulanB"
                                name={labelB}
                                fill={COLOR_MONTH_B}
                                radius={[4, 4, 0, 0]}
                                maxBarSize={24}
                                opacity={0.75}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-80 flex items-center justify-center">
                    <p className="text-gray-500 text-sm font-medium italic text-center">
                        Belum ada data perbandingan ibadah.
                    </p>
                </div>
            )}
        </div>
    )
}

// ─── Sub-Components ─────────────────────────────────────────────────

/** Custom Tooltip to force one-line layout per month */
function CustomTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 rounded-xl shadow-[0_4px_12px_rgb(0,0,0,0.1)] text-xs font-medium border border-gray-100">
                <p className="text-[#1f2937] font-bold mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-1.5 mb-1.5 last:mb-0">
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-gray-600 truncate max-w-[120px]">{entry.name}:</span>
                        <span className="text-gray-900 font-bold ml-auto">{entry.value ?? 0}%</span>
                    </div>
                ))}
            </div>
        )
    }
    return null
}

/** Compact inline dropdown */
function CompactSelect({ value, onChange, options }: {
    value: number
    onChange: (value: number) => void
    options: { value: number; label: string }[]
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="appearance-none pl-2 pr-6 py-1 text-[12px] font-semibold bg-gray-50 border border-gray-200 rounded-md text-[#00529C] focus:ring-2 focus:ring-[#15A4FA]/40 cursor-pointer"
            >
                {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>
    )
}

/** Loading spinner */
function LoadingSpinner() {
    return (
        <div className="h-80 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-[#00529C] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-500">Memuat data...</p>
            </div>
        </div>
    )
}
