'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/utils/supabase/server'
import { getSheetData, insertAndWriteResumeData, updateSheetRow } from '@/src/lib/googleSheets'

// ─── Constants ───────────────────────────────────────────────────────

const PORTFOLIO_ANCHOR = 'Portfolio Social Project'
const DEFAULT_RESUME_SHEET = 'Resume'
const ROWS_TO_SKIP_AFTER_ANCHOR = 2

/**
 * Column indices (0-based).
 * B (1) = Tahun
 * C (2) = Nama Social Project (merged C-E)
 * F (5) = Deskripsi (merged F-H)
 * I (8) = Link Laporan
 */
const COL = { TAHUN: 1, NAMA: 2, DESKRIPSI: 5, LINK: 8 } as const

// ─── Types ───────────────────────────────────────────────────────────

export type PortfolioEntry = {
    rowIndex: number
    tahun: string
    namaProject: string
    deskripsi: string
    linkLaporan: string
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getResumeSheetName(sheetConfig: Record<string, any> | null): string {
    return sheetConfig?.resume_sheet || DEFAULT_RESUME_SHEET
}

// ─── Server Actions ──────────────────────────────────────────────────

export async function getPortfolioEntries(): Promise<{
    data?: PortfolioEntry[]
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

        const normalizedAnchor = PORTFOLIO_ANCHOR.trim().toLowerCase()
        let anchorIdx = -1
        for (let i = 0; i < rows.length; i++) {
            const cellA = (rows[i][0] || '').trim().toLowerCase()
            const cellB = (rows[i][1] || '').trim().toLowerCase()
            if (cellA === normalizedAnchor || cellB === normalizedAnchor) { anchorIdx = i; break }
        }
        if (anchorIdx === -1) return { data: [] }

        const dataStart = anchorIdx + 1 + ROWS_TO_SKIP_AFTER_ANCHOR
        const entries: PortfolioEntry[] = []

        for (let i = dataStart; i < rows.length; i++) {
            const tahun = (rows[i][COL.TAHUN] || '').trim()
            const nama = (rows[i][COL.NAMA] || '').trim()
            if (!tahun && !nama) break

            entries.push({
                rowIndex: i + 1,
                tahun,
                namaProject: nama,
                deskripsi: (rows[i][COL.DESKRIPSI] || '').trim(),
                linkLaporan: (rows[i][COL.LINK] || '').trim(),
            })
        }

        return { data: entries }
    } catch (err) {
        console.error('[getPortfolioEntries] Error:', err)
        return { error: 'Gagal mengambil data portfolio.' }
    }
}

export async function addPortfolioEntry(formData: FormData): Promise<{
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

        const tahun = (formData.get('tahun') as string)?.trim()
        const namaProject = (formData.get('namaProject') as string)?.trim()
        const deskripsi = (formData.get('deskripsi') as string)?.trim() || ''
        const linkLaporan = (formData.get('linkLaporan') as string)?.trim() || ''

        if (!tahun) return { error: 'Tahun wajib diisi.' }
        if (!namaProject) return { error: 'Nama social project wajib diisi.' }

        const sheetConfig = userData.sheet_config as Record<string, any> | null
        const sheetName = getResumeSheetName(sheetConfig)

        // A=empty, B=tahun, C=nama, D-E=empty(merge), F=deskripsi, G-H=empty(merge), I=link
        await insertAndWriteResumeData(
            userData.spreadsheet_id, sheetName, PORTFOLIO_ANCHOR,
            ['', tahun, namaProject, '', '', deskripsi, '', '', linkLaporan]
        )

        revalidatePath('/dashboard/awardee/pemberdayaan/portfolio')
        revalidatePath('/dashboard/awardee')
        return { success: 'Data portfolio berhasil ditambahkan! 🎉' }
    } catch (err: any) {
        console.error('[addPortfolioEntry] Error:', err.message)
        if (err.message?.includes('Anchor text')) return { error: 'Tabel "Portfolio Social Project" tidak ditemukan.' }
        return { error: 'Terjadi kesalahan saat menyimpan.' }
    }
}

export async function updatePortfolioEntry(formData: FormData): Promise<{
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

        await updateSheetRow(userData.spreadsheet_id, `${ref}!B${rowIndex}`, [[(formData.get('tahun') as string)?.trim() || '']])
        await updateSheetRow(userData.spreadsheet_id, `${ref}!C${rowIndex}`, [[(formData.get('namaProject') as string)?.trim() || '']])
        await updateSheetRow(userData.spreadsheet_id, `${ref}!F${rowIndex}`, [[(formData.get('deskripsi') as string)?.trim() || '']])
        await updateSheetRow(userData.spreadsheet_id, `${ref}!I${rowIndex}`, [[(formData.get('linkLaporan') as string)?.trim() || '']])

        revalidatePath('/dashboard/awardee/pemberdayaan/portfolio')
        revalidatePath('/dashboard/awardee')
        return { success: 'Data berhasil diperbarui! ✏️' }
    } catch (err: any) {
        console.error('[updatePortfolioEntry] Error:', err.message)
        return { error: 'Terjadi kesalahan saat memperbarui.' }
    }
}
