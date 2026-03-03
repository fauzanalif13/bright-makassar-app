import { createClient } from '@/src/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getBatchCellValues, getIbadahRerataPerActivity, getSheetData, countTableRows } from '@/src/lib/googleSheets'
import type { IbadahActivity } from '@/src/lib/googleSheets'
import { getFullTimeline, getCategoryCellRefs } from '@/src/lib/ibadahDefaults'
import AwardeeDashboardClient from '@/src/components/AwardeeDashboardClient'
import type { IbadahComparisonItem, IbadahTrendItem, IpIpkItem, AchievementItem } from '@/src/components/AwardeeDashboardClient'

interface SheetConfig {
    ibadah_sheet?: string
    ibadah_sheet_name?: string
    rerata_range?: string
    ip_ipk_range?: string
    pembinaan_range?: string
    prestasi_range?: string
    organisasi_range?: string
    workshop_range?: string
    ibadah?: Record<string, any>
}

const ACTIVITY_SHORT: Record<string, string> = {
    "Shalat Berjama'ah": "Jama'ah",
    "Membaca Al-Quran": "Tilawah",
    "Mendo'akan": "Mendo'akan",
}

const ACTIVITY_ORDER: IbadahActivity[] = [
    "Shalat Berjama'ah", "Qiyamul Lail", "Dzikir Pagi", "Mendo'akan",
    "Shalat Dhuha", "Membaca Al-Quran", "Shaum Sunnah", "Berinfak"
]

