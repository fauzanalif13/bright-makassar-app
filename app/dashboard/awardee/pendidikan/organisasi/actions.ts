'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/utils/supabase/server'
import {
    getSheetData,
    updateSheetRow,
    invalidateCache,
    getAuthClient,
    getSheetId,
    findTableBottom,
} from '@/src/lib/googleSheets'
import { google } from 'googleapis'

// ─── Constants ───────────────────────────────────────────────────────

const ORGANISASI_ANCHOR = 'Riwayat Organisasi'
const DEFAULT_RESUME_SHEET = 'Resume'
const ROWS_TO_SKIP_AFTER_ANCHOR = 2

/**
 * Explicit column indices (0-based) matching the spreadsheet layout:
 * B (1) = Tahun
 * C (2) = Daftar Organisasi (merged C-F)
 * G (6) = Jabatan
 * I (8) = Level
 */
const COL = { TAHUN: 1, ORGANISASI: 2, JABATAN: 6, LEVEL: 8 } as const

// ─── Types ───────────────────────────────────────────────────────────

export type OrganisasiEntry = {
    rowIndex: number
    tahun: string
    daftarOrganisasi: string
    jabatan: string
    level: string
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getResumeSheetName(sheetConfig: Record<string, any> | null): string {
    return sheetConfig?.resume_sheet || DEFAULT_RESUME_SHEET
}

// ─── Server Actions ──────────────────────────────────────────────────

export async function getOrganisasiEntries(forceRefresh = false): Promise<{
    data?: OrganisasiEntry[]
    error?: string
}> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'Sesi kedaluwarsa.' }

        const { data: userData } = await supabase
            .from('roles_pengguna')
            .select('spreadsheet_id, sheet_config')
            .eq('email', user.email)
            .single()

        if (!userData?.spreadsheet_id) return { error: 'Spreadsheet belum dikonfigurasi.' }

        if (forceRefresh) {
            invalidateCache(userData.spreadsheet_id)
        }

        const sheetConfig = userData.sheet_config as Record<string, any> | null
        const sheetName = getResumeSheetName(sheetConfig)
        const rows = await getSheetData(userData.spreadsheet_id, `'${sheetName}'!A:K`)

        const normalizedAnchor = ORGANISASI_ANCHOR.trim().toLowerCase()
        let anchorIdx = -1
        for (let i = 0; i < rows.length && anchorIdx === -1; i++) {
            if ((rows[i][1] || '').trim().toLowerCase() === normalizedAnchor) anchorIdx = i
        }
        for (let i = 0; i < rows.length && anchorIdx === -1; i++) {
            if ((rows[i][0] || '').trim().toLowerCase() === normalizedAnchor) anchorIdx = i
        }
        for (let i = 0; i < rows.length && anchorIdx === -1; i++) {
            if ((rows[i][2] || '').trim().toLowerCase() === normalizedAnchor) anchorIdx = i
        }

        if (anchorIdx === -1) return { data: [] }

        const dataStart = anchorIdx + 1 + ROWS_TO_SKIP_AFTER_ANCHOR
        const entries: OrganisasiEntry[] = []

        for (let i = dataStart; i < rows.length; i++) {
            const tahun = (rows[i][COL.TAHUN] || '').trim()
            const org = (rows[i][COL.ORGANISASI] || '').trim()
            if (!tahun && !org) break
            entries.push({
                rowIndex: i + 1,
                tahun,
                daftarOrganisasi: org,
                jabatan: (rows[i][COL.JABATAN] || '').trim(),
                level: (rows[i][COL.LEVEL] || '').trim(),
            })
        }

        return { data: entries }
    } catch (err: any) {
        console.error('[getOrganisasiEntries] Error:', err?.message || err)
        return { error: 'Gagal mengambil data organisasi.' }
    }
}

