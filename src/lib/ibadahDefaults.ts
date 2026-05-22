/**
 * Ibadah Cell Mapping Defaults
 * 
 * Academic year order: Juli → Juni
 * Cell references point to the "Rerata" (average) score cells in each year's sheet.
 * 
 * Year 1: Only April (AM13), May (AM23), June (AM33) — scholarship typically starts mid-year
 * Years 2-4: Full 12-month mapping from AM13 to AM126
 */

export const ACADEMIC_MONTHS = [
    { id: 'juli', label: 'Juli' },
    { id: 'agustus', label: 'Agustus' },
    { id: 'september', label: 'September' },
    { id: 'oktober', label: 'Oktober' },
    { id: 'november', label: 'November' },
    { id: 'desember', label: 'Desember' },
    { id: 'januari', label: 'Januari' },
    { id: 'februari', label: 'Februari' },
    { id: 'maret', label: 'Maret' },
    { id: 'april', label: 'April' },
    { id: 'mei', label: 'Mei' },
    { id: 'juni', label: 'Juni' },
] as const

/** 
 * Parse spreadsheet cell value. 
 * If it's empty, return ''.
 * If it's 'ya' / '1' / 'true' / 'y', return '1'.
 * Otherwise return '0'.
 */
export function parseIbadahVal(val: any, isBooleanType: boolean): string {
    if (val === undefined || val === null || String(val).trim() === '') return ''
    const v = String(val).trim()
    if (isBooleanType) {
        const lv = v.toLowerCase()
        return (lv === 'ya' || lv === '1' || lv === 'true' || lv === 'y') ? '1' : '0'
    }
    return v
}

/** Map calendar month (1-12) to academic month id */
export const CALENDAR_TO_ACADEMIC: Record<number, string> = {
    1: 'januari', 2: 'februari', 3: 'maret', 4: 'april', 5: 'mei', 6: 'juni',
    7: 'juli', 8: 'agustus', 9: 'september', 10: 'oktober', 11: 'november', 12: 'desember',
}

/**
 * Map a calendar month+year to the correct academic year (1-4) using angkatan.
 *
 * Academic year calendar:
 *   Year 1: July {angkatan} → June {angkatan+1}
 *   Year 2: July {angkatan+1} → June {angkatan+2}
 *   Year 3: July {angkatan+2} → June {angkatan+3}
 *   Year 4: July {angkatan+3} → June {angkatan+4}
 */
export function calendarToAcademicYear(calendarMonth: number, calendarYear: number, angkatan: number): number | null {
    const academicStartYear = calendarMonth >= 7 ? calendarYear : calendarYear - 1
    const yearNum = academicStartYear - angkatan + 1 // 1-based
    if (yearNum < 1 || yearNum > 4) return null
    return yearNum
}

/**
 * Resolve the sheet name and daily block range for a given calendar month/year.
 *
 * Uses angkatan to determine the correct academic year (1-4), then:
 * 1. Checks sheet_config.ibadah.harian for that year's month config
 * 2. Falls back to default from ibadahDefaults.ts
 */