export default async function AwardeeDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: userData, error: userError } = await supabase
        .from('roles_pengguna')
        .select('role, name, spreadsheet_id, sheet_config, angkatan')
        .eq('email', user.email)
        .single()

    if (userError || !userData?.role || !['awardee', 'admin', 'fasilitator'].includes(userData.role)) {
        console.error('User access error:', userError?.message || 'Role unauthorized')
        return <div className="min-h-[60vh] flex items-center justify-center bg-white rounded-3xl text-red-600 font-bold p-10 border border-red-100">Akses ditolak.</div>
    }

    const displayName = userData?.name || user.email?.split('@')[0] || 'Awardee'
    const config = (userData?.sheet_config as SheetConfig) || {}
    const ibadahConfig = (config.ibadah as any)
    // Read from new split structure, fallback to old flat structure for backward compat
    const bulananConfig = ibadahConfig?.bulanan || ibadahConfig || {}
    const harianConfig = ibadahConfig?.harian || {}
    const spreadsheetId = userData?.spreadsheet_id || ''
    const angkatan = userData?.angkatan ? parseInt(String(userData.angkatan)) : new Date().getFullYear()

    let ibadahComparison: IbadahComparisonItem[] = []
    let allTrendData: IbadahTrendItem[] = []
    let ipIpkData: IpIpkItem[] = []
    let achievementData: AchievementItem[] = []

    if (spreadsheetId) {
        const now = new Date()
        const curMonth = now.getMonth() + 1
        const curYear = now.getFullYear()
        const prevMonth = curMonth === 1 ? 12 : curMonth - 1
        const prevYear = curMonth === 1 ? curYear - 1 : curYear

        // ─── Helper: Resolve academic year (tahunKe) from calendar month/year ──
        function resolveAcademicYear(calMonth: number, calYear: number): number {
            const baseYear = calMonth >= 7 ? calYear : calYear - 1
            return Math.max(1, Math.min(4, baseYear - angkatan + 1))
        }

        const MONTH_IDS = [
            'januari', 'februari', 'maret', 'april', 'mei', 'juni',
            'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
        ]

        // ─── Helper: Resolve Rerata cell from config or defaults ──
        function resolveRerataCell(tahunKe: number, monthId: string): string {
            const yearConfig = bulananConfig?.[`tahun_${tahunKe}`] || {}
            const savedRef = yearConfig.months?.[monthId]
            if (savedRef && savedRef.trim()) {
                const cellOnly = savedRef.includes('!') ? savedRef.split('!')[1] : savedRef
                return cellOnly
            }
            // Fallback to global defaults
            const { getCellRef } = require('@/src/lib/ibadahDefaults')
            return getCellRef(tahunKe, monthId)
        }

        console.log('[AwardeeDashboard] Config:', {
            spreadsheetId: spreadsheetId.slice(0, 8) + '...',
            angkatan,
            hasBulananConfig: !!Object.keys(bulananConfig).length,
            curMonth, curYear,
        })

        // ─── 1. Ibadah Comparison (current vs previous month) ────────
        try {
            const curTahunKe = resolveAcademicYear(curMonth, curYear)
            const prevTahunKe = resolveAcademicYear(prevMonth, prevYear)
            const curMonthId = MONTH_IDS[curMonth - 1]
            const prevMonthId = MONTH_IDS[prevMonth - 1]

            const curRerataCell = resolveRerataCell(curTahunKe, curMonthId)
            const prevRerataCell = resolveRerataCell(prevTahunKe, prevMonthId)

            console.log('[AwardeeDashboard] Comparison cell refs:', {
                current: { tahunKe: curTahunKe, monthId: curMonthId, cell: curRerataCell },
                previous: { tahunKe: prevTahunKe, monthId: prevMonthId, cell: prevRerataCell },
            })

            const curCategoryCells = curRerataCell ? getCategoryCellRefs(curRerataCell) : {}
            const prevCategoryCells = prevRerataCell ? getCategoryCellRefs(prevRerataCell) : {}

            console.log('[AwardeeDashboard] Category cells current:', curCategoryCells)
            console.log('[AwardeeDashboard] Category cells previous:', prevCategoryCells)

            const [currentAvg, prevAvg] = await Promise.all([
                Object.keys(curCategoryCells).length > 0
                    ? getIbadahRerataPerActivity(spreadsheetId, `Tahun ke-${curTahunKe}`, curCategoryCells)
                    : Promise.resolve({} as Record<string, number>),
                Object.keys(prevCategoryCells).length > 0
                    ? getIbadahRerataPerActivity(spreadsheetId, `Tahun ke-${prevTahunKe}`, prevCategoryCells)
                    : Promise.resolve({} as Record<string, number>),
            ])

            console.log('[AwardeeDashboard] Comparison data current:', currentAvg)
            console.log('[AwardeeDashboard] Comparison data previous:', prevAvg)

            ibadahComparison = ACTIVITY_ORDER.map(a => ({
                aktivitas: ACTIVITY_SHORT[a] || a,
                current: currentAvg[a] ?? 0,
                previous: prevAvg[a] ?? 0,
            }))
        } catch (e) { console.error('[AwardeeDashboard] Ibadah comparison fetch error:', e) }

        // ─── 2. Ibadah Trend — Fetch ALL 48 months across 4 years ────
        try {
            const timeline = getFullTimeline(angkatan)

            // Build ranges: use saved config cell refs, or defaults from timeline
            const rangesToFetch: string[] = timeline.map(t => {
                const yearConfig = bulananConfig?.[`tahun_${t.year}`] || {}
                const savedRef = yearConfig.months?.[t.monthId]
                // Use saved ref if it exists and is non-empty, otherwise use the default
                const ref = (savedRef && savedRef.trim()) ? savedRef : t.cellRef
                return ref || '' // empty string if no mapping at all
            })

            // Filter out empty ranges and track their indices
            const validIndices: number[] = []
            const validRanges: string[] = []
            rangesToFetch.forEach((r, i) => {
                if (r) {
                    validIndices.push(i)
                    validRanges.push(r)
                }
            })

            const cellValues = validRanges.length > 0
                ? await getBatchCellValues(spreadsheetId, validRanges)
                : []

            allTrendData = timeline.map((t, i) => {
                const validIdx = validIndices.indexOf(i)
                const rawVal = validIdx >= 0 ? (cellValues[validIdx] || '0') : '0'
                const hasRef = rangesToFetch[i] !== ''
                const score = hasRef ? (parseFloat(rawVal.replace(',', '.')) || 0) : 0
                return { bulan: t.displayLabel, skor: Math.round(score) }
            })
        } catch (e) { console.error('Ibadah trend fetch error:', e) }

        // ─── 3. IP/IPK Data ─────────────────────────────────────────
        if (config.ip_ipk_range) {
            try {
                const rows = await getSheetData(spreadsheetId, config.ip_ipk_range)
                if (rows.length > 0) {
                    const ipRow = rows[0] || []
                    let cumulativeIp = 0
                    let ipCount = 0
                    for (let s = 0; s < 8; s++) {
                        const rawIp = ipRow[s] || ''
                        const ip = parseFloat(String(rawIp).replace(',', '.')) || 0
                        let ipk = 0
                        if (ip > 0) {
                            cumulativeIp += ip
                            ipCount++
                            ipk = Number((cumulativeIp / ipCount).toFixed(2))
                        }
                        ipIpkData.push({ semester: `Sem ${s + 1}`, IP: ip, IPK: ipk })
                    }
                }
            } catch (e) { console.error('IP/IPK fetch error:', e) }
        }

        // ─── 4. Achievement Counts ──────────────────────────────────
        // Uses dynamic anchor-based counting (primary) with static range fallback.
        // This ensures counts stay in sync even when rows are inserted via forms.
        try {
            const resumeSheet = (config as any).resume_sheet || 'Resume'

            async function countRowsFallback(range: string | undefined): Promise<number> {
                if (!range) return 0
                try {
                    const rows = await getSheetData(spreadsheetId, range)
                    return rows.filter(r => r[0]?.trim()).length
                } catch { return 0 }
            }

            // Anchor texts matching the table headers in the Resume sheet
            // skipRows: how many rows after anchor to skip (description + header)
            const ANCHOR_MAP: { name: string; anchor: string; skipRows: number; fallbackRange?: string }[] = [
                { name: 'Pembinaan', anchor: 'Pembinaan S/H Skills', skipRows: 2, fallbackRange: config.pembinaan_range },
                { name: 'Prestasi', anchor: 'Riwayat Prestasi', skipRows: 2, fallbackRange: config.prestasi_range },
                { name: 'Organisasi', anchor: 'Riwayat Organisasi', skipRows: 2, fallbackRange: config.organisasi_range },
                { name: 'Workshop', anchor: 'Riwayat Workshop / Seminar', skipRows: 2, fallbackRange: config.workshop_range },
            ]

            const counts = await Promise.all(
                ANCHOR_MAP.map(async ({ anchor, skipRows, fallbackRange }) => {
                    // Try dynamic anchor-based count first
                    const dynamicCount = await countTableRows(spreadsheetId, resumeSheet, anchor, skipRows)
                    if (dynamicCount > 0) return dynamicCount
                    // Fallback to static range if anchor not found or returned 0
                    return countRowsFallback(fallbackRange)
                })
            )

            const [pembinaan, prestasi, organisasi, workshop] = counts

            if (pembinaan > 0 || prestasi > 0 || organisasi > 0 || workshop > 0) {
                achievementData = [
                    { name: 'Pembinaan', count: pembinaan },
                    { name: 'Prestasi', count: prestasi },
                    { name: 'Organisasi', count: organisasi },
                    { name: 'Workshop', count: workshop },
                ]
            }
        } catch (e) { console.error('Achievement fetch error:', e) }
    }

    return (
        <AwardeeDashboardClient
            displayName={displayName}
            spreadsheetConfigured={!!spreadsheetId}
            ibadahComparison={ibadahComparison}
            allTrendData={allTrendData}
            ipIpkData={ipIpkData}
            achievementData={achievementData}
            angkatan={angkatan}
        />
    )
}