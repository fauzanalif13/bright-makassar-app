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

const ANCHOR = 'Pembinaan S/H Skills'
const DEFAULT_RESUME_SHEET = 'Resume'
const ROWS_TO_SKIP = 2
const COL = { TANGGAL: 1, TEMA: 2, NARASUMBER: 6, LINK: 9 } as const

export type PembinaanEntry = {
    rowIndex: number
    tanggal: string
    tema: string
    narasumber: string
    linkResume: string
}

function getSheet(cfg: Record<string, any> | null) { return cfg?.resume_sheet || DEFAULT_RESUME_SHEET }

export async function getPembinaanEntries(forceRefresh = false): Promise<{ data?: PembinaanEntry[]; error?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'Sesi kedaluwarsa.' }
        const { data: u } = await supabase.from('roles_pengguna').select('spreadsheet_id, sheet_config').eq('email', user.email).single()
        if (!u?.spreadsheet_id) return { error: 'Spreadsheet belum dikonfigurasi.' }
        if (forceRefresh) invalidateCache(u.spreadsheet_id)
        const sheetName = getSheet(u.sheet_config as any)
        const rows = await getSheetData(u.spreadsheet_id, `'${sheetName}'!A:K`)
        const norm = ANCHOR.trim().toLowerCase()
        let ai = -1
        for (let i = 0; i < rows.length; i++) { if ((rows[i][0]||'').trim().toLowerCase() === norm || (rows[i][1]||'').trim().toLowerCase() === norm) { ai = i; break } }
        if (ai === -1) return { data: [] }
        const start = ai + 1 + ROWS_TO_SKIP
        const entries: PembinaanEntry[] = []
        for (let i = start; i < rows.length; i++) {
            const tanggal = (rows[i][COL.TANGGAL]||'').trim()
            const tema = (rows[i][COL.TEMA]||'').trim()
            if (!tanggal && !tema) break
            entries.push({ rowIndex: i+1, tanggal, tema, narasumber: (rows[i][COL.NARASUMBER]||'').trim(), linkResume: (rows[i][COL.LINK]||'').trim() })
        }
        return { data: entries }
    } catch (err: any) { console.error('[getPembinaanEntries]', err?.message); return { error: 'Gagal mengambil data.' } }
}

