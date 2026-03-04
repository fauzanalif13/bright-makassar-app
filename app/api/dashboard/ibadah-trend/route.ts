import { NextResponse } from 'next/server'
import { createClient } from '@/src/utils/supabase/server'
import { getBatchCellValues, getIbadahRerataPerActivity } from '@/src/lib/googleSheets'
import type { IbadahActivity } from '@/src/lib/googleSheets'
import { getFullTimeline, getCategoryCellRefs, getCellRef } from '@/src/lib/ibadahDefaults'

// ─── Constants ───────────────────────────────────────────────────────

const MONTH_IDS = [
    'januari', 'februari', 'maret', 'april', 'mei', 'juni',
    'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
]

const ACTIVITY_SHORT: Record<string, string> = {
    "Shalat Berjama'ah": "Jama'ah",
    "Membaca Al-Quran": "Tilawah",
    "Mendo'akan": "Mendo'akan",
}

const ACTIVITY_ORDER: IbadahActivity[] = [
    "Shalat Berjama'ah", "Qiyamul Lail", "Dzikir Pagi", "Mendo'akan",
    "Shalat Dhuha", "Membaca Al-Quran", "Shaum Sunnah", "Berinfak"
]

// ─── Helpers ─────────────────────────────────────────────────────────

function resolveAcademicYear(angkatan: number, calMonth: number, calYear: number): number {
    const baseYear = calMonth >= 7 ? calYear : calYear - 1
    return Math.max(1, Math.min(4, baseYear - angkatan + 1))
}

function resolveRerataCell(
    bulananConfig: Record<string, any>,
    tahunKe: number,
    monthId: string
): string {
    const yearConfig = bulananConfig?.[`tahun_${tahunKe}`] || {}
    const savedRef = yearConfig.months?.[monthId]
    if (savedRef && savedRef.trim()) {
        return savedRef.includes('!') ? savedRef.split('!')[1] : savedRef
    }
    return getCellRef(tahunKe, monthId)
}

// ─── Route Handler ───────────────────────────────────────────────────

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: userData, error: dbError } = await supabase
            .from('roles_pengguna')
            .select('spreadsheet_id, sheet_config, angkatan')
            .eq('email', user.email)
            .single()

        if (dbError || !userData?.spreadsheet_id) {
            return NextResponse.json({ error: 'Spreadsheet not configured' }, { status: 400 })
        }

        const config = (userData.sheet_config as Record<string, any>) || {}
        const ibadahConfig = config.ibadah || {}
        const bulananConfig = ibadahConfig?.bulanan || ibadahConfig || {}
        const spreadsheetId = userData.spreadsheet_id
        const angkatan = userData.angkatan ? parseInt(String(userData.angkatan)) : new Date().getFullYear()
        const now = new Date()
        const curMonth = now.getMonth() + 1
        const curYear = now.getFullYear()
        const prevMonth = curMonth === 1 ? 12 : curMonth - 1
        const prevYear = curMonth === 1 ? curYear - 1 : curYear

        // ─── 1. Ibadah Comparison (current vs previous month) ────────
        const curTahunKe = resolveAcademicYear(angkatan, curMonth, curYear)
        const prevTahunKe = resolveAcademicYear(angkatan, prevMonth, prevYear)
        const curMonthId = MONTH_IDS[curMonth - 1]
        const prevMonthId = MONTH_IDS[prevMonth - 1]

        const curRerataCell = resolveRerataCell(bulananConfig, curTahunKe, curMonthId)
        const prevRerataCell = resolveRerataCell(bulananConfig, prevTahunKe, prevMonthId)

        const curCategoryCells = curRerataCell ? getCategoryCellRefs(curRerataCell) : {}
        const prevCategoryCells = prevRerataCell ? getCategoryCellRefs(prevRerataCell) : {}

        const [currentAvg, prevAvg] = await Promise.all([
            Object.keys(curCategoryCells).length > 0
                ? getIbadahRerataPerActivity(spreadsheetId, `Tahun ke-${curTahunKe}`, curCategoryCells)
                : Promise.resolve({} as Record<string, number>),
            Object.keys(prevCategoryCells).length > 0
                ? getIbadahRerataPerActivity(spreadsheetId, `Tahun ke-${prevTahunKe}`, prevCategoryCells)
                : Promise.resolve({} as Record<string, number>),
        ])

        const ibadahComparison = ACTIVITY_ORDER.map(a => ({
            aktivitas: ACTIVITY_SHORT[a] || a,
            current: (currentAvg as any)[a] ?? 0,
            previous: (prevAvg as any)[a] ?? 0,
        }))

        // ─── 2. Ibadah Trend (48 months) ─────────────────────────────
        const timeline = getFullTimeline(angkatan)
        const rangesToFetch = timeline.map(t => {
            const yearConfig = bulananConfig?.[`tahun_${t.year}`] || {}
            const savedRef = yearConfig.months?.[t.monthId]
            const ref = (savedRef && savedRef.trim()) ? savedRef : t.cellRef
            return ref || ''
        })

        const validIndices: number[] = []
        const validRanges: string[] = []
        rangesToFetch.forEach((r, i) => {
            if (r) { validIndices.push(i); validRanges.push(r) }
        })

        const cellValues = validRanges.length > 0
            ? await getBatchCellValues(spreadsheetId, validRanges)
            : []

        const allTrendData = timeline.map((t, i) => {
            const validIdx = validIndices.indexOf(i)
            const rawVal = validIdx >= 0 ? (cellValues[validIdx] || '0') : '0'
            const hasRef = rangesToFetch[i] !== ''
            const score = hasRef ? (parseFloat(rawVal.replace(',', '.')) || 0) : 0
            return { bulan: t.displayLabel, skor: Math.round(score) }
        })

        return NextResponse.json({
            ibadahComparison,
            allTrendData,
            angkatan,
        })
    } catch (error: any) {
        console.error('[api/dashboard/ibadah-trend] Error:', error.message)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
