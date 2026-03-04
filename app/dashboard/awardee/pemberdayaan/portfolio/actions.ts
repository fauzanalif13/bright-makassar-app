'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/utils/supabase/server'
import { getSheetData, updateSheetRow, invalidateCache, getAuthClient, getSheetId, findTableBottom } from '@/src/lib/googleSheets'
import { google } from 'googleapis'

const ANCHOR = 'Portfolio Social Project'
const DEFAULT_RESUME_SHEET = 'Resume'
const ROWS_TO_SKIP = 2
// B=tahun, C=nama(C-E), F=deskripsi(F-H), I=link(I-J)
const COL = { TAHUN: 1, NAMA: 2, DESKRIPSI: 5, LINK: 8 } as const

export type PortfolioEntry = { rowIndex: number; tahun: string; namaProject: string; deskripsi: string; linkLaporan: string }

function getSheet(cfg: Record<string, any> | null) { return cfg?.resume_sheet || DEFAULT_RESUME_SHEET }

export async function getPortfolioEntries(forceRefresh = false): Promise<{ data?: PortfolioEntry[]; error?: string }> {
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
        const entries: PortfolioEntry[] = []
        for (let i = start; i < rows.length; i++) {
            const tahun = (rows[i][COL.TAHUN]||'').trim()
            const nama = (rows[i][COL.NAMA]||'').trim()
            if (!tahun && !nama) break
            entries.push({ rowIndex: i+1, tahun, namaProject: nama, deskripsi: (rows[i][COL.DESKRIPSI]||'').trim(), linkLaporan: (rows[i][COL.LINK]||'').trim() })
        }
        return { data: entries }
    } catch (err: any) { console.error('[getPortfolioEntries]', err?.message); return { error: 'Gagal mengambil data.' } }
}

export async function addPortfolioEntry(formData: FormData): Promise<{ success?: string; error?: string; newEntry?: PortfolioEntry }> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'Sesi kedaluwarsa.' }
        const { data: u } = await supabase.from('roles_pengguna').select('spreadsheet_id, sheet_config').eq('email', user.email).single()
        if (!u?.spreadsheet_id) return { error: 'Spreadsheet belum dikonfigurasi.' }
        const tahun = (formData.get('tahun') as string)?.trim()
        const namaProject = (formData.get('namaProject') as string)?.trim()
        const deskripsi = (formData.get('deskripsi') as string)?.trim() || ''
        const linkLaporan = (formData.get('linkLaporan') as string)?.trim() || ''
        if (!tahun) return { error: 'Tahun wajib diisi.' }
        if (!namaProject) return { error: 'Nama project wajib diisi.' }
        const sheetName = getSheet(u.sheet_config as any)
        const sid = u.spreadsheet_id
        const targetRow = await findTableBottom(sid, sheetName, ANCHOR)
        const sheetId = await getSheetId(sid, sheetName)
        const auth = getAuthClient()
        const sheets = google.sheets({ version: 'v4', auth })
        const r0 = targetRow - 1
        const border = { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } }
        // Portfolio custom merges: C-E (nama), F-H (deskripsi), I-J (link)
        await sheets.spreadsheets.batchUpdate({ spreadsheetId: sid, requestBody: { requests: [
            { insertDimension: { range: { sheetId, dimension: 'ROWS', startIndex: r0, endIndex: r0+1 }, inheritFromBefore: true } },
            { mergeCells: { range: { sheetId, startRowIndex: r0, endRowIndex: r0+1, startColumnIndex: 2, endColumnIndex: 5 }, mergeType: 'MERGE_ALL' } },
            { mergeCells: { range: { sheetId, startRowIndex: r0, endRowIndex: r0+1, startColumnIndex: 5, endColumnIndex: 8 }, mergeType: 'MERGE_ALL' } },
            { mergeCells: { range: { sheetId, startRowIndex: r0, endRowIndex: r0+1, startColumnIndex: 8, endColumnIndex: 10 }, mergeType: 'MERGE_ALL' } },
            { updateBorders: { range: { sheetId, startRowIndex: r0, endRowIndex: r0+1, startColumnIndex: 1, endColumnIndex: 10 }, top: border, bottom: border, left: border, right: border, innerHorizontal: border, innerVertical: border } },
        ] } })
        await sheets.spreadsheets.values.update({ spreadsheetId: sid, range: `'${sheetName}'!A${targetRow}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [['', tahun, namaProject, '', '', deskripsi, '', '', linkLaporan]] } })
        invalidateCache(sid)
        revalidatePath('/dashboard/awardee/pemberdayaan/portfolio')
        revalidatePath('/dashboard/awardee')
        return { success: 'Data portfolio berhasil ditambahkan! 🎉', newEntry: { rowIndex: targetRow, tahun, namaProject, deskripsi, linkLaporan } }
    } catch (err: any) { console.error('[addPortfolioEntry]', err?.message); return { error: err.message?.includes('Anchor') ? 'Tabel tidak ditemukan.' : 'Gagal menyimpan.' } }
}

export async function updatePortfolioEntry(formData: FormData): Promise<{ success?: string; error?: string }> {
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
            updateSheetRow(u.spreadsheet_id, `${ref}!B${ri}`, [[(formData.get('tahun') as string)?.trim()||'']]),
            updateSheetRow(u.spreadsheet_id, `${ref}!C${ri}`, [[(formData.get('namaProject') as string)?.trim()||'']]),
            updateSheetRow(u.spreadsheet_id, `${ref}!F${ri}`, [[(formData.get('deskripsi') as string)?.trim()||'']]),
            updateSheetRow(u.spreadsheet_id, `${ref}!I${ri}`, [[(formData.get('linkLaporan') as string)?.trim()||'']]),
        ])
        invalidateCache(u.spreadsheet_id)
        revalidatePath('/dashboard/awardee/pemberdayaan/portfolio')
        return { success: 'Data berhasil diperbarui! ✏️' }
    } catch (err: any) { console.error('[updatePortfolioEntry]', err?.message); return { error: 'Gagal memperbarui.' } }
}

export async function deletePortfolioEntries(rowIndices: number[]): Promise<{ success?: string; error?: string }> {
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
        revalidatePath('/dashboard/awardee/pemberdayaan/portfolio')
        return { success: `${rowIndices.length} data berhasil dihapus! 🗑️` }
    } catch (err: any) { console.error('[deletePortfolioEntries]', err?.message); return { error: 'Gagal menghapus.' } }
}
