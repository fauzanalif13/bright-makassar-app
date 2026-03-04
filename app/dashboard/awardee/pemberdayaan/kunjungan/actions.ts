'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/utils/supabase/server'
import { getSheetData, updateSheetRow, invalidateCache, getAuthClient, getSheetId, findTableBottom } from '@/src/lib/googleSheets'
import { google } from 'googleapis'

const ANCHOR = 'Kunjungan ke Titik Program YBM BRILiaN'
const DEFAULT_RESUME_SHEET = 'Resume'
const ROWS_TO_SKIP = 2
// B=semester, C=tgl, D=lokasi, E=kunjungan(E-H), I=link(I-J)
const COL = { SEMESTER: 1, TANGGAL: 2, LOKASI: 3, KUNJUNGAN: 4, LINK: 8 } as const

export type KunjunganEntry = { rowIndex: number; semester: string; tanggal: string; lokasi: string; daftarKunjungan: string; linkLaporan: string }

function getSheet(cfg: Record<string, any> | null) { return cfg?.resume_sheet || DEFAULT_RESUME_SHEET }

export async function getKunjunganEntries(forceRefresh = false): Promise<{ data?: KunjunganEntry[]; error?: string }> {
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
        for (let i = 0; i < rows.length && ai === -1; i++) { if ((rows[i][1] || '').trim().toLowerCase() === norm) ai = i }
        for (let i = 0; i < rows.length && ai === -1; i++) { if ((rows[i][0] || '').trim().toLowerCase() === norm) ai = i }
        for (let i = 0; i < rows.length && ai === -1; i++) { if ((rows[i][2] || '').trim().toLowerCase() === norm) ai = i }
        if (ai === -1) return { data: [] }
        const start = ai + 1 + ROWS_TO_SKIP
        const entries: KunjunganEntry[] = []
        let currentSemester = ''
        for (let i = start; i < rows.length; i++) {
            const a = (rows[i][0] || '').trim()
            const sem = (rows[i][COL.SEMESTER] || '').trim()
            const tanggal = (rows[i][COL.TANGGAL] || '').trim()
            const kunjungan = (rows[i][COL.KUNJUNGAN] || '').trim()
            if (a && isNaN(Number(a))) break
            if (sem && isNaN(Number(sem)) && !sem.includes('/')) break
            if (sem && !isNaN(Number(sem))) currentSemester = sem
            if (!tanggal && !kunjungan) continue
            entries.push({ rowIndex: i + 1, semester: currentSemester, tanggal, lokasi: (rows[i][COL.LOKASI] || '').trim(), daftarKunjungan: kunjungan, linkLaporan: (rows[i][COL.LINK] || '').trim() })
        }
        return { data: entries }
    } catch (err: any) { console.error('[getKunjunganEntries]', err?.message); return { error: 'Gagal mengambil data.' } }
}

