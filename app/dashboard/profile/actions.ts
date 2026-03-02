'use server'

import { createClient } from '@/src/utils/supabase/server'

export async function updatePasswordAction(formData: FormData) {
    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!newPassword || !confirmPassword) {
        return { error: 'Semua kolom wajib diisi.' }
    }

    if (newPassword !== confirmPassword) {
        return { error: 'Konfirmasi password tidak cocok dengan password baru.' }
    }

    if (newPassword.length < 6) {
        return { error: 'Password baru minimal harus 6 karakter.' }
    }

    const supabase = await createClient()

    // Pastikan user sedang login
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        return { error: 'Sesi Anda telah kedaluwarsa. Silakan login kembali.' }
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
    })

    if (updateError) {
        return { error: 'Gagal mengubah password. ' + updateError.message }
    }

    return { success: 'Password berhasil diubah!' }
}

export async function updateProfileDetailsAction(formData: FormData) {
    const name = formData.get('name') as string
    const email = formData.get('email') as string

    if (!name || !email) {
        return { error: 'Nama dan Email wajib diisi.' }
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        return { error: 'Sesi Anda telah kedaluwarsa. Silakan login kembali.' }
    }

    let successMsg = 'Profil berhasil diperbarui.'

    // Update Name in roles_pengguna
    const { error: nameError } = await supabase
        .from('roles_pengguna')
        .update({ name })
        .eq('email', user.email)

    if (nameError) {
        return { error: 'Gagal memperbarui nama pengguna.' }
    }

    // Update Email in Auth if changed
    if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email })
        if (emailError) {
            return { error: 'Gagal mengubah email: ' + emailError.message }
        }
        successMsg = 'Profil diperbarui. Silakan cek inbox email baru Anda untuk memverifikasi perubahan email.'
    }

    return { success: successMsg }
}

export async function updateSpreadsheetAction(formData: FormData) {
    const url = (formData.get('spreadsheetUrl') as string)?.trim()

    if (!url) {
        return { error: 'URL Spreadsheet wajib diisi.' }
    }

    // Extract spreadsheet ID from Google Sheets URL
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
    if (!match || !match[1]) {
        return { error: 'URL tidak valid. Pastikan format URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit' }
    }

    const spreadsheetId = match[1]

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        return { error: 'Sesi Anda telah kedaluwarsa. Silakan login kembali.' }
    }

    const { error: updateError } = await supabase
        .from('roles_pengguna')
        .update({ spreadsheet_id: spreadsheetId })
        .eq('email', user.email)

    if (updateError) {
        return { error: 'Gagal menyimpan konfigurasi Spreadsheet.' }
    }

    return { success: 'Spreadsheet berhasil dikonfigurasi! ✅' }
}

export async function updateSheetConfigAction(formData: FormData) {
    const ibadahSheet = (formData.get('ibadahSheet') as string)?.trim() || 'LaporanIbadah'
    const rerataRange = (formData.get('rerataRange') as string)?.trim() || ''

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        return { error: 'Sesi Anda telah kedaluwarsa. Silakan login kembali.' }
    }

    const sheetConfig = {
        ibadah_sheet: ibadahSheet,
        rerata_range: rerataRange,
    }

    const { error: updateError } = await supabase
        .from('roles_pengguna')
        .update({ sheet_config: sheetConfig })
        .eq('email', user.email)

    if (updateError) {
        return { error: 'Gagal menyimpan konfigurasi chart.' }
    }

    return { success: 'Konfigurasi chart berhasil disimpan! ✅' }
}
