'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/utils/supabase/server'
import { getSheetData, insertAndWriteResumeData, updateSheetRow } from '@/src/lib/googleSheets'

// ─── Constants ───────────────────────────────────────────────────────

const KUNJUNGAN_ANCHOR = 'Kunjungan ke Titik Program YBM BRILiaN'
const DEFAULT_RESUME_SHEET = 'Resume'
const ROWS_TO_SKIP_AFTER_ANCHOR = 2

/**
 * Column indices (0-based).
 * A (0) = section labels / empty
 * B (1) = Semester (number 1-8)
 * C (2) = Tgl/Bln/Th
 * D (3) = Lokasi
 * E (4) = Daftar Kunjungan (merged E-H)
 * I (8) = Link Laporan
 */
const COL = { SEMESTER: 1, TANGGAL: 2, LOKASI: 3, KUNJUNGAN: 4, LINK: 8 } as const

// ─── Types ───────────────────────────────────────────────────────────

export type KunjunganEntry = {
    rowIndex: number
    semester: string
    tanggal: string
    lokasi: string
    daftarKunjungan: string
    linkLaporan: string
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getResumeSheetName(sheetConfig: Record<string, any> | null): string {
    return sheetConfig?.resume_sheet || DEFAULT_RESUME_SHEET
}

// ─── Server Actions ──────────────────────────────────────────────────

export async function getKunjunganEntries(): Promise<{
    data?: KunjunganEntry[]
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

        const normalizedAnchor = KUNJUNGAN_ANCHOR.trim().toLowerCase()
        let anchorIdx = -1
        for (let i = 0; i < rows.length; i++) {
            const cellA = (rows[i][0] || '').trim().toLowerCase()
            const cellB = (rows[i][1] || '').trim().toLowerCase()
            if (cellA === normalizedAnchor || cellB === normalizedAnchor) { anchorIdx = i; break }
        }
        if (anchorIdx === -1) return { data: [] }

        const dataStart = anchorIdx + 1 + ROWS_TO_SKIP_AFTER_ANCHOR
        const entries: KunjunganEntry[] = []
        let currentSemester = ''

        for (let i = dataStart; i < rows.length; i++) {
            const a = (rows[i][0] || '').trim()
            const sem = (rows[i][COL.SEMESTER] || '').trim()
            const tanggal = (rows[i][COL.TANGGAL] || '').trim()
            const kunjungan = (rows[i][COL.KUNJUNGAN] || '').trim()

            // Stop if we hit a new section header (non-numeric text in col A or B)
            if (a && isNaN(Number(a))) break
            if (sem && isNaN(Number(sem)) && !sem.includes('/')) break

            // Track merged semester value (fill-down)
            if (sem && !isNaN(Number(sem))) currentSemester = sem

            // Skip rows without actual data (empty rows & semester-only markers)
            if (!tanggal && !kunjungan) continue

            entries.push({
                rowIndex: i + 1,
                semester: currentSemester,
                tanggal,
                lokasi: (rows[i][COL.LOKASI] || '').trim(),
                daftarKunjungan: kunjungan,
                linkLaporan: (rows[i][COL.LINK] || '').trim(),
            })
        }

        return { data: entries }
    } catch (err) {
        console.error('[getKunjunganEntries] Error:', err)
        return { error: 'Gagal mengambil data kunjungan.' }
    }
}

export async function addKunjunganEntry(formData: FormData): Promise<{
    success?: string; error?: string
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

        const semester = (formData.get('semester') as string)?.trim() || ''
        const tanggal = (formData.get('tanggal') as string)?.trim()
        const lokasi = (formData.get('lokasi') as string)?.trim()
        const daftarKunjungan = (formData.get('daftarKunjungan') as string)?.trim()
        const linkLaporan = (formData.get('linkLaporan') as string)?.trim() || ''

        if (!tanggal) return { error: 'Tanggal wajib diisi.' }
        if (!daftarKunjungan) return { error: 'Daftar kunjungan wajib diisi.' }

        const sheetConfig = userData.sheet_config as Record<string, any> | null
        const sheetName = getResumeSheetName(sheetConfig)

        // A=empty, B=semester, C=tanggal, D=lokasi, E=kunjungan, F-H=empty(merge), I=link
        await insertAndWriteResumeData(
            userData.spreadsheet_id, sheetName, KUNJUNGAN_ANCHOR,
            ['', semester, tanggal, lokasi, daftarKunjungan, '', '', '', linkLaporan]
        )

        revalidatePath('/dashboard/awardee/pemberdayaan/kunjungan')
        revalidatePath('/dashboard/awardee')
        return { success: 'Data kunjungan berhasil ditambahkan! 🎉' }
    } catch (err: any) {
        console.error('[addKunjunganEntry] Error:', err.message)
        if (err.message?.includes('Anchor text')) return { error: 'Tabel "Kunjungan" tidak ditemukan.' }
        return { error: 'Terjadi kesalahan saat menyimpan.' }
    }
}

export async function updateKunjunganEntry(formData: FormData): Promise<{
    success?: string; error?: string
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

        const rowIndex = parseInt(formData.get('rowIndex') as string)
        if (!rowIndex || isNaN(rowIndex)) return { error: 'Row index tidak valid.' }

        const sheetConfig = userData.sheet_config as Record<string, any> | null
        const sheetName = getResumeSheetName(sheetConfig)
        const ref = `'${sheetName}'`

        await updateSheetRow(userData.spreadsheet_id, `${ref}!C${rowIndex}`, [[(formData.get('tanggal') as string)?.trim() || '']])
        await updateSheetRow(userData.spreadsheet_id, `${ref}!D${rowIndex}`, [[(formData.get('lokasi') as string)?.trim() || '']])
        await updateSheetRow(userData.spreadsheet_id, `${ref}!E${rowIndex}`, [[(formData.get('daftarKunjungan') as string)?.trim() || '']])
        await updateSheetRow(userData.spreadsheet_id, `${ref}!I${rowIndex}`, [[(formData.get('linkLaporan') as string)?.trim() || '']])

        revalidatePath('/dashboard/awardee/pemberdayaan/kunjungan')
        revalidatePath('/dashboard/awardee')
        return { success: 'Data berhasil diperbarui! ✏️' }
    } catch (err: any) {
        console.error('[updateKunjunganEntry] Error:', err.message)
        return { error: 'Terjadi kesalahan saat memperbarui.' }
    }
}
