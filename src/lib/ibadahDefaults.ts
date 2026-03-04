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
 * Returns empty string if no mapping exists (e.g. Year 1, Juli-Maret).
 */
export function getCellRef(year: number, monthId: string): string {
    if (year === 1) return YEAR1_CELLS[monthId] ?? ''
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
    // Strip any sheet prefix like "'Tahun ke-1'!" if present
    const cellOnly = monthlyCell.includes('!') ? monthlyCell.split('!')[1] : monthlyCell
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

    return {
        block: `${startCol}${startRow}:${endCol}${endRow}`,
        rows,
        activities: DAILY_ACTIVITIES,
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
