'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/utils/supabase/server'
import { getSheetData, insertAndWriteResumeData, updateSheetRow } from '@/src/lib/googleSheets'

// ─── Constants ───────────────────────────────────────────────────────

const NARASUMBER_ANCHOR = 'Narasumber Pembinaan Awardee Scholarship'
const DEFAULT_RESUME_SHEET = 'Resume'
const ROWS_TO_SKIP_AFTER_ANCHOR = 2

/**
 * Column indices (0-based).
 * B (1) = Tgl/Bln/Th
 * C (2) = Judul Materi (merged C-D)
 * E (4) = Teknis
 * F (5) = Peserta
 * G (6) = Jumlah
 * I (8) = Link Dokumentasi
 */
const COL = { TANGGAL: 1, JUDUL: 2, TEKNIS: 4, PESERTA: 5, JUMLAH: 6, LINK: 8 } as const

// ─── Types ───────────────────────────────────────────────────────────

export type NarasumberEntry = {
    rowIndex: number
    tanggal: string
    judulMateri: string
    teknis: string
    peserta: string
    jumlah: string
    linkDokumentasi: string
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getResumeSheetName(sheetConfig: Record<string, any> | null): string {
    return sheetConfig?.resume_sheet || DEFAULT_RESUME_SHEET
}

// ─── Server Actions ──────────────────────────────────────────────────

export async function getNarasumberEntries(): Promise<{
    data?: NarasumberEntry[]
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

        const normalizedAnchor = NARASUMBER_ANCHOR.trim().toLowerCase()
        let anchorIdx = -1
        for (let i = 0; i < rows.length; i++) {
            const cellA = (rows[i][0] || '').trim().toLowerCase()
            const cellB = (rows[i][1] || '').trim().toLowerCase()
            if (cellA === normalizedAnchor || cellB === normalizedAnchor) { anchorIdx = i; break }
        }
        if (anchorIdx === -1) return { data: [] }

        const dataStart = anchorIdx + 1 + ROWS_TO_SKIP_AFTER_ANCHOR
        const entries: NarasumberEntry[] = []

        for (let i = dataStart; i < rows.length; i++) {
            const tanggal = (rows[i][COL.TANGGAL] || '').trim()
            const judul = (rows[i][COL.JUDUL] || '').trim()
            if (!tanggal && !judul) break

            entries.push({
                rowIndex: i + 1,
                tanggal,
                judulMateri: judul,
                teknis: (rows[i][COL.TEKNIS] || '').trim(),
                peserta: (rows[i][COL.PESERTA] || '').trim(),
                jumlah: (rows[i][COL.JUMLAH] || '').trim(),
                linkDokumentasi: (rows[i][COL.LINK] || '').trim(),
            })
        }

        return { data: entries }
    } catch (err) {
        console.error('[getNarasumberEntries] Error:', err)
        return { error: 'Gagal mengambil data narasumber.' }
    }
}

export async function addNarasumberEntry(formData: FormData): Promise<{
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

        const tanggal = (formData.get('tanggal') as string)?.trim()
        const judulMateri = (formData.get('judulMateri') as string)?.trim()
        const teknis = (formData.get('teknis') as string)?.trim() || ''
        const peserta = (formData.get('peserta') as string)?.trim() || ''
        const jumlah = (formData.get('jumlah') as string)?.trim() || ''
        const linkDokumentasi = (formData.get('linkDokumentasi') as string)?.trim() || ''

        if (!tanggal) return { error: 'Tanggal wajib diisi.' }
        if (!judulMateri) return { error: 'Judul materi wajib diisi.' }

        const sheetConfig = userData.sheet_config as Record<string, any> | null
        const sheetName = getResumeSheetName(sheetConfig)

        // A=empty, B=tanggal, C=judul, D=empty(merge), E=teknis, F=peserta, G=jumlah, H=empty, I=link
        await insertAndWriteResumeData(
            userData.spreadsheet_id, sheetName, NARASUMBER_ANCHOR,
            ['', tanggal, judulMateri, '', teknis, peserta, jumlah, '', linkDokumentasi]
        )

        revalidatePath('/dashboard/awardee/pemberdayaan/narasumber')
        revalidatePath('/dashboard/awardee')
        return { success: 'Data narasumber berhasil ditambahkan! 🎉' }
    } catch (err: any) {
        console.error('[addNarasumberEntry] Error:', err.message)
        if (err.message?.includes('Anchor text')) return { error: 'Tabel "Narasumber" tidak ditemukan.' }
        return { error: 'Terjadi kesalahan saat menyimpan.' }
    }
}

export async function updateNarasumberEntry(formData: FormData): Promise<{
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

        await updateSheetRow(userData.spreadsheet_id, `${ref}!B${rowIndex}`, [[(formData.get('tanggal') as string)?.trim() || '']])
        await updateSheetRow(userData.spreadsheet_id, `${ref}!C${rowIndex}`, [[(formData.get('judulMateri') as string)?.trim() || '']])
        await updateSheetRow(userData.spreadsheet_id, `${ref}!E${rowIndex}`, [[(formData.get('teknis') as string)?.trim() || '']])
        await updateSheetRow(userData.spreadsheet_id, `${ref}!F${rowIndex}`, [[(formData.get('peserta') as string)?.trim() || '']])
        await updateSheetRow(userData.spreadsheet_id, `${ref}!G${rowIndex}`, [[(formData.get('jumlah') as string)?.trim() || '']])
        await updateSheetRow(userData.spreadsheet_id, `${ref}!I${rowIndex}`, [[(formData.get('linkDokumentasi') as string)?.trim() || '']])

        revalidatePath('/dashboard/awardee/pemberdayaan/narasumber')
        revalidatePath('/dashboard/awardee')
        return { success: 'Data berhasil diperbarui! ✏️' }
    } catch (err: any) {
        console.error('[updateNarasumberEntry] Error:', err.message)
        return { error: 'Terjadi kesalahan saat memperbarui.' }
    }
}
