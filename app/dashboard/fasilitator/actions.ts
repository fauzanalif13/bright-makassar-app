'use server'

import { getIbadahMonthlyAverage, getIbadahDailyData, IBADAH_ACTIVITIES } from '@/src/lib/googleSheets'
import type { IbadahActivity } from '@/src/lib/googleSheets'

export type AwardeeChartResult = {
    monthly: { aktivitas: string; skor: number }[]
    daily: { day: number;  [key: string]: number }[]
}

export async function getAwardeeChartData(
    spreadsheetId: string,
    sheetName: string
): Promise<AwardeeChartResult> {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    // Fetch monthly and daily in parallel
    const [averages, dailyRows] = await Promise.all([
        getIbadahMonthlyAverage(spreadsheetId, sheetName, month, year),
        getIbadahDailyData(spreadsheetId, sheetName, month, year),
    ])

    // Transform monthly averages
    const monthly = IBADAH_ACTIVITIES.map((activity: IbadahActivity) => ({
        aktivitas: activity
            .replace("Shalat Berjama'ah", "Jama'ah")
            .replace("Membaca Al-Quran", "Tilawah"),
        skor: averages[activity] ?? 0,
    }))

    // Transform daily data for line chart
    const daily: { day: number; [key: string]: number }[] = dailyRows.map((row) => {
        const entry: { day: number; [key: string]: number } = { day: row.day }
        for (const activity of IBADAH_ACTIVITIES) {
            // Use display names matching AwardeeCharts keys
            const displayName = activity
                .replace("Shalat Berjama'ah", 'Shalat Berjamaah')
                .replace("Mendo'akan", "Mendo'akan")
            entry[displayName] = row.values[activity] ?? 0
        }
        return entry
    })

    return { monthly, daily }
}
