'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/utils/supabase/server'
import { getSheetData, updateSheetRow, invalidateCache } from '@/src/lib/googleSheets'
import {
    ACADEMIC_MONTHS,
    DAILY_ACTIVITIES,
    getDailyBlockDefault,
    parseDailyBlockRange,
} from '@/src/lib/ibadahDefaults'

// ─── Types ───────────────────────────────────────────────────────────

export type IbadahEntry = {
    day: number             // 1-31
    shalatBerjamaah: string
    qiyamulLail: string
    dzikirPagi: string
    mendoakan: string
    shalatDhuha: string
    membacaQuran: string
    shaumSunnah: string
    berinfak: string
}

type SheetConfig = Record<string, any> | null

// ─── Helpers ─────────────────────────────────────────────────────────

/** Map calendar month (1-12) to academic month id */
const CALENDAR_TO_ACADEMIC: Record<number, string> = {
    1: 'januari', 2: 'februari', 3: 'maret', 4: 'april', 5: 'mei', 6: 'juni',
    7: 'juli', 8: 'agustus', 9: 'september', 10: 'oktober', 11: 'november', 12: 'desember',
}

/** 
 * Parse spreadsheet cell value. 
 * If it's empty, return ''.
 * If it's 'ya' / '1' / 'true' / 'y', return '1'.
 * Otherwise return '0'.
 */
function parseIbadahVal(val: any, isBooleanType: boolean): string {
    if (val === undefined || val === null || String(val).trim() === '') return ''
    const v = String(val).trim()
    if (isBooleanType) {
        const lv = v.toLowerCase()
        return (lv === 'ya' || lv === '1' || lv === 'true' || lv === 'y') ? '1' : '0'
    }
    return v
}

/** Get authenticated user + spreadsheet info */
async function getAuthAndSheet() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Sesi kedaluwarsa.' } as const

    const { data: userData } = await supabase
        .from('roles_pengguna')
        .select('spreadsheet_id, sheet_config, angkatan')
        .eq('email', user.email)
        .single()

    if (!userData?.spreadsheet_id) return { error: 'Spreadsheet belum dikonfigurasi.' } as const

    const angkatan = userData.angkatan ? parseInt(String(userData.angkatan)) : new Date().getFullYear()

    return {
        spreadsheetId: userData.spreadsheet_id,
        angkatan,
        sheetConfig: userData.sheet_config as SheetConfig
    }
}

export async function getAngkatan() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Date().getFullYear()

    const { data } = await supabase
        .from('roles_pengguna')
        .select('angkatan')
        .eq('email', user.email)
        .single()

    return data?.angkatan ? parseInt(String(data.angkatan)) : new Date().getFullYear()
}

/**
 * Map a calendar month+year to the correct academic year (1-4) using angkatan.
 *
 * Academic year calendar:
 *   Year 1: July {angkatan} → June {angkatan+1}
 *   Year 2: July {angkatan+1} → June {angkatan+2}
 *   Year 3: July {angkatan+2} → June {angkatan+3}
 *   Year 4: July {angkatan+3} → June {angkatan+4}
 *
 * Calendar months 7-12 (Jul-Dec) belong to the first half of the academic year.
 * Calendar months 1-6 (Jan-Jun) belong to the second half of the academic year.
 */
