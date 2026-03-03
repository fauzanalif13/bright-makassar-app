'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/utils/supabase/server'
import { getSheetData, insertAndWriteResumeData, updateSheetRow } from '@/src/lib/googleSheets'

// ─── Constants ───────────────────────────────────────────────────────

/** The anchor text used to locate the Pembinaan table in the Resume sheet */
const PEMBINAAN_ANCHOR = 'Pembinaan S/H Skills'

/** Default sheet name for the Resume sheet (configurable via sheet_config) */
const DEFAULT_RESUME_SHEET = 'Resume'

/**
 * Number of marker rows after the anchor to skip (description + header).
 * Row 1: "Tuliskan daftar aktivitas pembinaan..."
 * Row 2: "Tgl/Bln/Th | Tema Pembinaan | Narasumber | Link Resume"
 */
const ROWS_TO_SKIP_AFTER_ANCHOR = 2

/**
 * Explicit column indices in the spreadsheet (0-based).
 * Col A (0) = empty/index
 * Col B (1) = Tgl/Bln/Th
 * Col C-F (2) = Tema Pembinaan (spans C-F merged)
 * Col G (6) = Narasumber
 * Col H-I (7-8) = empty
 * Col J (9) = Link Resume
 */
const COL = { TANGGAL: 1, TEMA: 2, NARASUMBER: 6, LINK: 9 } as const

// ─── Types ───────────────────────────────────────────────────────────

export type PembinaanEntry = {
    rowIndex: number   // 1-based sheet row index (for editing)
    tanggal: string
    tema: string
    narasumber: string
    linkResume: string
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getResumeSheetName(sheetConfig: Record<string, any> | null): string {
    return sheetConfig?.resume_sheet || DEFAULT_RESUME_SHEET
}

// ─── Server Actions ──────────────────────────────────────────────────

/**
 * Fetch existing Pembinaan S/H Skills entries from the Resume sheet.
 * Skips 2 marker rows after the anchor (description + column headers).
 */
export async function getPembinaanEntries(): Promise<{
    data?: PembinaanEntry[]
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

        // Read columns A–K from the Resume sheet (wide enough for merged cells)
        const rows = await getSheetData(userData.spreadsheet_id, `'${sheetName}'!A:K`)

        // Find the anchor row
        const normalizedAnchor = PEMBINAAN_ANCHOR.trim().toLowerCase()
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

        // Skip anchor + marker rows (description row + header row)
        const dataStart = anchorIdx + 1 + ROWS_TO_SKIP_AFTER_ANCHOR

        const entries: PembinaanEntry[] = []

        for (let i = dataStart; i < rows.length; i++) {
            const tanggal = (rows[i][COL.TANGGAL] || '').trim()
            const tema = (rows[i][COL.TEMA] || '').trim()

            // Stop at blank row
            if (!tanggal && !tema) break

            entries.push({
                rowIndex: i + 1,
                tanggal,
                tema,
                narasumber: (rows[i][COL.NARASUMBER] || '').trim(),
                linkResume: (rows[i][COL.LINK] || '').trim(),
            })
        }

        return { data: entries }
    } catch (err) {
        console.error('[getPembinaanEntries] Error:', err)
        return { error: 'Gagal mengambil data pembinaan.' }
    }
}

/**
 * Add a new Pembinaan S/H Skills entry to the Resume sheet.
 * Uses anchor-based insert to safely add a row without corrupting adjacent tables.
 */
export async function addPembinaanEntry(formData: FormData): Promise<{
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

        // Extract form values
        const tanggal = (formData.get('tanggal') as string)?.trim()
        const tema = (formData.get('tema') as string)?.trim()
        const narasumber = (formData.get('narasumber') as string)?.trim()
        const linkResume = (formData.get('linkResume') as string)?.trim() || ''

        // Validate required fields
        if (!tanggal) return { error: 'Tanggal wajib diisi.' }
        if (!tema) return { error: 'Tema pembinaan wajib diisi.' }
        if (!narasumber) return { error: 'Narasumber wajib diisi.' }

        const sheetConfig = userData.sheet_config as Record<string, any> | null
        const sheetName = getResumeSheetName(sheetConfig)

        // Insert using anchor-based write
        // A=empty, B=tanggal, C=tema, D-F=empty(merge), G=narasumber, H-I=empty, J=link
        const result = await insertAndWriteResumeData(
            userData.spreadsheet_id,
            sheetName,
            PEMBINAAN_ANCHOR,
            ['', tanggal, tema, '', '', '', narasumber, '', '', linkResume]
        )

        console.log(`[addPembinaanEntry] Inserted at row ${result.insertedAtRow}`)

        revalidatePath('/dashboard/awardee/pendidikan/pembinaan')
        revalidatePath('/dashboard/awardee')

        return { success: 'Data pembinaan berhasil ditambahkan! 🎉' }
    } catch (err: any) {
        console.error('[addPembinaanEntry] Error:', err.message)

        if (err.message?.includes('Anchor text')) {
            return { error: 'Tabel "Pembinaan S/H Skills" tidak ditemukan di spreadsheet. Periksa struktur sheet Resume.' }
        }

        return { error: 'Terjadi kesalahan saat menyimpan. Coba lagi nanti.' }
    }
}

/**
 * Update an existing Pembinaan entry in-place at a specific sheet row.
 */
export async function updatePembinaanEntry(formData: FormData): Promise<{
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

        // Extract form values
        const rowIndex = parseInt(formData.get('rowIndex') as string)
        const tanggal = (formData.get('tanggal') as string)?.trim()
        const tema = (formData.get('tema') as string)?.trim()
        const narasumber = (formData.get('narasumber') as string)?.trim()
        const linkResume = (formData.get('linkResume') as string)?.trim() || ''

        // Validate
        if (!rowIndex || isNaN(rowIndex)) return { error: 'Row index tidak valid.' }
        if (!tanggal) return { error: 'Tanggal wajib diisi.' }
        if (!tema) return { error: 'Tema pembinaan wajib diisi.' }
        if (!narasumber) return { error: 'Narasumber wajib diisi.' }

        const sheetConfig = userData.sheet_config as Record<string, any> | null
        const sheetName = getResumeSheetName(sheetConfig)

        // Update the specific row in-place
        // Write to B (tanggal), C (tema), G (narasumber), J (link)
        const sheetRef = `'${sheetName}'`
        await updateSheetRow(userData.spreadsheet_id, `${sheetRef}!B${rowIndex}`, [[tanggal]])
        await updateSheetRow(userData.spreadsheet_id, `${sheetRef}!C${rowIndex}`, [[tema]])
        await updateSheetRow(userData.spreadsheet_id, `${sheetRef}!G${rowIndex}`, [[narasumber]])
        await updateSheetRow(userData.spreadsheet_id, `${sheetRef}!J${rowIndex}`, [[linkResume]])

        console.log(`[updatePembinaanEntry] Updated row ${rowIndex}`)

        revalidatePath('/dashboard/awardee/pendidikan/pembinaan')
        revalidatePath('/dashboard/awardee')

        return { success: 'Data berhasil diperbarui! ✏️' }
    } catch (err: any) {
        console.error('[updatePembinaanEntry] Error:', err.message)
        return { error: 'Terjadi kesalahan saat memperbarui. Coba lagi nanti.' }
    }
}