export async function addKunjunganEntry(formData: FormData): Promise<{ success?: string; error?: string; newEntry?: KunjunganEntry }> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'Sesi kedaluwarsa.' }
        const { data: u } = await supabase.from('roles_pengguna').select('spreadsheet_id, sheet_config').eq('email', user.email).single()
        if (!u?.spreadsheet_id) return { error: 'Spreadsheet belum dikonfigurasi.' }
        const semester = (formData.get('semester') as string)?.trim() || ''
        const tanggal = (formData.get('tanggal') as string)?.trim()
        const lokasi = (formData.get('lokasi') as string)?.trim() || ''
        const daftarKunjungan = (formData.get('daftarKunjungan') as string)?.trim()
        const linkLaporan = (formData.get('linkLaporan') as string)?.trim() || ''
        if (!tanggal) return { error: 'Tanggal wajib diisi.' }
        if (!daftarKunjungan) return { error: 'Daftar kunjungan wajib diisi.' }
        const sheetName = getSheet(u.sheet_config as any)
        const sid = u.spreadsheet_id
        const targetRow = await findTableBottom(sid, sheetName, ANCHOR)
        const sheetId = await getSheetId(sid, sheetName)
        const auth = getAuthClient()
        const sheets = google.sheets({ version: 'v4', auth })
        const r0 = targetRow - 1
        const border = { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } }
        // Kunjungan custom merges: E-H (kunjungan), I-J (link)
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sid, requestBody: {
                requests: [
                    { insertDimension: { range: { sheetId, dimension: 'ROWS', startIndex: r0, endIndex: r0 + 1 }, inheritFromBefore: true } },
                    { mergeCells: { range: { sheetId, startRowIndex: r0, endRowIndex: r0 + 1, startColumnIndex: 4, endColumnIndex: 8 }, mergeType: 'MERGE_ALL' } },
                    { mergeCells: { range: { sheetId, startRowIndex: r0, endRowIndex: r0 + 1, startColumnIndex: 8, endColumnIndex: 10 }, mergeType: 'MERGE_ALL' } },
                    { updateBorders: { range: { sheetId, startRowIndex: r0, endRowIndex: r0 + 1, startColumnIndex: 1, endColumnIndex: 10 }, top: border, bottom: border, left: border, right: border, innerHorizontal: border, innerVertical: border } },
                ]
            }
        })
        await sheets.spreadsheets.values.update({ spreadsheetId: sid, range: `'${sheetName}'!A${targetRow}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [['', semester, tanggal, lokasi, daftarKunjungan, '', '', '', linkLaporan]] } })
        invalidateCache(sid)
        revalidatePath('/dashboard/awardee/pemberdayaan/kunjungan')
        revalidatePath('/dashboard/awardee')
        return { success: 'Data kunjungan berhasil ditambahkan! 🎉', newEntry: { rowIndex: targetRow, semester, tanggal, lokasi, daftarKunjungan, linkLaporan } }
    } catch (err: any) { console.error('[addKunjunganEntry]', err?.message); return { error: err.message?.includes('Anchor') ? 'Tabel tidak ditemukan.' : 'Gagal menyimpan.' } }
}

export async function updateKunjunganEntry(formData: FormData): Promise<{ success?: string; error?: string }> {
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
            updateSheetRow(u.spreadsheet_id, `${ref}!B${ri}`, [[(formData.get('semester') as string)?.trim() || '']]),
            updateSheetRow(u.spreadsheet_id, `${ref}!C${ri}`, [[(formData.get('tanggal') as string)?.trim() || '']]),
            updateSheetRow(u.spreadsheet_id, `${ref}!D${ri}`, [[(formData.get('lokasi') as string)?.trim() || '']]),
            updateSheetRow(u.spreadsheet_id, `${ref}!E${ri}`, [[(formData.get('daftarKunjungan') as string)?.trim() || '']]),
            updateSheetRow(u.spreadsheet_id, `${ref}!I${ri}`, [[(formData.get('linkLaporan') as string)?.trim() || '']]),
        ])
        invalidateCache(u.spreadsheet_id)
        revalidatePath('/dashboard/awardee/pemberdayaan/kunjungan')
        return { success: 'Data berhasil diperbarui! ✏️' }
    } catch (err: any) { console.error('[updateKunjunganEntry]', err?.message); return { error: 'Gagal memperbarui.' } }
}

export async function deleteKunjunganEntries(rowIndices: number[]): Promise<{ success?: string; error?: string }> {
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
        const sorted = [...rowIndices].sort((a, b) => b - a)
        await sheets.spreadsheets.batchUpdate({ spreadsheetId: u.spreadsheet_id, requestBody: { requests: sorted.map(r => ({ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: r - 1, endIndex: r } } })) } })
        invalidateCache(u.spreadsheet_id)
        revalidatePath('/dashboard/awardee/pemberdayaan/kunjungan')
        return { success: `${rowIndices.length} data berhasil dihapus! 🗑️` }
    } catch (err: any) { console.error('[deleteKunjunganEntries]', err?.message); return { error: 'Gagal menghapus.' } }
}
