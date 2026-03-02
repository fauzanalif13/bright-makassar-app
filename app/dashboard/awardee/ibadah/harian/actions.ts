'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/utils/supabase/server'
import { appendDataToSheet } from '@/src/lib/googleSheets'

export async function submitIbadahHarian(formData: FormData) {
    try {
        // 1. Authenticate user
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { error: 'Sesi Anda telah kedaluwarsa. Silakan login kembali.' }
        }

        // 2. Get user's spreadsheet_id and sheet_config from roles_pengguna
        const { data: userData, error: dbError } = await supabase
            .from('roles_pengguna')
            .select('spreadsheet_id, sheet_config, name')
            .eq('email', user.email)
            .single()

        if (dbError || !userData?.spreadsheet_id) {
            return { error: 'Spreadsheet belum dikonfigurasi. Buka Profil → Konfigurasi Spreadsheet.' }
        }

        // 3. Extract form data (8 activities)
        const tanggal = formData.get('tanggal') as string
        const shalatBerjamaah = formData.get('shalatBerjamaah') as string || '0'
        const qiyamulLail = formData.get('qiyamulLail') as string || '0'
        const dzikirPagi = formData.get('dzikirPagi') === 'on' ? 'Ya' : 'Tidak'
        const mendoakan = formData.get('mendoakan') === 'on' ? 'Ya' : 'Tidak'
        const shalatDhuha = formData.get('shalatDhuha') === 'on' ? 'Ya' : 'Tidak'
        const membacaQuran = formData.get('membacaQuran') === 'on' ? 'Ya' : 'Tidak'
        const shaumSunnah = formData.get('shaumSunnah') === 'on' ? 'Ya' : 'Tidak'
        const berinfak = formData.get('berinfak') === 'on' ? 'Ya' : 'Tidak'

        if (!tanggal) {
            return { error: 'Tanggal wajib diisi.' }
        }

        // 4. Determine sheet name from config
        const sheetConfig = userData.sheet_config as { ibadah_sheet?: string } | null
        const sheetName = sheetConfig?.ibadah_sheet || 'LaporanIbadah'

        // 5. Append to Google Sheets
        const values = [[
            tanggal,
            shalatBerjamaah,
            qiyamulLail,
            dzikirPagi,
            mendoakan,
            shalatDhuha,
            membacaQuran,
            shaumSunnah,
            berinfak,
        ]]

        await appendDataToSheet(
            userData.spreadsheet_id,
            `${sheetName}!A:I`,
            values
        )

        // 6. Revalidate dashboard caches
        revalidatePath('/dashboard/awardee')
        revalidatePath('/dashboard/fasilitator')

        return { success: 'Laporan ibadah harian berhasil dikirim! 🎉' }
    } catch (err) {
        console.error('submitIbadahHarian error:', err)
        return { error: 'Terjadi kesalahan saat mengirim data. Coba lagi nanti.' }
    }
}
