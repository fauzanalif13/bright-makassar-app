'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/utils/supabase/server'
import { getSheetData, updateSheetRow } from '@/src/lib/googleSheets'

// ─── Constants ───────────────────────────────────────────────────────

const DEFAULT_RESUME_SHEET = 'Resume'
const SEMESTER_COUNT = 8

/** Anchors to locate sections in the Resume sheet */
const TOEFL_ANCHOR = 'Kemampuan Bahasa Inggris'
const IP_ANCHOR = 'Indeks Prestasi'

/**
 * Rows to skip after each anchor before data rows:
 * TOEFL: anchor → header row → data row (skip 1)
 * IP: anchor → description → header → data (skip 2... but the data is labels + values)
 */

// ─── Types ───────────────────────────────────────────────────────────

export type ToeflData = {
    predictionTest: string
    toeflItp: string
}

export type IpIpkData = {
    /** IP values for Smt 1 through Smt 8 */
    semesters: string[]
    /** IPK value (last column) */
    ipk: string
}

export type PerkuliahanData = {
    toefl: ToeflData
    ipIpk: IpIpkData
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getResumeSheetName(sheetConfig: Record<string, any> | null): string {
    return sheetConfig?.resume_sheet || DEFAULT_RESUME_SHEET
}

/** Normalize value: always use dot as decimal separator */
function normalizeDot(val: string): string {
    return val.trim().replace(',', '.')
}

/** Get authenticated user + spreadsheet info */
async function getAuthAndSheet() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Sesi kedaluwarsa.' } as const

    const { data: userData } = await supabase
        .from('roles_pengguna')
        .select('spreadsheet_id, sheet_config')
        .eq('email', user.email)
        .single()

    if (!userData?.spreadsheet_id) return { error: 'Spreadsheet belum dikonfigurasi.' } as const

    const sheetConfig = userData.sheet_config as Record<string, any> | null
    const sheetName = getResumeSheetName(sheetConfig)

    return { spreadsheetId: userData.spreadsheet_id, sheetName, sheetConfig } as const
}

// ─── Server Actions ──────────────────────────────────────────────────

/**
 * Fetch TOEFL and IP/IPK data from the Resume sheet.
 */
export async function getPerkuliahanData(): Promise<{
    data?: PerkuliahanData
    error?: string
}> {
    try {
        const auth = await getAuthAndSheet()
        if ('error' in auth) return { error: auth.error }
        const { spreadsheetId, sheetName } = auth

        // Read all data from Resume sheet
        const rows = await getSheetData(spreadsheetId, `'${sheetName}'!A:K`)

        let toefl: ToeflData = { predictionTest: '', toeflItp: '' }
        let ipIpk: IpIpkData = { semesters: Array(SEMESTER_COUNT).fill(''), ipk: '' }

        // Find TOEFL section
        for (let i = 0; i < rows.length; i++) {
            const cellA = (rows[i][0] || '').trim().toLowerCase()
            const cellB = (rows[i][1] || '').trim().toLowerCase()
            if (cellA === TOEFL_ANCHOR.toLowerCase() || cellB === TOEFL_ANCHOR.toLowerCase()) {
                // Next row has "Prediction Test" label and value
                const predRow = rows[i + 1] || []
                // Find value — scan row for the numeric value after "Prediction Test"
                // Based on spreadsheet: col B = "Prediction Test", col D = value, col G = "TOEFL ITP", col I = value
                toefl.predictionTest = normalizeDot(String(predRow[3] || ''))
                toefl.toeflItp = normalizeDot(String(predRow[8] || ''))
                break
            }
        }

        // Find IP section
        for (let i = 0; i < rows.length; i++) {
            const cellA = (rows[i][0] || '').trim().toLowerCase()
            const cellB = (rows[i][1] || '').trim().toLowerCase()
            if (cellA === IP_ANCHOR.toLowerCase() || cellB === IP_ANCHOR.toLowerCase()) {
                // Skip anchor + description + header = 3 rows to get to data
                const dataRow = rows[i + 3] || []
                // Smt 1-8 values in columns B through I (indices 1-8)
                for (let s = 0; s < SEMESTER_COUNT; s++) {
                    ipIpk.semesters[s] = normalizeDot(String(dataRow[s + 1] || ''))
                }
                // IPK is in the column after Smt 8 (index 9)
                ipIpk.ipk = normalizeDot(String(dataRow[9] || ''))
                break
            }
        }

        return { data: { toefl, ipIpk } }
    } catch (err) {
        console.error('[getPerkuliahanData] Error:', err)
        return { error: 'Gagal mengambil data perkuliahan.' }
    }
}