export async function addOrganisasiEntry(formData: FormData): Promise<{
    success?: string; error?: string; newEntry?: OrganisasiEntry
}> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'Sesi kedaluwarsa. Login kembali.' }

        const { data: userData } = await supabase
            .from('roles_pengguna')
            .select('spreadsheet_id, sheet_config')
            .eq('email', user.email)
            .single()
        if (!userData?.spreadsheet_id) return { error: 'Spreadsheet belum dikonfigurasi.' }

        const tahun = (formData.get('tahun') as string)?.trim()
        const daftarOrganisasi = (formData.get('daftarOrganisasi') as string)?.trim()
        const jabatan = (formData.get('jabatan') as string)?.trim()
        const level = (formData.get('level') as string)?.trim() || ''

        if (!tahun) return { error: 'Tahun wajib diisi.' }
        if (!daftarOrganisasi) return { error: 'Nama organisasi wajib diisi.' }
        if (!jabatan) return { error: 'Jabatan wajib diisi.' }

        const sheetConfig = userData.sheet_config as Record<string, any> | null
        const sheetName = getResumeSheetName(sheetConfig)
        const spreadsheetId = userData.spreadsheet_id

        // 1. Find insertion row using shared helper
        const targetRow = await findTableBottom(spreadsheetId, sheetName, ORGANISASI_ANCHOR)

        // 2. Get numeric sheet ID using shared helper
        const sheetId = await getSheetId(spreadsheetId, sheetName)

        // 3. Insert row + merge cells + add borders in a single batchUpdate
        const auth = getAuthClient()
        const sheets = google.sheets({ version: 'v4', auth })

        const rowIndex0 = targetRow - 1 // 0-based row for API
        const solidBorder = {
            style: 'SOLID',
            width: 1,
            color: { red: 0, green: 0, blue: 0 },
        }

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    // Insert blank row
                    {
                        insertDimension: {
                            range: {
                                sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex0,
                                endIndex: rowIndex0 + 1,
                            },
                            inheritFromBefore: true,
                        },
                    },
                    // Merge C-F for "Daftar Organisasi"
                    {
                        mergeCells: {
                            range: {
                                sheetId,
                                startRowIndex: rowIndex0,
                                endRowIndex: rowIndex0 + 1,
                                startColumnIndex: 2,  // C
                                endColumnIndex: 6,     // F+1 (exclusive)
                            },
                            mergeType: 'MERGE_ALL',
                        },
                    },
                    // Merge G-H for "Jabatan"
                    {
                        mergeCells: {
                            range: {
                                sheetId,
                                startRowIndex: rowIndex0,
                                endRowIndex: rowIndex0 + 1,
                                startColumnIndex: 6,  // G
                                endColumnIndex: 8,     // H+1 (exclusive)
                            },
                            mergeType: 'MERGE_ALL',
                        },
                    },
                    // Merge I-J for "Level"
                    {
                        mergeCells: {
                            range: {
                                sheetId,
                                startRowIndex: rowIndex0,
                                endRowIndex: rowIndex0 + 1,
                                startColumnIndex: 8,  // I
                                endColumnIndex: 10,    // J+1 (exclusive)
                            },
                            mergeType: 'MERGE_ALL',
                        },
                    },
                    // Add borders around cells B through J (skip column A)
                    {
                        updateBorders: {
                            range: {
                                sheetId,
                                startRowIndex: rowIndex0,
                                endRowIndex: rowIndex0 + 1,
                                startColumnIndex: 1,   // B (skip A)
                                endColumnIndex: 10,     // J+1 (exclusive)
                            },
                            top: solidBorder,
                            bottom: solidBorder,
                            left: solidBorder,
                            right: solidBorder,
                            innerHorizontal: solidBorder,
                            innerVertical: solidBorder,
                        },
                    },
                ],
            },
        })

        // 4. Write data: A=empty, B=tahun, C=org, D-F=empty(merge), G=jabatan, H=empty, I=level
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${sheetName}'!A${targetRow}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [['', tahun, daftarOrganisasi, '', '', '', jabatan, '', level]],
            },
        })

        // 5. Invalidate server cache
        invalidateCache(spreadsheetId)

        revalidatePath('/dashboard/awardee/pendidikan/organisasi')
        revalidatePath('/dashboard/awardee')

        return {
            success: 'Data organisasi berhasil ditambahkan! 🎉',
            newEntry: { rowIndex: targetRow, tahun, daftarOrganisasi, jabatan, level },
        }
    } catch (err: any) {
        console.error('[addOrganisasiEntry] Error:', err?.message || err)
        if (err.message?.includes('Anchor text') || err.message?.includes('tidak ditemukan')) {
            return { error: 'Tabel "Riwayat Organisasi" tidak ditemukan di sheet.' }
        }
        return { error: 'Terjadi kesalahan saat menyimpan.' }
    }
}

