'use server'

import { createClient } from '@/src/utils/supabase/server'

export async function updatePasswordAction(formData: FormData) {
    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!newPassword || !confirmPassword) return { error: 'Semua kolom wajib diisi.' }
    if (newPassword !== confirmPassword) return { error: 'Konfirmasi password tidak cocok.' }
    if (newPassword.length < 6) return { error: 'Password minimal 6 karakter.' }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { error: 'Sesi kedaluwarsa. Login kembali.' }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: 'Gagal mengubah password. ' + error.message }
    return { success: 'Password berhasil diubah!' }
}

export async function updateProfileDetailsAction(formData: FormData) {
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    if (!name || !email) return { error: 'Nama dan Email wajib diisi.' }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { error: 'Sesi kedaluwarsa. Login kembali.' }

    let successMsg = 'Profil berhasil diperbarui.'

    const { error: nameError } = await supabase.from('roles_pengguna').update({ name }).eq('email', user.email)
    if (nameError) return { error: 'Gagal memperbarui nama.' }

    if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email })
        if (emailError) return { error: 'Gagal mengubah email: ' + emailError.message }
        successMsg = 'Profil diperbarui. Cek inbox email baru untuk verifikasi.'
    }
    return { success: successMsg }
}

export async function updateSpreadsheetAction(formData: FormData) {
    const url = (formData.get('spreadsheetUrl') as string)?.trim()
    if (!url) return { error: 'URL Spreadsheet wajib diisi.' }

    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
    if (!match?.[1]) return { error: 'URL tidak valid. Format: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit' }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { error: 'Sesi kedaluwarsa. Login kembali.' }

    const { error } = await supabase.from('roles_pengguna').update({ spreadsheet_id: match[1] }).eq('email', user.email)
    if (error) return { error: 'Gagal menyimpan Spreadsheet.' }
    return { success: 'Spreadsheet berhasil dikonfigurasi! ✅' }
}

// ─── Helper: merge into existing sheet_config ──────────────────────────

async function mergeSheetConfig(updates: Record<string, unknown>) {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { error: 'Sesi kedaluwarsa. Login kembali.' }

    const { data: existing } = await supabase
        .from('roles_pengguna')
        .select('sheet_config')
        .eq('email', user.email)
        .single()

    const merged = { ...((existing?.sheet_config as Record<string, unknown>) || {}), ...updates }

    const { error } = await supabase
        .from('roles_pengguna')
        .update({ sheet_config: merged })
        .eq('email', user.email)

    if (error) return { error: 'Gagal menyimpan konfigurasi.' }
    return { success: 'Konfigurasi berhasil disimpan! ✅' }
}

// ─── Config Actions ────────────────────────────────────────────────────

export async function updateSheetConfigAction(formData: FormData) {
    const bulananConfig: Record<string, unknown> = {}

    const MONTHS = ['juli', 'agustus', 'september', 'oktober', 'november', 'desember', 'januari', 'februari', 'maret', 'april', 'mei', 'juni']

    for (let year = 1; year <= 4; year++) {
        const yk = `tahun_${year}`
        const sheetName = (formData.get(`sheet_name_${yk}`) as string)?.trim() || `Tahun ke-${year}`

        const months: Record<string, string> = {}
        MONTHS.forEach(m => {
            const val = (formData.get(`ibadah_${yk}_${m}`) as string)?.trim() || ''
            months[m] = val
        })

        bulananConfig[yk] = {
            sheet_name: sheetName,
            months: months
        }
    }

    // Merge: preserve existing harian config
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Sesi kedaluwarsa.' }

    const { data: existing } = await supabase
        .from('roles_pengguna')
        .select('sheet_config')
        .eq('email', user.email)
        .single()

    const currentConfig = (existing?.sheet_config as Record<string, any>) || {}
    const existingHarian = currentConfig.ibadah?.harian || {}

    return mergeSheetConfig({
        ibadah: {
            bulanan: bulananConfig,
            harian: existingHarian,
        }
    })
}

export async function updateIbadahHarianConfigAction(formData: FormData) {
    const MONTHS = ['juli', 'agustus', 'september', 'oktober', 'november', 'desember', 'januari', 'februari', 'maret', 'april', 'mei', 'juni']

    const harianConfig: Record<string, unknown> = {}

    for (let year = 1; year <= 4; year++) {
        const yk = `tahun_${year}`
        const sheetName = (formData.get(`sheet_name_${yk}`) as string)?.trim() || `Tahun ke-${year}`

        const months: Record<string, string> = {}
        MONTHS.forEach(m => {
            const val = (formData.get(`harian_${yk}_${m}`) as string)?.trim() || ''
            months[m] = val
        })

        harianConfig[yk] = {
            sheet_name: sheetName,
            months: months,
        }
    }

    // Merge: preserve existing bulanan config
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Sesi kedaluwarsa.' }

    const { data: existing } = await supabase
        .from('roles_pengguna')
        .select('sheet_config')
        .eq('email', user.email)
        .single()

    const currentConfig = (existing?.sheet_config as Record<string, any>) || {}
    const existingBulanan = currentConfig.ibadah?.bulanan || {}

    return mergeSheetConfig({
        ibadah: {
            bulanan: existingBulanan,
            harian: harianConfig,
        }
    })
}



export async function updateHafalanConfigAction(formData: FormData) {
    return mergeSheetConfig({
        hafalan_sheet: (formData.get('hafalanSheet') as string)?.trim() || '',
        hafalan_range: (formData.get('hafalanRange') as string)?.trim() || '',
    })
}