/**
 * Update TOEFL scores (fixed grid update — in-place cell updates).
 */
export async function updateToeflData(formData: FormData): Promise<{
    success?: string
    error?: string
}> {
    try {
        const auth = await getAuthAndSheet()
        if ('error' in auth) return { error: auth.error }
        const { spreadsheetId, sheetName } = auth

        const predictionTest = normalizeDot(formData.get('predictionTest') as string || '')
        const toeflItp = normalizeDot(formData.get('toeflItp') as string || '')

        // Find the TOEFL anchor row to get exact cell positions
        const rows = await getSheetData(spreadsheetId, `'${sheetName}'!A:K`)
        let anchorIdx = -1
        for (let i = 0; i < rows.length; i++) {
            const cellA = (rows[i][0] || '').trim().toLowerCase()
            const cellB = (rows[i][1] || '').trim().toLowerCase()
            if (cellA === TOEFL_ANCHOR.toLowerCase() || cellB === TOEFL_ANCHOR.toLowerCase()) {
                anchorIdx = i
                break
            }
        }

        if (anchorIdx === -1) return { error: 'Bagian "Kemampuan Bahasa Inggris" tidak ditemukan di sheet.' }

        const dataRowNum = anchorIdx + 2 // 1-based sheet row (anchor + 1 header + 1 for 1-based)

        // Update Prediction Test (col D) and TOEFL ITP (col I)
        const sheetRef = `'${sheetName}'`
        if (predictionTest) {
            await updateSheetRow(spreadsheetId, `${sheetRef}!D${dataRowNum}`, [[predictionTest]])
        }
        if (toeflItp) {
            await updateSheetRow(spreadsheetId, `${sheetRef}!I${dataRowNum}`, [[toeflItp]])
        }

        console.log(`[updateToeflData] Updated row ${dataRowNum}`)

        revalidatePath('/dashboard/awardee/pendidikan/perkuliahan')
        revalidatePath('/dashboard/awardee')

        return { success: 'Data TOEFL berhasil diperbarui! ✏️' }
    } catch (err: any) {
        console.error('[updateToeflData] Error:', err.message)
        return { error: 'Terjadi kesalahan saat memperbarui TOEFL.' }
    }
}

/**
 * Update IP/IPK scores (fixed grid update — in-place cell updates).
 * Always normalizes comma to dot for consistency.
 */
export async function updateIpIpkData(formData: FormData): Promise<{
    success?: string
    error?: string
}> {
    try {
        const auth = await getAuthAndSheet()
        if ('error' in auth) return { error: auth.error }
        const { spreadsheetId, sheetName } = auth

        // Find the IP anchor row
        const rows = await getSheetData(spreadsheetId, `'${sheetName}'!A:K`)
        let anchorIdx = -1
        for (let i = 0; i < rows.length; i++) {
            const cellA = (rows[i][0] || '').trim().toLowerCase()
            const cellB = (rows[i][1] || '').trim().toLowerCase()
            if (cellA === IP_ANCHOR.toLowerCase() || cellB === IP_ANCHOR.toLowerCase()) {
                anchorIdx = i
                break
            }
        }

        if (anchorIdx === -1) return { error: 'Bagian "Indeks Prestasi" tidak ditemukan di sheet.' }

        const dataRowNum = anchorIdx + 4 // anchor(1) + description(1) + header(1) + 1-based offset

        const sheetRef = `'${sheetName}'`

        // Update each semester IP (columns B through I)
        for (let s = 0; s < SEMESTER_COUNT; s++) {
            const rawVal = (formData.get(`smt${s + 1}`) as string) || ''
            const val = normalizeDot(rawVal)
            if (val) {
                const col = String.fromCharCode(66 + s) // B=66, C=67, ...
                await updateSheetRow(spreadsheetId, `${sheetRef}!${col}${dataRowNum}`, [[val]])
            }
        }

        // Update IPK (column J)
        const rawIpk = (formData.get('ipk') as string) || ''
        const ipk = normalizeDot(rawIpk)
        if (ipk) {
            await updateSheetRow(spreadsheetId, `${sheetRef}!J${dataRowNum}`, [[ipk]])
        }

        console.log(`[updateIpIpkData] Updated row ${dataRowNum}`)

        revalidatePath('/dashboard/awardee/pendidikan/perkuliahan')
        revalidatePath('/dashboard/awardee')

        return { success: 'Data IP/IPK berhasil diperbarui! ✏️' }
    } catch (err: any) {
        console.error('[updateIpIpkData] Error:', err.message)
        return { error: 'Terjadi kesalahan saat memperbarui IP/IPK.' }
    }
}
