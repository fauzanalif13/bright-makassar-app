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

/** Year 1 partial mapping (only April-June are active) */
const YEAR1_CELLS: Record<string, string> = {
    juli: '',
    agustus: '',
    september: '',
    oktober: '',
    november: '',
    desember: '',
    januari: '',
    februari: '',
    maret: '',
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