function calendarToAcademicYear(calendarMonth: number, calendarYear: number, angkatan: number): number | null {
    // Jul-Dec: academic year starts in this calendar year
    // Jan-Jun: academic year started in the previous calendar year
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
function resolveMonthGrid(
    sheetConfig: SheetConfig,
    calendarMonth: number,
    calendarYear: number,
    angkatan: number
): { sheetName: string; blockRange: string; error?: string } | { error: string } {
    const monthId = CALENDAR_TO_ACADEMIC[calendarMonth]
    if (!monthId) return { error: `Bulan tidak valid: ${calendarMonth}` }

    const yearNum = calendarToAcademicYear(calendarMonth, calendarYear, angkatan)
    if (!yearNum) return { error: `Bulan ${monthId} ${calendarYear} di luar jangkauan beasiswa (angkatan ${angkatan}).` }

    const harianConfig = (sheetConfig as any)?.ibadah?.harian
    const bulananConfig = (sheetConfig as any)?.ibadah?.bulanan
    const yk = `tahun_${yearNum}`

    // Prioritize harian config's sheet name, fallback to bulanan, then default
    const sheetName = harianConfig?.[yk]?.sheet_name || bulananConfig?.[yk]?.sheet_name || `Tahun ke-${yearNum}`

    // Check if this year's month has a configured block range
    const yearCfg = harianConfig?.[yk]
    const monthRange = yearCfg?.months?.[monthId]
    if (monthRange && monthRange.trim()) {
        return { sheetName, blockRange: monthRange.trim() }
    }

    // Fall back to default computed range
    const defaultBlock = getDailyBlockDefault(yearNum, monthId)
    if (defaultBlock) {
        return { sheetName, blockRange: defaultBlock }
    }

    return { error: `Tidak ada konfigurasi untuk bulan ${monthId} tahun ke-${yearNum}. Pastikan konfigurasi ibadah harian sudah diatur di Pengaturan.` }
}

/** Parse a block range string like "G13:AK20" into start col, end col, start row */
function parseBlockRange(blockRange: string): { startCol: number; endCol: number; startRow: number } | null {
    const match = blockRange.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
    if (!match) return null

    function colToIndex(col: string): number {
        let result = 0
        for (let i = 0; i < col.length; i++) result = result * 26 + (col.charCodeAt(i) - 64)
        return result
    }

    return {
        startCol: colToIndex(match[1]),
        endCol: colToIndex(match[3]),
        startRow: parseInt(match[2]),
    }
}

/** Convert 1-based column index to letter (1→A, 7→G, 39→AM) */
function colIndexToLetter(n: number): string {
    let result = ''
    while (n > 0) {
        const rem = (n - 1) % 26
        result = String.fromCharCode(65 + rem) + result
        n = Math.floor((n - 1) / 26)
    }
    return result
}

// ─── Server Actions ──────────────────────────────────────────────────

/**
 * Fetch all ibadah entries for a specific calendar month/year.
 * Reads the fixed 8×31 grid from the correct year sheet.
 */
export async function getIbadahMonthEntries(month: number, year: number, forceRefresh = false): Promise<{
    data?: IbadahEntry[]
    error?: string
}> {
    try {
        const auth = await getAuthAndSheet()
        if ('error' in auth) return { error: auth.error }
        const { spreadsheetId, sheetConfig, angkatan } = auth

        if (forceRefresh) invalidateCache(spreadsheetId)

        const grid = resolveMonthGrid(sheetConfig, month, year, angkatan)
        if ('error' in grid && !('sheetName' in grid)) return { error: grid.error }
        if (!('sheetName' in grid)) return { error: 'Konfigurasi tidak valid.' }

        const { sheetName, blockRange } = grid
        const fullRange = `'${sheetName}'!${blockRange}`

        const rows = await getSheetData(spreadsheetId, fullRange)

        // rows[0..7] = 8 activities, each row has up to 31 columns (days 1-31)
        // Parse into day-based entries
        const parsed = parseBlockRange(blockRange)
        if (!parsed) return { error: 'Format range tidak valid.' }

        const numDays = parsed.endCol - parsed.startCol + 1 // should be 31
        const entries: IbadahEntry[] = []

        for (let dayIdx = 0; dayIdx < numDays; dayIdx++) {
            const day = dayIdx + 1
            // Check if any activity has data for this day
            let hasData = false
            for (let actIdx = 0; actIdx < 8; actIdx++) {
                const val = rows[actIdx]?.[dayIdx]
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                    hasData = true
                    break
                }
            }
            if (!hasData) continue

            entries.push({
                day,
                shalatBerjamaah: parseIbadahVal(rows[0]?.[dayIdx], false),
                qiyamulLail: parseIbadahVal(rows[1]?.[dayIdx], false),
                dzikirPagi: parseIbadahVal(rows[2]?.[dayIdx], true),
                mendoakan: parseIbadahVal(rows[3]?.[dayIdx], true),
                shalatDhuha: parseIbadahVal(rows[4]?.[dayIdx], true),
                membacaQuran: parseIbadahVal(rows[5]?.[dayIdx], true),
                shaumSunnah: parseIbadahVal(rows[6]?.[dayIdx], true),
                berinfak: parseIbadahVal(rows[7]?.[dayIdx], true),
            })
        }

        return { data: entries }
    } catch (err: any) {
        console.error('[getIbadahMonthEntries] Error:', err?.message || err)
        const msg = String(err?.message || '')
        if (msg.includes('Unable to parse range') || msg.includes('cannot be found')) {
            return { error: `Gagal membaca sheet. Pastikan sheet dikonfigurasi dengan benar di Profil & Pengaturan, dan spreadsheet Anda memilikinya.` }
        }
        return { error: 'Gagal mengambil data ibadah.' }
    }
}

