'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/utils/supabase/server'
import { getSheetData, insertAndWriteResumeData, updateSheetRow } from '@/src/lib/googleSheets'

// ─── Constants ───────────────────────────────────────────────────────

const PRESTASI_ANCHOR = 'Riwayat Prestasi'
const DEFAULT_RESUME_SHEET = 'Resume'
const ROWS_TO_SKIP_AFTER_ANCHOR = 2

/**
 * Explicit column indices in the spreadsheet (0-based).
 * Col A (0) = empty
 * Col B (1) = Tgl/Bln/Th
 * Col C-F (2) = Daftar Prestasi (merged C-F)
 * Col G-H (6) = Penyelenggara (merged G-H)
 * Col J (9) = Level
 */
const COL = { TANGGAL: 1, PRESTASI: 2, PENYELENGGARA: 6, LEVEL: 9 } as const

// ─── Types ───────────────────────────────────────────────────────────

export type PrestasiEntry = {
    rowIndex: number
    tanggal: string
    daftarPrestasi: string
    penyelenggara: string
    level: string
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getResumeSheetName(sheetConfig: Record<string, any> | null): string {
    return sheetConfig?.resume_sheet || DEFAULT_RESUME_SHEET
}

// ─── Server Actions ──────────────────────────────────────────────────

export async function getPrestasiEntries(): Promise<{
    data?: PrestasiEntry[]
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

        const normalizedAnchor = PRESTASI_ANCHOR.trim().toLowerCase()
        let anchorIdx = -1
        for (let i = 0; i < rows.length; i++) {
            const cellA = (rows[i][0] || '').trim().toLowerCase()
            const cellB = (rows[i][1] || '').trim().toLowerCase()
            if (cellA === normalizedAnchor || cellB === normalizedAnchor) {
                anchorIdx = i
                break
            }
        }

        if (anchorIdx === -1) return { data: [] }

        const dataStart = anchorIdx + 1 + ROWS_TO_SKIP_AFTER_ANCHOR
        const entries: PrestasiEntry[] = []

        for (let i = dataStart; i < rows.length; i++) {
            const tanggal = (rows[i][COL.TANGGAL] || '').trim()
            const prestasi = (rows[i][COL.PRESTASI] || '').trim()

            if (!tanggal && !prestasi) break

            entries.push({
                rowIndex: i + 1,
                tanggal,
                daftarPrestasi: prestasi,
                penyelenggara: (rows[i][COL.PENYELENGGARA] || '').trim(),
                level: (rows[i][COL.LEVEL] || '').trim(),
            })
        }

        return { data: entries }
    } catch (err) {
        console.error('[getPrestasiEntries] Error:', err)
        return { error: 'Gagal mengambil data prestasi.' }
    }
}

export async function addPrestasiEntry(formData: FormData): Promise<{
    success?: string
    error?: string
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
        const daftarPrestasi = (formData.get('daftarPrestasi') as string)?.trim()
        const penyelenggara = (formData.get('penyelenggara') as string)?.trim()
        const level = (formData.get('level') as string)?.trim() || ''

        if (!tanggal) return { error: 'Tanggal wajib diisi.' }
        if (!daftarPrestasi) return { error: 'Daftar prestasi wajib diisi.' }
        if (!penyelenggara) return { error: 'Penyelenggara wajib diisi.' }

        const sheetConfig = userData.sheet_config as Record<string, any> | null
        const sheetName = getResumeSheetName(sheetConfig)

        // A=empty, B=tanggal, C=prestasi, D-F=empty(merge), G=penyelenggara, H-I=empty, J=level
        const result = await insertAndWriteResumeData(
            userData.spreadsheet_id,
            sheetName,
            PRESTASI_ANCHOR,
            ['', tanggal, daftarPrestasi, '', '', '', penyelenggara, '', '', level]
        )

        console.log(`[addPrestasiEntry] Inserted at row ${result.insertedAtRow}`)

        revalidatePath('/dashboard/awardee/pendidikan/prestasi')
        revalidatePath('/dashboard/awardee')

        return { success: 'Data prestasi berhasil ditambahkan! 🎉' }
    } catch (err: any) {
        console.error('[addPrestasiEntry] Error:', err.message)
        if (err.message?.includes('Anchor text')) {
            return { error: 'Tabel "Riwayat Prestasi" tidak ditemukan di spreadsheet.' }
        }
        return { error: 'Terjadi kesalahan saat menyimpan. Coba lagi nanti.' }
    }
}

export async function updatePrestasiEntry(formData: FormData): Promise<{
    success?: string
    error?: string
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
        const daftarPrestasi = (formData.get('daftarPrestasi') as string)?.trim()
        const penyelenggara = (formData.get('penyelenggara') as string)?.trim()
        const level = (formData.get('level') as string)?.trim() || ''

        if (!rowIndex || isNaN(rowIndex)) return { error: 'Row index tidak valid.' }
        if (!tanggal) return { error: 'Tanggal wajib diisi.' }
        if (!daftarPrestasi) return { error: 'Daftar prestasi wajib diisi.' }
        if (!penyelenggara) return { error: 'Penyelenggara wajib diisi.' }

        const sheetConfig = userData.sheet_config as Record<string, any> | null
        const sheetName = getResumeSheetName(sheetConfig)

        const sheetRef = `'${sheetName}'`
        await updateSheetRow(userData.spreadsheet_id, `${sheetRef}!B${rowIndex}`, [[tanggal]])
        await updateSheetRow(userData.spreadsheet_id, `${sheetRef}!C${rowIndex}`, [[daftarPrestasi]])
        await updateSheetRow(userData.spreadsheet_id, `${sheetRef}!G${rowIndex}`, [[penyelenggara]])
        await updateSheetRow(userData.spreadsheet_id, `${sheetRef}!J${rowIndex}`, [[level]])

        console.log(`[updatePrestasiEntry] Updated row ${rowIndex}`)

        revalidatePath('/dashboard/awardee/pendidikan/prestasi')
        revalidatePath('/dashboard/awardee')

        return { success: 'Data berhasil diperbarui! ✏️' }
    } catch (err: any) {
        console.error('[updatePrestasiEntry] Error:', err.message)
        return { error: 'Terjadi kesalahan saat memperbarui. Coba lagi nanti.' }
    }
}
