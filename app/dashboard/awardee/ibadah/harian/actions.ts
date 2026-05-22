'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/utils/supabase/server'
import { getSheetData, updateSheetRow, invalidateCache } from '@/src/lib/googleSheets'
import {
    ACADEMIC_MONTHS,
    DAILY_ACTIVITIES,
    getDailyBlockDefault,
    parseDailyBlockRange,
    CALENDAR_TO_ACADEMIC,
    calendarToAcademicYear,
    resolveMonthGrid,
    parseBlockRange,
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
// ─── Helpers ─────────────────────────────────────────────────────────

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
type SheetConfig = Record<string, any> | null

// ─── Helpers ─────────────────────────────────────────────────────────

// (Helpers moved to ibadahDefaults.ts)

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