/**
 * Fetch ibadah data for a specific date (used by the input form).
 */
export async function getIbadahForDate(dateStr: string): Promise<{
    data?: {
        shalatBerjamaah: string
        qiyamulLail: string
        dzikirPagi: string
        mendoakan: string
        shalatDhuha: string
        membacaQuran: string
        shaumSunnah: string
        berinfak: string
    } | null
    error?: string
}> {
    try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return { error: 'Tanggal tidak valid.' }

        const month = d.getMonth() + 1
        const year = d.getFullYear()
        const day = d.getDate()

        const result = await getIbadahMonthEntries(month, year)
        if (result.error) return { error: result.error }

        const entry = result.data?.find(e => e.day === day)
        if (!entry) return { data: null }

        return {
            data: {
                shalatBerjamaah: entry.shalatBerjamaah,
                qiyamulLail: entry.qiyamulLail,
                dzikirPagi: entry.dzikirPagi,
                mendoakan: entry.mendoakan,
                shalatDhuha: entry.shalatDhuha,
                membacaQuran: entry.membacaQuran,
                shaumSunnah: entry.shaumSunnah,
                berinfak: entry.berinfak,
            },
        }
    } catch (err: any) {
        console.error('[getIbadahForDate] Error:', err?.message || err)
        return { error: 'Gagal mengambil data.' }
    }
}

/**
 * Upsert ibadah data for a single day.
 * Writes each activity value into the correct cell in the fixed grid.
 */
export async function upsertIbadahHarian(formData: FormData): Promise<{ success?: string; error?: string }> {
    try {
        const auth = await getAuthAndSheet()
        if ('error' in auth) return { error: auth.error }
        const { spreadsheetId, sheetConfig, angkatan } = auth

        const tanggal = formData.get('tanggal') as string
        if (!tanggal) return { error: 'Tanggal wajib diisi.' }

        const d = new Date(tanggal)
        const month = d.getMonth() + 1
        const year = d.getFullYear()
        const day = d.getDate()
        const dayIdx = day - 1 // 0-based column index within the block

        const grid = resolveMonthGrid(sheetConfig, month, year, angkatan)
        if (!('sheetName' in grid)) return { error: grid.error }
        const { sheetName, blockRange } = grid

        const parsed = parseBlockRange(blockRange)
        if (!parsed) return { error: 'Format range tidak valid.' }

        // Calculate the actual column letter for this day
        const dayColIndex = parsed.startCol + dayIdx
        const dayCol = colIndexToLetter(dayColIndex)

        // Values for each activity (8 rows)
        const shalatBerjamaah = formData.get('shalatBerjamaah') as string || '0'
        const qiyamulLail = formData.get('qiyamulLail') as string || '0'
        const dzikirPagi = formData.get('dzikirPagi') === 'on' ? 1 : 0
        const mendoakan = formData.get('mendoakan') === 'on' ? 1 : 0
        const shalatDhuha = formData.get('shalatDhuha') === 'on' ? 1 : 0
        const membacaQuran = formData.get('membacaQuran') === 'on' ? 1 : 0
        const shaumSunnah = formData.get('shaumSunnah') === 'on' ? 1 : 0
        const berinfak = formData.get('berinfak') === 'on' ? 1 : 0

        const values = [shalatBerjamaah, qiyamulLail, dzikirPagi, mendoakan, shalatDhuha, membacaQuran, shaumSunnah, berinfak]
        const sheetRef = `'${sheetName}'`

        // Write each activity's value for this day (column = dayCol, rows = startRow to startRow+7)
        for (let actIdx = 0; actIdx < 8; actIdx++) {
            const rowNum = parsed.startRow + actIdx
            await updateSheetRow(spreadsheetId, `${sheetRef}!${dayCol}${rowNum}`, [[values[actIdx]]])
        }

        invalidateCache(spreadsheetId)
        revalidatePath('/dashboard/awardee')

        return { success: 'Laporan berhasil disimpan! 🎉' }
    } catch (err: any) {
        console.error('[upsertIbadahHarian] Error:', err?.message || err)
        return { error: 'Terjadi kesalahan. Coba lagi nanti.' }
    }
}

