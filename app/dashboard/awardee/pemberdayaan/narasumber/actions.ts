'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/utils/supabase/server'
import { getSheetData, updateSheetRow, invalidateCache, getAuthClient, getSheetId, findTableBottom } from '@/src/lib/googleSheets'
import { google } from 'googleapis'

const ANCHOR = 'Narasumber Pembinaan Awardee Scholarship'
const DEFAULT_RESUME_SHEET = 'Resume'
const ROWS_TO_SKIP = 2
// B=tgl, C=judul(C-E), F=teknis, G=peserta, H=jumlah, I=link(I-J)
const COL = { TANGGAL: 1, JUDUL: 2, TEKNIS: 5, PESERTA: 6, JUMLAH: 7, LINK: 8 } as const

export type NarasumberEntry = { rowIndex: number; tanggal: string; judulMateri: string; teknis: string; peserta: string; jumlah: string; linkDokumentasi: string }

function getSheet(cfg: Record<string, any> | null) { return cfg?.resume_sheet || DEFAULT_RESUME_SHEET }

export async function getNarasumberEntries(forceRefresh = false): Promise<{ data?: NarasumberEntry[]; error?: string }> {
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
        const entries: NarasumberEntry[] = []
        for (let i = start; i < rows.length; i++) {
            const tanggal = (rows[i][COL.TANGGAL]||'').trim()
            const judul = (rows[i][COL.JUDUL]||'').trim()
            if (!tanggal && !judul) break
            entries.push({ rowIndex: i+1, tanggal, judulMateri: judul, teknis: (rows[i][COL.TEKNIS]||'').trim(), peserta: (rows[i][COL.PESERTA]||'').trim(), jumlah: (rows[i][COL.JUMLAH]||'').trim(), linkDokumentasi: (rows[i][COL.LINK]||'').trim() })
        }
        return { data: entries }
    } catch (err: any) { console.error('[getNarasumberEntries]', err?.message); return { error: 'Gagal mengambil data.' } }
}

export async function addNarasumberEntry(formData: FormData): Promise<{ success?: string; error?: string; newEntry?: NarasumberEntry }> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'Sesi kedaluwarsa.' }
        const { data: u } = await supabase.from('roles_pengguna').select('spreadsheet_id, sheet_config').eq('email', user.email).single()
        if (!u?.spreadsheet_id) return { error: 'Spreadsheet belum dikonfigurasi.' }
        const tanggal = (formData.get('tanggal') as string)?.trim()
        const judulMateri = (formData.get('judulMateri') as string)?.trim()
        const teknis = (formData.get('teknis') as string)?.trim() || ''
        const peserta = (formData.get('peserta') as string)?.trim() || ''
        const jumlah = (formData.get('jumlah') as string)?.trim() || ''
        const linkDokumentasi = (formData.get('linkDokumentasi') as string)?.trim() || ''
        if (!tanggal) return { error: 'Tanggal wajib diisi.' }
        if (!judulMateri) return { error: 'Judul materi wajib diisi.' }
        const sheetName = getSheet(u.sheet_config as any)
        const sid = u.spreadsheet_id
        const targetRow = await findTableBottom(sid, sheetName, ANCHOR)
        const sheetId = await getSheetId(sid, sheetName)
        const auth = getAuthClient()
        const sheets = google.sheets({ version: 'v4', auth })
        const r0 = targetRow - 1
        const border = { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } }
        // Narasumber merges: C-E (judul), I-J (link); F,G,H are individual
        await sheets.spreadsheets.batchUpdate({ spreadsheetId: sid, requestBody: { requests: [
            { insertDimension: { range: { sheetId, dimension: 'ROWS', startIndex: r0, endIndex: r0+1 }, inheritFromBefore: true } },
            { mergeCells: { range: { sheetId, startRowIndex: r0, endRowIndex: r0+1, startColumnIndex: 2, endColumnIndex: 5 }, mergeType: 'MERGE_ALL' } },
            { mergeCells: { range: { sheetId, startRowIndex: r0, endRowIndex: r0+1, startColumnIndex: 8, endColumnIndex: 10 }, mergeType: 'MERGE_ALL' } },
            { updateBorders: { range: { sheetId, startRowIndex: r0, endRowIndex: r0+1, startColumnIndex: 1, endColumnIndex: 10 }, top: border, bottom: border, left: border, right: border, innerHorizontal: border, innerVertical: border } },
        ] } })
        // A=empty, B=tgl, C=judul, D=empty, E=empty, F=teknis, G=peserta, H=jumlah, I=link
        await sheets.spreadsheets.values.update({ spreadsheetId: sid, range: `'${sheetName}'!A${targetRow}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [['', tanggal, judulMateri, '', '', teknis, peserta, jumlah, linkDokumentasi]] } })
        invalidateCache(sid)
        revalidatePath('/dashboard/awardee/pemberdayaan/narasumber')
        revalidatePath('/dashboard/awardee')
        return { success: 'Data narasumber berhasil ditambahkan! 🎉', newEntry: { rowIndex: targetRow, tanggal, judulMateri, teknis, peserta, jumlah, linkDokumentasi } }
    } catch (err: any) { console.error('[addNarasumberEntry]', err?.message); return { error: err.message?.includes('Anchor') ? 'Tabel tidak ditemukan.' : 'Gagal menyimpan.' } }
}

export async function updateNarasumberEntry(formData: FormData): Promise<{ success?: string; error?: string }> {
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
            updateSheetRow(u.spreadsheet_id, `${ref}!C${ri}`, [[(formData.get('judulMateri') as string)?.trim()||'']]),
            updateSheetRow(u.spreadsheet_id, `${ref}!F${ri}`, [[(formData.get('teknis') as string)?.trim()||'']]),
            updateSheetRow(u.spreadsheet_id, `${ref}!G${ri}`, [[(formData.get('peserta') as string)?.trim()||'']]),
            updateSheetRow(u.spreadsheet_id, `${ref}!H${ri}`, [[(formData.get('jumlah') as string)?.trim()||'']]),
            updateSheetRow(u.spreadsheet_id, `${ref}!I${ri}`, [[(formData.get('linkDokumentasi') as string)?.trim()||'']]),
        ])
        invalidateCache(u.spreadsheet_id)
        revalidatePath('/dashboard/awardee/pemberdayaan/narasumber')
        return { success: 'Data berhasil diperbarui! ✏️' }
    } catch (err: any) { console.error('[updateNarasumberEntry]', err?.message); return { error: 'Gagal memperbarui.' } }
}

export async function deleteNarasumberEntries(rowIndices: number[]): Promise<{ success?: string; error?: string }> {
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
        revalidatePath('/dashboard/awardee/pemberdayaan/narasumber')
        return { success: `${rowIndices.length} data berhasil dihapus! 🗑️` }
    } catch (err: any) { console.error('[deleteNarasumberEntries]', err?.message); return { error: 'Gagal menghapus.' } }
}