export async function addPembinaanEntry(formData: FormData): Promise<{ success?: string; error?: string; newEntry?: PembinaanEntry }> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'Sesi kedaluwarsa.' }
        const { data: u } = await supabase.from('roles_pengguna').select('spreadsheet_id, sheet_config').eq('email', user.email).single()
        if (!u?.spreadsheet_id) return { error: 'Spreadsheet belum dikonfigurasi.' }
        const tanggal = (formData.get('tanggal') as string)?.trim()
        const tema = (formData.get('tema') as string)?.trim()
        const narasumber = (formData.get('narasumber') as string)?.trim()
        const linkResume = (formData.get('linkResume') as string)?.trim() || ''
        if (!tanggal) return { error: 'Tanggal wajib diisi.' }
        if (!tema) return { error: 'Tema wajib diisi.' }
        if (!narasumber) return { error: 'Narasumber wajib diisi.' }
        const sheetName = getSheet(u.sheet_config as any)
        const sid = u.spreadsheet_id
        const targetRow = await findTableBottom(sid, sheetName, ANCHOR)
        const sheetId = await getSheetId(sid, sheetName)
        const auth = getAuthClient()
        const sheets = google.sheets({ version: 'v4', auth })
        const r0 = targetRow - 1
        const border = { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } }
        await sheets.spreadsheets.batchUpdate({ spreadsheetId: sid, requestBody: { requests: [
            { insertDimension: { range: { sheetId, dimension: 'ROWS', startIndex: r0, endIndex: r0+1 }, inheritFromBefore: true } },
            { mergeCells: { range: { sheetId, startRowIndex: r0, endRowIndex: r0+1, startColumnIndex: 2, endColumnIndex: 6 }, mergeType: 'MERGE_ALL' } },
            { mergeCells: { range: { sheetId, startRowIndex: r0, endRowIndex: r0+1, startColumnIndex: 6, endColumnIndex: 8 }, mergeType: 'MERGE_ALL' } },
            { mergeCells: { range: { sheetId, startRowIndex: r0, endRowIndex: r0+1, startColumnIndex: 8, endColumnIndex: 10 }, mergeType: 'MERGE_ALL' } },
            { updateBorders: { range: { sheetId, startRowIndex: r0, endRowIndex: r0+1, startColumnIndex: 1, endColumnIndex: 10 }, top: border, bottom: border, left: border, right: border, innerHorizontal: border, innerVertical: border } },
        ] } })
        await sheets.spreadsheets.values.update({ spreadsheetId: sid, range: `'${sheetName}'!A${targetRow}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [['', tanggal, tema, '', '', '', narasumber, '', '', linkResume]] } })
        invalidateCache(sid)
        revalidatePath('/dashboard/awardee/pendidikan/pembinaan')
        revalidatePath('/dashboard/awardee')
        return { success: 'Data pembinaan berhasil ditambahkan! 🎉', newEntry: { rowIndex: targetRow, tanggal, tema, narasumber, linkResume } }
    } catch (err: any) { console.error('[addPembinaanEntry]', err?.message); return { error: err.message?.includes('Anchor') ? 'Tabel tidak ditemukan.' : 'Gagal menyimpan.' } }
}

export async function updatePembinaanEntry(formData: FormData): Promise<{ success?: string; error?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'Sesi kedaluwarsa.' }
        const { data: u } = await supabase.from('roles_pengguna').select('spreadsheet_id, sheet_config').eq('email', user.email).single()
        if (!u?.spreadsheet_id) return { error: 'Spreadsheet belum dikonfigurasi.' }
        const ri = parseInt(formData.get('rowIndex') as string)
        if (!ri || isNaN(ri)) return { error: 'Row index tidak valid.' }
        const ref = `'${getSheet(u.sheet_config as any)}'`
        await Promise.all([
            updateSheetRow(u.spreadsheet_id, `${ref}!B${ri}`, [[(formData.get('tanggal') as string)?.trim()||'']]),
            updateSheetRow(u.spreadsheet_id, `${ref}!C${ri}`, [[(formData.get('tema') as string)?.trim()||'']]),
            updateSheetRow(u.spreadsheet_id, `${ref}!G${ri}`, [[(formData.get('narasumber') as string)?.trim()||'']]),
            updateSheetRow(u.spreadsheet_id, `${ref}!J${ri}`, [[(formData.get('linkResume') as string)?.trim()||'']]),
        ])
        invalidateCache(u.spreadsheet_id)
        revalidatePath('/dashboard/awardee/pendidikan/pembinaan')
        return { success: 'Data berhasil diperbarui! ✏️' }
    } catch (err: any) { console.error('[updatePembinaanEntry]', err?.message); return { error: 'Gagal memperbarui.' } }
}

export async function deletePembinaanEntries(rowIndices: number[]): Promise<{ success?: string; error?: string }> {
    try {
        if (!rowIndices?.length) return { error: 'Tidak ada baris dipilih.' }
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'Sesi kedaluwarsa.' }
        const { data: u } = await supabase.from('roles_pengguna').select('spreadsheet_id, sheet_config').eq('email', user.email).single()
        if (!u?.spreadsheet_id) return { error: 'Spreadsheet belum dikonfigurasi.' }
        const sheetId = await getSheetId(u.spreadsheet_id, getSheet(u.sheet_config as any))
        const auth = getAuthClient()
        const sheets = google.sheets({ version: 'v4', auth })
        const sorted = [...rowIndices].sort((a,b) => b-a)
        await sheets.spreadsheets.batchUpdate({ spreadsheetId: u.spreadsheet_id, requestBody: { requests: sorted.map(r => ({ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: r-1, endIndex: r } } })) } })
        invalidateCache(u.spreadsheet_id)
        revalidatePath('/dashboard/awardee/pendidikan/pembinaan')
        return { success: `${rowIndices.length} data berhasil dihapus! 🗑️` }
    } catch (err: any) { console.error('[deletePembinaanEntries]', err?.message); return { error: 'Gagal menghapus.' } }
}
