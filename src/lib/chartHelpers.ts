/**
 * Chart Data Transformation Helpers
 *
 * Provides cumulative averages and month-over-month delta computations
 * for the Ibadah Trend chart.
 */

export type RawTrendItem = { bulan: string; skor: number | null; tahun: number }

export type EnrichedTrendItem = {
    bulan: string
    skor: number | null
    rataRataKeseluruhan: number | null   // Cumulative average up to this month
    selisihBulanLalu: number      // Percentage difference vs previous month
    tahun: number
}

/**
 * Enriches raw trend data with cumulative average and MoM delta.
 * Months with skor === null or 0 are treated as "no data" and excluded
 * from cumulative calculations to avoid dragging the avg down.
 */
export function enrichTrendData(raw: RawTrendItem[]): EnrichedTrendItem[] {
    let cumulativeSum = 0
    let cumulativeCount = 0

    // Filter out months that don't have a table data (skor === null)
    const validRaw = raw.filter(item => item.skor !== null)

    return validRaw.map((item, i) => {
        // Cumulative average
        if (item.skor! > 0) {
            cumulativeSum += item.skor!
            cumulativeCount++
        }
        const rataRataKeseluruhan = cumulativeCount > 0
            ? Math.round((cumulativeSum / cumulativeCount) * 10) / 10
            : null

        // Month-over-month difference
        let selisihBulanLalu = 0
        if (item.skor! > 0) {
            let prevSkor = 0
            for (let j = i - 1; j >= 0; j--) {
                if (validRaw[j].skor! > 0) {
                    prevSkor = validRaw[j].skor!
                    break
                }
            }
            if (prevSkor > 0) {
                selisihBulanLalu = Math.round((item.skor! - prevSkor) * 10) / 10
            }
        }

        return {
            bulan: item.bulan,
            skor: item.skor,
            rataRataKeseluruhan,
            selisihBulanLalu,
            tahun: item.tahun
        }
    })
}

/**
 * Calculates the current academic year (Tahun ke-X) based on angkatan.
 * Academic years start in July.
 * Example: angkatan=2024, current=Jan 2026 → Tahun ke-2
 */
export function getCurrentAcademicYear(angkatan: number): number {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-12

    // If we're in Jul-Dec, we're in the next academic year compared to Jan-Jun
    const tahun = currentYear - angkatan + (currentMonth >= 7 ? 1 : 0)

    // Clamp between 1 and 4
    return Math.max(1, Math.min(4, tahun))
}
