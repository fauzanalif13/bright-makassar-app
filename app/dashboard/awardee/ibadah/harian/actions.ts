'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/utils/supabase/server'
import { appendDataToSheet, findRowByDate, updateSheetRow } from '@/src/lib/googleSheets'

/**
 * Fetch existing ibadah data for a specific date.
 * Returns the row data if found, null if not.
 */
export async function getIbadahForDate(dateStr: string) {
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

        const sheetConfig = userData.sheet_config as { ibadah_sheet?: string } | null
        const sheetName = sheetConfig?.ibadah_sheet || 'LaporanIbadah'

        const result = await findRowByDate(userData.spreadsheet_id, sheetName, dateStr)

        if (!result) return { data: null } // No entry for this date

        const [, shalatBerjamaah, qiyamulLail, dzikirPagi, mendoakan, shalatDhuha, membacaQuran, shaumSunnah, berinfak] = result.data

        return {
            data: {
                shalatBerjamaah: shalatBerjamaah || '0',
                qiyamulLail: qiyamulLail || '0',
                dzikirPagi: dzikirPagi?.toLowerCase() === 'ya' || dzikirPagi === '1',
                mendoakan: mendoakan?.toLowerCase() === 'ya' || mendoakan === '1',
                shalatDhuha: shalatDhuha?.toLowerCase() === 'ya' || shalatDhuha === '1',
                membacaQuran: membacaQuran?.toLowerCase() === 'ya' || membacaQuran === '1',
                shaumSunnah: shaumSunnah?.toLowerCase() === 'ya' || shaumSunnah === '1',
                berinfak: berinfak?.toLowerCase() === 'ya' || berinfak === '1',
            },
            rowIndex: result.rowIndex,
        }
    } catch (err) {
        console.error('getIbadahForDate error:', err)
        return { error: 'Gagal mengambil data.' }
    }
}

/**
 * Upsert ibadah data: update existing row or append new.
 */
export async function upsertIbadahHarian(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'Sesi kedaluwarsa. Login kembali.' }

        const { data: userData } = await supabase
            .from('roles_pengguna')
            .select('spreadsheet_id, sheet_config, name')
            .eq('email', user.email)
            .single()

        if (!userData?.spreadsheet_id) return { error: 'Spreadsheet belum dikonfigurasi.' }

        const tanggal = formData.get('tanggal') as string
        if (!tanggal) return { error: 'Tanggal wajib diisi.' }

        const shalatBerjamaah = formData.get('shalatBerjamaah') as string || '0'
        const qiyamulLail = formData.get('qiyamulLail') as string || '0'
        const dzikirPagi = formData.get('dzikirPagi') === 'on' ? 'Ya' : 'Tidak'
        const mendoakan = formData.get('mendoakan') === 'on' ? 'Ya' : 'Tidak'
        const shalatDhuha = formData.get('shalatDhuha') === 'on' ? 'Ya' : 'Tidak'
        const membacaQuran = formData.get('membacaQuran') === 'on' ? 'Ya' : 'Tidak'
        const shaumSunnah = formData.get('shaumSunnah') === 'on' ? 'Ya' : 'Tidak'
        const berinfak = formData.get('berinfak') === 'on' ? 'Ya' : 'Tidak'

        const sheetConfig = userData.sheet_config as { ibadah_sheet?: string } | null
        const sheetName = sheetConfig?.ibadah_sheet || 'LaporanIbadah'

        // const rowValues = [[tanggal, shalatBerjamaah, qiyamulLail, dzikirPagi, mendoakan, shalatDhuha, membacaQuran, shaumSunnah, berinfak]]
        const rowValues: (string | number | boolean)[][] = [
    [tanggal, shalatBerjamaah, qiyamulLail, dzikirPagi, mendoakan, shalatDhuha, membacaQuran, shaumSunnah, berinfak]
];

        // Try to find existing row for this date
        const existing = await findRowByDate(userData.spreadsheet_id, sheetName, tanggal)

        if (existing) {
            // UPDATE in-place
            const updateRange = `${sheetName}!A${existing.rowIndex}:I${existing.rowIndex}`
            await updateSheetRow(userData.spreadsheet_id, updateRange, rowValues)
        } else {
            // APPEND new row
            await appendDataToSheet(userData.spreadsheet_id, `${sheetName}!A:I`, rowValues)
        }

        revalidatePath('/dashboard/awardee')
        revalidatePath('/dashboard/fasilitator')

        return { success: existing ? 'Data berhasil diperbarui! ✏️' : 'Laporan berhasil dikirim! 🎉' }
    } catch (err) {
        console.error('upsertIbadahHarian error:', err)
        return { error: 'Terjadi kesalahan. Coba lagi nanti.' }
    }
}
