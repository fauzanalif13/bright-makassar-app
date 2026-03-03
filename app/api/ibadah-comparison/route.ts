import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/src/utils/supabase/server'
import { getIbadahRerataPerActivity, IBADAH_ACTIVITIES } from '@/src/lib/googleSheets'
import type { IbadahActivity } from '@/src/lib/googleSheets'
import { getCellRef, getCategoryCellRefs, CATEGORY_LABELS } from '@/src/lib/ibadahDefaults'

// ─── Constants ───────────────────────────────────────────────────────

/** Short display names for chart X-axis */
const ACTIVITY_SHORT: Record<string, string> = {
    "Shalat Berjama'ah": "Jama'ah",
    "Membaca Al-Quran": "Tilawah",
    "Mendo'akan": "Mendo'akan",
}

const ACTIVITY_ORDER: IbadahActivity[] = [
    "Shalat Berjama'ah", "Qiyamul Lail", "Dzikir Pagi", "Mendo'akan",
    "Shalat Dhuha", "Membaca Al-Quran", "Shaum Sunnah", "Berinfak"
]

// ─── Helper: Map calendar month → academic month ID ──────────────────

const MONTH_IDS = [
    'januari', 'februari', 'maret', 'april', 'mei', 'juni',
    'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
]

// ─── Helper: Parse & validate query params ───────────────────────────

function parseParams(url: URL) {
    const monthA = parseInt(url.searchParams.get('monthA') || '')
    const yearA = parseInt(url.searchParams.get('yearA') || '')
    const tahunKeA = parseInt(url.searchParams.get('tahunKeA') || '')
    const monthB = parseInt(url.searchParams.get('monthB') || '')
    const yearB = parseInt(url.searchParams.get('yearB') || '')
    const tahunKeB = parseInt(url.searchParams.get('tahunKeB') || '')

    if ([monthA, yearA, tahunKeA, monthB, yearB, tahunKeB].some(v => isNaN(v))) return null
    return { monthA, yearA, tahunKeA, monthB, yearB, tahunKeB }
}

// ─── Helper: Resolve per-category cells with default + override ──────

/**
 * 1. Compute DEFAULT cells from getCategoryCellRefs(rerataCell)
 * 2. Check if user has custom overrides in DB config
 * 3. Merge: user override wins, else default
 */
function resolveCategoryCells(
    config: Record<string, any>,
    tahunKe: number,
    monthId: string
): Record<string, string> {
    // Step 1: Get the Rerata cell for this tahunKe + month
    const rerataCell = resolveRerataCell(config, tahunKe, monthId)
    if (!rerataCell) {
        console.warn(`[resolveCategoryCells] No Rerata cell for tahun_${tahunKe}/${monthId}`)
        return {}
    }

    // Step 2: Compute default cells from Rerata (e.g. AM13 → AL13..AL20)
    const defaults = getCategoryCellRefs(rerataCell)
    console.log(`[resolveCategoryCells] Defaults from Rerata "${rerataCell}":`, defaults)

    // Step 3: Check for user overrides in DB config
    const ibadahConfig = config?.ibadah || {}
    const bulananConfig = ibadahConfig?.bulanan || ibadahConfig || {}
    const yearConfig = bulananConfig?.[`tahun_${tahunKe}`] || {}
    const userCategoryOverrides = yearConfig?.category_cells?.[monthId] || {}

    // Step 4: Merge — user override wins
    const merged: Record<string, string> = { ...defaults }
    for (const cat of CATEGORY_LABELS) {
        if (userCategoryOverrides[cat] && userCategoryOverrides[cat].trim()) {
            merged[cat] = userCategoryOverrides[cat]
            console.log(`[resolveCategoryCells] Override for "${cat}": ${userCategoryOverrides[cat]}`)
        }
    }

    return merged
}

/** Resolve the Rerata cell reference (AM column) from config or defaults */
function resolveRerataCell(
    config: Record<string, any>,
    tahunKe: number,
    monthId: string
): string {
    const ibadahConfig = config?.ibadah || {}
    const bulananConfig = ibadahConfig?.bulanan || ibadahConfig || {}
    const yearConfig = bulananConfig?.[`tahun_${tahunKe}`]?.months?.[monthId]

    if (yearConfig && yearConfig.trim()) {
        const cellOnly = yearConfig.includes('!') ? yearConfig.split('!')[1] : yearConfig
        return cellOnly
    }

    return getCellRef(tahunKe, monthId)
}

// ─── Route Handler ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        // 1. Auth check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Get user data from Supabase
        const { data: userData, error: dbError } = await supabase
            .from('roles_pengguna')
            .select('spreadsheet_id, sheet_config, angkatan')
            .eq('email', user.email)
            .single()

        if (dbError) {
            console.error('[ibadah-comparison] DB error:', dbError.message)
            return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
        if (!userData?.spreadsheet_id) {
            console.warn('[ibadah-comparison] No spreadsheet_id configured')
            return NextResponse.json({ error: 'Spreadsheet not configured' }, { status: 400 })
        }

        // 3. Parse params (includes tahunKeA and tahunKeB)
        const params = parseParams(new URL(request.url))
        if (!params) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
        }

        const { monthA, yearA, tahunKeA, monthB, yearB, tahunKeB } = params
        const config = (userData.sheet_config as Record<string, any>) || {}
        const spreadsheetId = userData.spreadsheet_id

        // 4. Form dynamic sheet names
        const sheetNameA = `Tahun ke-${tahunKeA}`
        const sheetNameB = `Tahun ke-${tahunKeB}`

        // 5. Resolve per-category cell mappings (default + user override)
        const monthIdA = MONTH_IDS[monthA - 1]
        const monthIdB = MONTH_IDS[monthB - 1]

        const categoryCellsA = resolveCategoryCells(config, tahunKeA, monthIdA)
        const categoryCellsB = resolveCategoryCells(config, tahunKeB, monthIdB)

        console.log('[ibadah-comparison] Fetching:', {
            sideA: { month: monthA, year: yearA, tahunKe: tahunKeA, sheet: sheetNameA, cells: categoryCellsA },
            sideB: { month: monthB, year: yearB, tahunKe: tahunKeB, sheet: sheetNameB, cells: categoryCellsB },
        })

        // 6. Fetch per-activity values for both months independently
        const [avgA, avgB] = await Promise.all([
            Object.keys(categoryCellsA).length > 0
                ? getIbadahRerataPerActivity(spreadsheetId, sheetNameA, categoryCellsA)
                : Promise.resolve(Object.fromEntries(IBADAH_ACTIVITIES.map(a => [a, 0])) as Record<IbadahActivity, number>),
            Object.keys(categoryCellsB).length > 0
                ? getIbadahRerataPerActivity(spreadsheetId, sheetNameB, categoryCellsB)
                : Promise.resolve(Object.fromEntries(IBADAH_ACTIVITIES.map(a => [a, 0])) as Record<IbadahActivity, number>),
        ])

        console.log('[ibadah-comparison] Results A:', avgA)
        console.log('[ibadah-comparison] Results B:', avgB)

        // 7. Format response with short activity names
        const totalsA = ACTIVITY_ORDER.map(a => ({
            aktivitas: ACTIVITY_SHORT[a] || a,
            total: avgA[a] ?? 0,
        }))
        const totalsB = ACTIVITY_ORDER.map(a => ({
            aktivitas: ACTIVITY_SHORT[a] || a,
            total: avgB[a] ?? 0,
        }))

        return NextResponse.json({ totalsA, totalsB })

    } catch (error: any) {
        console.error('[ibadah-comparison] Unhandled error:', error.message, error.stack)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