export async function updateOrganisasiEntry(formData: FormData): Promise<{
    success?: string; error?: string
}> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'Sesi kedaluwarsa. Login kembali.' }

        const { data: userData } = await supabase
            .from('roles_pengguna')
            .select('spreadsheet_id, sheet_config')
            .eq('email', user.email)
            .single()
        if (!userData?.spreadsheet_id) return { error: 'Spreadsheet belum dikonfigurasi.' }

        const rowIndex = parseInt(formData.get('rowIndex') as string)
        const tahun = (formData.get('tahun') as string)?.trim()
        const daftarOrganisasi = (formData.get('daftarOrganisasi') as string)?.trim()
        const jabatan = (formData.get('jabatan') as string)?.trim()
        const level = (formData.get('level') as string)?.trim() || ''

        if (!rowIndex || isNaN(rowIndex)) return { error: 'Row index tidak valid.' }
        if (!tahun) return { error: 'Tahun wajib diisi.' }
        if (!daftarOrganisasi) return { error: 'Nama organisasi wajib diisi.' }
        if (!jabatan) return { error: 'Jabatan wajib diisi.' }

        const sheetConfig = userData.sheet_config as Record<string, any> | null
        const sheetName = getResumeSheetName(sheetConfig)
        const ref = `'${sheetName}'`
        const spreadsheetId = userData.spreadsheet_id

        // Update all fields in parallel — Level is column I
        await Promise.all([
            updateSheetRow(spreadsheetId, `${ref}!B${rowIndex}`, [[tahun]]),
            updateSheetRow(spreadsheetId, `${ref}!C${rowIndex}`, [[daftarOrganisasi]]),
            updateSheetRow(spreadsheetId, `${ref}!G${rowIndex}`, [[jabatan]]),
            updateSheetRow(spreadsheetId, `${ref}!I${rowIndex}`, [[level]]),
        ])

        invalidateCache(spreadsheetId)

        revalidatePath('/dashboard/awardee/pendidikan/organisasi')
        revalidatePath('/dashboard/awardee')
        return { success: 'Data berhasil diperbarui! ✏️' }
    } catch (err: any) {
        console.error('[updateOrganisasiEntry] Error:', err?.message || err)
        return { error: 'Terjadi kesalahan saat memperbarui.' }
    }
}

export async function deleteOrganisasiEntries(rowIndices: number[]): Promise<{ success?: string; error?: string }> {
    try {
        if (!rowIndices?.length) return { error: 'Tidak ada baris yang dipilih.' }

        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'Sesi kedaluwarsa. Login kembali.' }

        const { data: userData } = await supabase
            .from('roles_pengguna')
            .select('spreadsheet_id, sheet_config')
            .eq('email', user.email)
            .single()
        if (!userData?.spreadsheet_id) return { error: 'Spreadsheet belum dikonfigurasi.' }

        const sheetConfig = userData.sheet_config as Record<string, any> | null
        const sheetName = getResumeSheetName(sheetConfig)
        const spreadsheetId = userData.spreadsheet_id

        const sheetId = await getSheetId(spreadsheetId, sheetName)

        const auth = getAuthClient()
        const sheets = google.sheets({ version: 'v4', auth })

        // Sort descending so deleting higher indices doesn't affect lower indices
        const sortedIndices = [...rowIndices].sort((a, b) => b - a)

        const requests = sortedIndices.map(rowIdx => ({
            deleteDimension: {
                range: {
                    sheetId,
                    dimension: 'ROWS',
                    startIndex: rowIdx - 1,
                    endIndex: rowIdx,
                },
            },
        }))

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: { requests },
        })

        invalidateCache(spreadsheetId)
        revalidatePath('/dashboard/awardee/pendidikan/organisasi')
        revalidatePath('/dashboard/awardee')

        return { success: `${rowIndices.length} data organisasi berhasil dihapus! 🗑️` }
    } catch (err: any) {
        console.error('[deleteOrganisasiEntries] Error:', err?.message || err)
        return { error: 'Terjadi kesalahan saat menghapus data.' }
    }
}
