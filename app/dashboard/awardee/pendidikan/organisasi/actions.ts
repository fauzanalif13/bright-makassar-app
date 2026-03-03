'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/utils/supabase/server'
import { getSheetData, insertAndWriteResumeData, updateSheetRow } from '@/src/lib/googleSheets'

// ─── Constants ───────────────────────────────────────────────────────

const ORGANISASI_ANCHOR = 'Riwayat Organisasi'
const DEFAULT_RESUME_SHEET = 'Resume'
const ROWS_TO_SKIP_AFTER_ANCHOR = 2

/**
 * Explicit column indices (0-based).
 * B (1) = Tahun
 * C-F (2) = Daftar Organisasi (merged)
 * G (6) = Jabatan
 * J (9) = Level
 */
const COL = { TAHUN: 1, ORGANISASI: 2, JABATAN: 6, LEVEL: 9 } as const

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

export async function getOrganisasiEntries(): Promise<{
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

        const sheetConfig = userData.sheet_config as Record<string, any> | null
        const sheetName = getResumeSheetName(sheetConfig)
        const rows = await getSheetData(userData.spreadsheet_id, `'${sheetName}'!A:K`)

        const normalizedAnchor = ORGANISASI_ANCHOR.trim().toLowerCase()
        let anchorIdx = -1
        for (let i = 0; i < rows.length; i++) {
            const cellA = (rows[i][0] || '').trim().toLowerCase()
            const cellB = (rows[i][1] || '').trim().toLowerCase()
            if (cellA === normalizedAnchor || cellB === normalizedAnchor) { anchorIdx = i; break }
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
    } catch (err) {
        console.error('[getOrganisasiEntries] Error:', err)
        return { error: 'Gagal mengambil data organisasi.' }
    }
}

export async function addOrganisasiEntry(formData: FormData): Promise<{
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

        const tahun = (formData.get('tahun') as string)?.trim()
        const daftarOrganisasi = (formData.get('daftarOrganisasi') as string)?.trim()
        const jabatan = (formData.get('jabatan') as string)?.trim()
        const level = (formData.get('level') as string)?.trim() || ''

        if (!tahun) return { error: 'Tahun wajib diisi.' }
        if (!daftarOrganisasi) return { error: 'Nama organisasi wajib diisi.' }
        if (!jabatan) return { error: 'Jabatan wajib diisi.' }

        const sheetConfig = userData.sheet_config as Record<string, any> | null
        const sheetName = getResumeSheetName(sheetConfig)

        // A=empty, B=tahun, C=org, D-F=empty(merge), G=jabatan, H-I=empty, J=level
        await insertAndWriteResumeData(
            userData.spreadsheet_id, sheetName, ORGANISASI_ANCHOR,
            ['', tahun, daftarOrganisasi, '', '', '', jabatan, '', '', level]
        )

        revalidatePath('/dashboard/awardee/pendidikan/organisasi')
        revalidatePath('/dashboard/awardee')
        return { success: 'Data organisasi berhasil ditambahkan! 🎉' }
    } catch (err: any) {
        console.error('[addOrganisasiEntry] Error:', err.message)
        if (err.message?.includes('Anchor text')) return { error: 'Tabel "Riwayat Organisasi" tidak ditemukan.' }
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

        await updateSheetRow(userData.spreadsheet_id, `${ref}!B${rowIndex}`, [[tahun]])
        await updateSheetRow(userData.spreadsheet_id, `${ref}!C${rowIndex}`, [[daftarOrganisasi]])
        await updateSheetRow(userData.spreadsheet_id, `${ref}!G${rowIndex}`, [[jabatan]])
        await updateSheetRow(userData.spreadsheet_id, `${ref}!J${rowIndex}`, [[level]])

        revalidatePath('/dashboard/awardee/pendidikan/organisasi')
        revalidatePath('/dashboard/awardee')
        return { success: 'Data berhasil diperbarui! ✏️' }
    } catch (err: any) {
        console.error('[updateOrganisasiEntry] Error:', err.message)
        return { error: 'Terjadi kesalahan saat memperbarui.' }
    }
}
