'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/utils/supabase/server'
import { getSheetData, insertAndWriteResumeData, updateSheetRow } from '@/src/lib/googleSheets'

// ─── Constants ───────────────────────────────────────────────────────

/** Use the FULL anchor text from the spreadsheet for exact match */
const WORKSHOP_ANCHOR = 'Riwayat Workshop/Seminar/Training/Sejenisnya'
const DEFAULT_RESUME_SHEET = 'Resume'
const ROWS_TO_SKIP_AFTER_ANCHOR = 2

/**
 * Explicit column indices (0-based).
 * B (1) = Tgl/Bln/Th
 * C-F (2) = Daftar Kegiatan (merged)
 * G (6) = Status (dropdown: Peserta, Pemateri, etc.)
 * I (8) = Level
 */
const COL = { TANGGAL: 1, KEGIATAN: 2, STATUS: 6, LEVEL: 8 } as const

// Status & level options are defined in page.tsx (can't export non-functions from 'use server')

// ─── Types ───────────────────────────────────────────────────────────

export type WorkshopEntry = {
    rowIndex: number
    tanggal: string
    daftarKegiatan: string
    status: string
    level: string
}



// ─── Helpers ─────────────────────────────────────────────────────────

function getResumeSheetName(sheetConfig: Record<string, any> | null): string {
    return sheetConfig?.resume_sheet || DEFAULT_RESUME_SHEET
}

// ─── Server Actions ──────────────────────────────────────────────────

export async function getWorkshopEntries(): Promise<{
    data?: WorkshopEntry[]
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

        const sheetConfig = userData.sheet_config as Record<string, any> | null
        const sheetName = getResumeSheetName(sheetConfig)
        const rows = await getSheetData(userData.spreadsheet_id, `'${sheetName}'!A:K`)

        const normalizedAnchor = WORKSHOP_ANCHOR.trim().toLowerCase()
        let anchorIdx = -1
        for (let i = 0; i < rows.length; i++) {
            const cellA = (rows[i][0] || '').trim().toLowerCase()
            const cellB = (rows[i][1] || '').trim().toLowerCase()
            if (cellA === normalizedAnchor || cellB === normalizedAnchor) { anchorIdx = i; break }
        }

        if (anchorIdx === -1) return { data: [] }

        const dataStart = anchorIdx + 1 + ROWS_TO_SKIP_AFTER_ANCHOR
        const entries: WorkshopEntry[] = []

        for (let i = dataStart; i < rows.length; i++) {
            const tanggal = (rows[i][COL.TANGGAL] || '').trim()
            const kegiatan = (rows[i][COL.KEGIATAN] || '').trim()
            if (!tanggal && !kegiatan) break
            entries.push({
                rowIndex: i + 1,
                tanggal,
                daftarKegiatan: kegiatan,
                status: (rows[i][COL.STATUS] || '').trim(),
                level: (rows[i][COL.LEVEL] || '').trim(),
            })
        }

        return { data: entries }
    } catch (err) {
        console.error('[getWorkshopEntries] Error:', err)
        return { error: 'Gagal mengambil data workshop.' }
    }
}

export async function addWorkshopEntry(formData: FormData): Promise<{
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

        const tanggal = (formData.get('tanggal') as string)?.trim()
        const daftarKegiatan = (formData.get('daftarKegiatan') as string)?.trim()
        const status = (formData.get('status') as string)?.trim() || ''
        const level = (formData.get('level') as string)?.trim() || ''

        if (!tanggal) return { error: 'Tanggal wajib diisi.' }
        if (!daftarKegiatan) return { error: 'Nama kegiatan wajib diisi.' }

        const sheetConfig = userData.sheet_config as Record<string, any> | null
        const sheetName = getResumeSheetName(sheetConfig)

        // A=empty, B=tanggal, C=kegiatan, D-F=empty(merge), G=status, H=empty, I=level
        await insertAndWriteResumeData(
            userData.spreadsheet_id, sheetName, WORKSHOP_ANCHOR,
            ['', tanggal, daftarKegiatan, '', '', '', status, '', level]
        )

        revalidatePath('/dashboard/awardee/pendidikan/workshop')
        revalidatePath('/dashboard/awardee')
        return { success: 'Data workshop berhasil ditambahkan! 🎉' }
    } catch (err: any) {
        console.error('[addWorkshopEntry] Error:', err.message)
        if (err.message?.includes('Anchor text')) return { error: 'Tabel "Riwayat Workshop" tidak ditemukan.' }
        return { error: 'Terjadi kesalahan saat menyimpan.' }
    }
}

export async function updateWorkshopEntry(formData: FormData): Promise<{
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
        const tanggal = (formData.get('tanggal') as string)?.trim()
        const daftarKegiatan = (formData.get('daftarKegiatan') as string)?.trim()
        const status = (formData.get('status') as string)?.trim() || ''
        const level = (formData.get('level') as string)?.trim() || ''

        if (!rowIndex || isNaN(rowIndex)) return { error: 'Row index tidak valid.' }
        if (!tanggal) return { error: 'Tanggal wajib diisi.' }
        if (!daftarKegiatan) return { error: 'Nama kegiatan wajib diisi.' }

        const sheetConfig = userData.sheet_config as Record<string, any> | null
        const sheetName = getResumeSheetName(sheetConfig)
        const ref = `'${sheetName}'`

        await updateSheetRow(userData.spreadsheet_id, `${ref}!B${rowIndex}`, [[tanggal]])
        await updateSheetRow(userData.spreadsheet_id, `${ref}!C${rowIndex}`, [[daftarKegiatan]])
        await updateSheetRow(userData.spreadsheet_id, `${ref}!G${rowIndex}`, [[status]])
        await updateSheetRow(userData.spreadsheet_id, `${ref}!I${rowIndex}`, [[level]])

        revalidatePath('/dashboard/awardee/pendidikan/workshop')
        revalidatePath('/dashboard/awardee')
        return { success: 'Data berhasil diperbarui! ✏️' }
    } catch (err: any) {
        console.error('[updateWorkshopEntry] Error:', err.message)
        return { error: 'Terjadi kesalahan saat memperbarui.' }
    }
}
