'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/utils/supabase/server'
import { getSheetData, updateSheetRow, invalidateCache, getAuthClient, getSheetId, findTableBottom } from '@/src/lib/googleSheets'
import { google } from 'googleapis'

const ANCHOR = 'Riwayat Prestasi'
const DEFAULT_RESUME_SHEET = 'Resume'
const ROWS_TO_SKIP = 2
const COL = { TANGGAL: 1, PRESTASI: 2, PENYELENGGARA: 6, LEVEL: 9 } as const

export type PrestasiEntry = { rowIndex: number; tanggal: string; daftarPrestasi: string; penyelenggara: string; level: string }

const BULAN_INDONESIA = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function formatIndonesianDate(dateStr: string) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const [year, month, day] = dateStr.split('-');
    return `${parseInt(day)} ${BULAN_INDONESIA[parseInt(month) - 1]} ${year}`;
}

function getSheet(cfg: Record<string, any> | null) { return cfg?.resume_sheet || DEFAULT_RESUME_SHEET }

export async function getPrestasiEntries(forceRefresh = false): Promise<{ data?: PrestasiEntry[]; error?: string }> {
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
        const entries: PrestasiEntry[] = []
        for (let i = start; i < rows.length; i++) {
            const tanggal = (rows[i][COL.TANGGAL] || '').trim()
            const prestasi = (rows[i][COL.PRESTASI] || '').trim()
            if (!tanggal && !prestasi) break
            entries.push({ rowIndex: i + 1, tanggal, daftarPrestasi: prestasi, penyelenggara: (rows[i][COL.PENYELENGGARA] || '').trim(), level: (rows[i][COL.LEVEL] || '').trim() })
        }
        return { data: entries }
    } catch (err: any) { console.error('[getPrestasiEntries]', err?.message); return { error: 'Gagal mengambil data.' } }
}

export async function addPrestasiEntry(formData: FormData): Promise<{ success?: string; error?: string; newEntry?: PrestasiEntry }> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'Sesi kedaluwarsa.' }
        const { data: u } = await supabase.from('roles_pengguna').select('spreadsheet_id, sheet_config').eq('email', user.email).single()
        if (!u?.spreadsheet_id) return { error: 'Spreadsheet belum dikonfigurasi.' }
        const rawTanggal = (formData.get('tanggal') as string)?.trim() || ''
        const tanggal = formatIndonesianDate(rawTanggal)
        const daftarPrestasi = (formData.get('daftarPrestasi') as string)?.trim()
        const penyelenggara = (formData.get('penyelenggara') as string)?.trim() || ''
        const level = (formData.get('level') as string)?.trim() || ''
        if (!tanggal) return { error: 'Tanggal wajib diisi.' }
        if (!daftarPrestasi) return { error: 'Nama prestasi wajib diisi.' }
        const sheetName = getSheet(u.sheet_config as any)
        const sid = u.spreadsheet_id
        const targetRow = await findTableBottom(sid, sheetName, ANCHOR)
        const sheetId = await getSheetId(sid, sheetName)
        const auth = getAuthClient()
        const sheets = google.sheets({ version: 'v4', auth })
        const r0 = targetRow - 1
        const border = { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } }
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sid, requestBody: {
                requests: [
                    { insertDimension: { range: { sheetId, dimension: 'ROWS', startIndex: r0, endIndex: r0 + 1 }, inheritFromBefore: true } },
                    { mergeCells: { range: { sheetId, startRowIndex: r0, endRowIndex: r0 + 1, startColumnIndex: 2, endColumnIndex: 6 }, mergeType: 'MERGE_ALL' } },
                    { mergeCells: { range: { sheetId, startRowIndex: r0, endRowIndex: r0 + 1, startColumnIndex: 6, endColumnIndex: 8 }, mergeType: 'MERGE_ALL' } },
                    { mergeCells: { range: { sheetId, startRowIndex: r0, endRowIndex: r0 + 1, startColumnIndex: 8, endColumnIndex: 10 }, mergeType: 'MERGE_ALL' } },
                    { updateBorders: { range: { sheetId, startRowIndex: r0, endRowIndex: r0 + 1, startColumnIndex: 1, endColumnIndex: 10 }, top: border, bottom: border, left: border, right: border, innerHorizontal: border, innerVertical: border } },
                ]
            }
        })
        await sheets.spreadsheets.values.update({ spreadsheetId: sid, range: `'${sheetName}'!A${targetRow}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [['', tanggal, daftarPrestasi, '', '', '', penyelenggara, '', '', level]] } })
        invalidateCache(sid)
        revalidatePath('/dashboard/awardee/pendidikan/prestasi')
        revalidatePath('/dashboard/awardee')
        return { success: 'Data prestasi berhasil ditambahkan! 🎉', newEntry: { rowIndex: targetRow, tanggal, daftarPrestasi, penyelenggara, level } }
    } catch (err: any) { console.error('[addPrestasiEntry]', err?.message); return { error: err.message?.includes('Anchor') ? 'Tabel tidak ditemukan.' : 'Gagal menyimpan.' } }
}

export async function updatePrestasiEntry(formData: FormData): Promise<{ success?: string; error?: string }> {
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
            updateSheetRow(u.spreadsheet_id, `${ref}!B${ri}`, [[formatIndonesianDate((formData.get('tanggal') as string)?.trim() || '')]]),
            updateSheetRow(u.spreadsheet_id, `${ref}!C${ri}`, [[(formData.get('daftarPrestasi') as string)?.trim() || '']]),
            updateSheetRow(u.spreadsheet_id, `${ref}!G${ri}`, [[(formData.get('penyelenggara') as string)?.trim() || '']]),
            updateSheetRow(u.spreadsheet_id, `${ref}!J${ri}`, [[(formData.get('level') as string)?.trim() || '']]),
        ])
        invalidateCache(u.spreadsheet_id)
        revalidatePath('/dashboard/awardee/pendidikan/prestasi')
        return { success: 'Data berhasil diperbarui! ✏️' }
    } catch (err: any) { console.error('[updatePrestasiEntry]', err?.message); return { error: 'Gagal memperbarui.' } }
}

export async function deletePrestasiEntries(rowIndices: number[]): Promise<{ success?: string; error?: string }> {
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
        revalidatePath('/dashboard/awardee/pendidikan/prestasi')
        return { success: `${rowIndices.length} data berhasil dihapus! 🗑️` }
    } catch (err: any) { console.error('[deletePrestasiEntries]', err?.message); return { error: 'Gagal menghapus.' } }
}