/**
 * Update a single cell value for inline editing in the table.
 * activityIndex: 0=shalatBerjamaah, 1=qiyamulLail, ..., 7=berinfak
 * day: 1-31
 */
export async function updateIbadahCell(
    calendarMonth: number,
    calendarYear: number,
    day: number,
    activityIndex: number,
    value: string
): Promise<{ success?: string; error?: string }> {
    try {
        const auth = await getAuthAndSheet()
        if ('error' in auth) return { error: auth.error }
        const { spreadsheetId, sheetConfig, angkatan } = auth

        const grid = resolveMonthGrid(sheetConfig, calendarMonth, calendarYear, angkatan)
        if (!('sheetName' in grid)) return { error: grid.error }
        const { sheetName, blockRange } = grid

        const parsed = parseBlockRange(blockRange)
        if (!parsed) return { error: 'Format range tidak valid.' }

        const dayColIndex = parsed.startCol + (day - 1)
        const dayCol = colIndexToLetter(dayColIndex)
        const rowNum = parsed.startRow + activityIndex

        await updateSheetRow(spreadsheetId, `'${sheetName}'!${dayCol}${rowNum}`, [[value]])
        invalidateCache(spreadsheetId)

        return { success: 'Data berhasil diperbarui! ✏️' }
    } catch (err: any) {
        console.error('[updateIbadahCell] Error:', err?.message || err)
        return { error: 'Gagal memperbarui data.' }
    }
}

/**
 * Clear a day's ibadah data by setting all 8 activity cells to empty.
 */
export async function clearIbadahEntry(
    calendarMonth: number,
    calendarYear: number,
    day: number
): Promise<{ success?: string; error?: string }> {
    try {
        const auth = await getAuthAndSheet()
        if ('error' in auth) return { error: auth.error }
        const { spreadsheetId, sheetConfig, angkatan } = auth

        const grid = resolveMonthGrid(sheetConfig, calendarMonth, calendarYear, angkatan)
        if (!('sheetName' in grid)) return { error: grid.error }
        const { sheetName, blockRange } = grid

        const parsed = parseBlockRange(blockRange)
        if (!parsed) return { error: 'Format range tidak valid.' }

        const dayColIndex = parsed.startCol + (day - 1)
        const dayCol = colIndexToLetter(dayColIndex)

        // Clear all 8 activity cells for this day
        for (let actIdx = 0; actIdx < 8; actIdx++) {
            const rowNum = parsed.startRow + actIdx
            await updateSheetRow(spreadsheetId, `'${sheetName}'!${dayCol}${rowNum}`, [['']])
        }

        invalidateCache(spreadsheetId)
        revalidatePath('/dashboard/awardee')

        return { success: 'Data ibadah berhasil dihapus! 🗑️' }
    } catch (err: any) {
        console.error('[clearIbadahEntry] Error:', err?.message || err)
        return { error: 'Terjadi kesalahan saat menghapus.' }
    }
}