export function resolveMonthGrid(
    sheetConfig: any,
    calendarMonth: number,
    calendarYear: number,
    angkatan: number
): { sheetName: string; blockRange: string; error?: string } | { error: string } {
    const monthId = CALENDAR_TO_ACADEMIC[calendarMonth]
    if (!monthId) return { error: `Bulan tidak valid: ${calendarMonth}` }

    const yearNum = calendarToAcademicYear(calendarMonth, calendarYear, angkatan)
    if (!yearNum) return { error: `Bulan ${monthId} ${calendarYear} di luar jangkauan beasiswa (angkatan ${angkatan}).` }

    const harianConfig = sheetConfig?.ibadah?.harian
    const bulananConfig = sheetConfig?.ibadah?.bulanan
    const yk = `tahun_${yearNum}`

    // Prioritize harian config's sheet name, fallback to bulanan, then default
    const sheetName = harianConfig?.[yk]?.sheet_name || bulananConfig?.[yk]?.sheet_name || `Tahun ke-${yearNum}`

    // Check if this year's month has a configured block range
    const yearCfg = harianConfig?.[yk]
    const monthRange = yearCfg?.months?.[monthId]
    if (monthRange && monthRange.trim()) {
        const parsedInput = monthRange.trim()
        let parsedSheetName = sheetName
        let parsedBlockRange = parsedInput

        if (parsedInput.includes('!')) {
            const parts = parsedInput.split('!')
            parsedSheetName = parts[0].replace(/'/g, '')
            parsedBlockRange = parts[1]
        }
        return { sheetName: parsedSheetName, blockRange: parsedBlockRange }
    }

    // Try computing from explicit bulanan config if available
    const explicitBulananCell = bulananConfig?.[yk]?.months?.[monthId]
    if (explicitBulananCell && explicitBulananCell.trim()) {
        const parsed = parseDailyBlockRange(explicitBulananCell.trim())
        if (parsed && parsed.block) {
            return { sheetName, blockRange: parsed.block }
        }
    }

    // Fall back to complete default computed range
    const defaultBlock = getDailyBlockDefault(yearNum, monthId)
    if (defaultBlock) {
        return { sheetName, blockRange: defaultBlock }
    }

    return { error: `Tidak ada konfigurasi untuk bulan ${monthId} tahun ke-${yearNum}. Pastikan konfigurasi ibadah harian sudah diatur di Pengaturan.` }
}

/** Full 12-month cell mapping (used for Years 2, 3, 4) */
const FULL_YEAR_CELLS: Record<string, string> = {
    juli: 'AM13',
    agustus: 'AM23',
    september: 'AM33',
    oktober: 'AM43',
    november: 'AM53',
    desember: 'AM63',
    januari: 'AM76',
    februari: 'AM86',
    maret: 'AM96',
    april: 'AM106',
    mei: 'AM116',
    juni: 'AM126',
}

/** Year 1: Only April (AM13), May (AM23), June (AM33) — scholarship typically starts mid-year */
const YEAR1_CELLS: Record<string, string> = {
    april: 'AM13',
    mei: 'AM23',
    juni: 'AM33',
}

/**
 * Get the raw cell reference for a given year and month.
 * Falls back to FULL_YEAR_CELLS for Year 1 if the month normally wasn't tracked.
 */
export function getCellRef(year: number, monthId: string): string {
    if (year === 1) return YEAR1_CELLS[monthId] ?? FULL_YEAR_CELLS[monthId] ?? ''
    return FULL_YEAR_CELLS[monthId] ?? ''
}

/**
 * Get the fully qualified Google Sheets reference (e.g. "'Tahun ke-1'!AM13").
 * Returns empty string if the month has no mapping.
 */
export function getFullCellRef(year: number, monthId: string): string {
    const cell = getCellRef(year, monthId)
    if (!cell) return ''
    return `'Tahun ke-${year}'!${cell}`
}

// ─── Per-Category Cell Mapping ────────────────────────────────────────

/**
 * The 8 worship categories in their row order within each monthly block.
 * Row 0 (start row) = Sholat Jama'ah, Row 7 = Berinfak.
 */
export const CATEGORY_LABELS = [
    "Sholat Jama'ah",
    'Qiyamul Lail',
    'Dzikir Pagi',
    'Mendoakan/Memaafkan',
    'Sholat Dhuha',
    'Membaca Al Quran',
    'Shaum Sunnah',
    'Berinfak',
] as const

/**
 * Default column for per-category values.
 * If Rerata is in column AM, per-category values are in column AL (one to the left).
 */
export const DEFAULT_CATEGORY_COL = 'AL'

/**
 * Hardcoded default cell mapping for per-category ibadah values.
 * Derived from the Rerata cell: same start row, column AL, 8 consecutive rows.
 *
 * Example: if rerataCell = "AM13", returns:
 *   { "Sholat Jama'ah": "AL13", "Qiyamul Lail": "AL14", ... "Berinfak": "AL20" }
 *
 * @param rerataCell - The Rerata cell WITHOUT sheet prefix (e.g. "AM13")
 * @returns Record mapping each category label to its cell reference (e.g. "AL13")
 */
export function getCategoryCellRefs(rerataCell: string): Record<string, string> {
    const match = rerataCell.match(/^([A-Z]+)(\d+)$/)
    if (!match) return {}

    const startRow = parseInt(match[2])
    const result: Record<string, string> = {}

    for (let i = 0; i < CATEGORY_LABELS.length; i++) {
        result[CATEGORY_LABELS[i]] = `${DEFAULT_CATEGORY_COL}${startRow + i}`
    }

    return result
}

/**
 * Get all 12 default cell references for a specific year.
 * Each value is a fully qualified reference like "'Tahun ke-2'!AM13".
 */
export function getYearDefaults(year: number): Record<string, string> {
    const result: Record<string, string> = {}
    for (const m of ACADEMIC_MONTHS) {
        result[m.id] = getFullCellRef(year, m.id)
    }
    return result
}

/**
 * Get ALL 48 months across 4 years with their display metadata.
 * Used for building the full timeline chart data.
 */
export function getFullTimeline(angkatan: number): Array<{
    year: number
    monthId: string
    monthLabel: string
    calendarYear: number
    displayLabel: string
    cellRef: string
}> {
    const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    // Map academic month IDs to calendar month indexes (0-based)
    const MONTH_TO_INDEX: Record<string, number> = {
        januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
        juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
    }

    const timeline: Array<{
        year: number
        monthId: string
        monthLabel: string
        calendarYear: number
        displayLabel: string
        cellRef: string
    }> = []

    for (let yr = 1; yr <= 4; yr++) {
        const baseYear = angkatan + (yr - 1)
        for (const m of ACADEMIC_MONTHS) {
            const moIdx = MONTH_TO_INDEX[m.id]
            // Juli-Desember (6-11) belong to baseYear, Jan-Juni (0-5) belong to baseYear+1
            const calYear = moIdx >= 6 ? baseYear : baseYear + 1
            timeline.push({
                year: yr,
                monthId: m.id,
                monthLabel: m.label,
                calendarYear: calYear,
                displayLabel: `${MONTHS_SHORT[moIdx]} ${calYear.toString().slice(2)}`,
                cellRef: getFullCellRef(yr, m.id),
            })
        }
    }

    return timeline
}

// ─── Daily Block Range Utilities ──────────────────────────────────────

/**
 * The 8 worship activities in the daily grid, in row order.
 * Used for labeling each row of the parsed daily block.
 */
export const DAILY_ACTIVITIES = [
    "Sholat Jama'ah",
    'Qiyamul Lail',
    'Dzikir Pagi',
    'Mendoakan/Memaafkan',
    'Sholat Dhuha',
    'Membaca Al Quran',
    'Shaum Sunnah',
    'Berinfak',
] as const

/** Convert a 1-based column index to a spreadsheet column letter (e.g. 1→A, 7→G, 39→AM). */
function columnIndexToLetter(colIndex: number): string {
    let result = ''
    let n = colIndex
    while (n > 0) {
        const remainder = (n - 1) % 26
        result = String.fromCharCode(65 + remainder) + result
        n = Math.floor((n - 1) / 26)
    }
    return result
}

/** Convert a spreadsheet column letter to a 1-based index (e.g. A→1, G→7, AM→39). */
function columnLetterToIndex(col: string): number {
    let result = 0
    for (let i = 0; i < col.length; i++) {
        result = result * 26 + (col.charCodeAt(i) - 64)
    }
    return result
}

/** Extract the column letters and row number from a cell reference like "AM13". */
function parseCell(cell: string): { col: string; row: number } | null {
    const match = cell.match(/^([A-Z]+)(\d+)$/)
    if (!match) return null
    return { col: match[1], row: parseInt(match[2], 10) }
}

export type DailyBlockResult = {
    /** Full block range, e.g. "G13:AK20" */
    block: string
    /** Per-activity row ranges, e.g. ["G13:AK13", "G14:AK14", ...] */
    rows: string[]
    /** Activity labels for each row */
    activities: typeof DAILY_ACTIVITIES
}

/**
 * Parse a monthly "Rerata" cell reference into the daily grid block range.
 *
 * The daily grid is located **32 columns to the left** of the Rerata column
 * and spans **31 columns** (days 1-31) × **8 rows** (one per activity).
 *
 * @example
 *   parseDailyBlockRange("AM13")
 *   // → { block: "G13:AK20", rows: ["G13:AK13", "G14:AK14", ...], activities: [...] }
 *
 *   parseDailyBlockRange("AM23")
 *   // → { block: "G23:AK30", rows: ["G23:AK23", "G24:AK24", ...], activities: [...] }
 */
export function parseDailyBlockRange(monthlyCell: string): DailyBlockResult | null {
    // Extract sheet name and cell reference, handling formats like "'Tahun ke-1'!AM13"
    let sheetName = ''
    let cellOnly = monthlyCell

    if (monthlyCell.includes('!')) {
        const parts = monthlyCell.split('!')
        sheetName = parts[0]
        cellOnly = parts[1]
    }

    const parsed = parseCell(cellOnly)
    if (!parsed) return null

    const rerataColIndex = columnLetterToIndex(parsed.col) // e.g. AM → 39
    const startColIndex = rerataColIndex - 32              // e.g. 39 - 32 = 7 → G
    const endColIndex = startColIndex + 30                 // e.g. 7 + 30 = 37 → AK

    if (startColIndex < 1) return null // Safety: can't go before column A

    const startCol = columnIndexToLetter(startColIndex)
    const endCol = columnIndexToLetter(endColIndex)
    const startRow = parsed.row
    const endRow = startRow + 7 // 8 activities = 8 rows

    const rows = DAILY_ACTIVITIES.map((_, i) => {
        const rowNum = startRow + i
        return `${startCol}${rowNum}:${endCol}${rowNum}`
    })

    const blockRef = `${startCol}${startRow}:${endCol}${endRow}`

    return {
        block: sheetName ? `${sheetName}!${blockRef}` : blockRef,
        rows,
        activities: DAILY_ACTIVITIES,
    }
}

/** Parse a block range string like "G13:AK20" into start col, end col, start row */
export function parseBlockRange(blockRange: string): { startCol: number; endCol: number; startRow: number } | null {
    // Just in case a sheet name sneaked in, strip it
    const rangeOnly = blockRange.includes('!') ? blockRange.split('!')[1] : blockRange
    const match = rangeOnly.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
    if (!match) return null

    return {
        startCol: columnLetterToIndex(match[1]),
        endCol: columnLetterToIndex(match[3]),
        startRow: parseInt(match[2]),
    }
}

/**
 * Get the default daily block range string for a given year and month.
 * Derives it automatically from the monthly Rerata cell mapping.
 *
 * @returns Block range string (e.g. "G13:AK20") or empty string if no mapping exists.
 */
export function getDailyBlockDefault(year: number, monthId: string): string {
    const monthlyCell = getCellRef(year, monthId)
    if (!monthlyCell) return ''
    const result = parseDailyBlockRange(monthlyCell)
    return result?.block ?? ''
}
