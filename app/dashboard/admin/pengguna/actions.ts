'use server'

import { createClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─── Types ─────────────────────────────────────────────────────────────

export type PenggunaRow = {
    id: number
    name: string
    email: string
    role: string
    angkatan: string | null
    gender: string | null
    batch: string | null
    status: string
    spreadsheet_id: string | null
    auth_uid: string | null
    asal_univ?: string | null
}

type ActionResult = {
    success?: string
    error?: string
}

type BatchResult = {
    total: number
    created: number
    failed: number
    errors: string[]
}

// ─── Auth guard ────────────────────────────────────────────────────────

async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    // Supabase auth.getUser() returns an error on refresh token failure
    if (error || !user) {
        throw new Error('AUTH_ERROR')
    }

    const { data } = await supabase
        .from('roles_pengguna')
        .select('role')
        .eq('email', user.email)
        .single()

    if (data?.role !== 'admin') throw new Error('FORBIDDEN')
    return supabase
}

// ─── Fetch ─────────────────────────────────────────────────────────────

export async function fetchAwardeeUsers(): Promise<PenggunaRow[]> {
    const supabase = await requireAdmin()
    const { data, error } = await supabase
        .from('roles_pengguna')
        .select('*')
        .eq('role', 'awardee')
        .order('angkatan', { ascending: false })
        .order('name', { ascending: true })

    if (error) throw new Error('Gagal memuat data pengguna: ' + error.message)
    return (data || []) as PenggunaRow[]
}

// ─── Create Single User ───────────────────────────────────────────────

export async function createSingleUser(formData: FormData): Promise<ActionResult> {
    try {
        await requireAdmin()
    } catch (e: any) {
        return { error: e.message === 'AUTH_ERROR' ? 'Sesi berakhir, silakan muat ulang halaman' : 'Akses ditolak' }
    }
    const adminSupabase = createAdminClient()

    const name = (formData.get('name') as string)?.trim()
    const email = (formData.get('email') as string)?.trim()
    const password = (formData.get('password') as string)
    const angkatan = (formData.get('angkatan') as string)?.trim() || null
    const gender = (formData.get('gender') as string)?.trim() || null
    const batch = (formData.get('batch') as string)?.trim() || null
    const asal_univ = (formData.get('asal_univ') as string)?.trim() || null
    const spreadsheetUrl = (formData.get('spreadsheet_url') as string)?.trim() || ''
    const spreadsheet_id = extractSpreadsheetId(spreadsheetUrl)

    if (!name || !email || !password) {
        return { error: 'Nama, Email, dan Password wajib diisi.' }
    }
    if (password.length < 6) {
        return { error: 'Password minimal 6 karakter.' }
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    })

    if (authError) {
        if (authError.message.includes('already been registered')) {
            return { error: `Email ${email} sudah terdaftar.` }
        }
        return { error: 'Gagal membuat akun: ' + authError.message }
    }

    // 2. Insert into roles_pengguna
    const { error: insertError } = await adminSupabase
        .from('roles_pengguna')
        .insert({
            name,
            email,
            role: 'awardee',
            angkatan,
            gender,
            batch,
            asal_univ,
            status: 'aktif',
            auth_uid: authData.user.id,
            spreadsheet_id: spreadsheet_id || null,
        })

    if (insertError) {
        // Rollback: delete auth user if insert failed
        await adminSupabase.auth.admin.deleteUser(authData.user.id)
        return { error: 'Gagal menyimpan data pengguna: ' + insertError.message }
    }

    revalidatePath('/dashboard/admin/pengguna/awardee')
    return { success: `Pengguna ${name} berhasil ditambahkan!` }
}

// ─── Create Batch Users ───────────────────────────────────────────────

export async function createBatchUsers(
    users: { name: string; email: string; password: string; spreadsheet_url?: string; asal_univ?: string }[],
    sharedData: { angkatan: string; gender: string; batch: string }
): Promise<BatchResult> {
    try { await requireAdmin() } catch { return { total: users.length, created: 0, failed: users.length, errors: ['Sesi berakhir, silakan muat ulang halaman'] } }
    const adminSupabase = createAdminClient()

    const result: BatchResult = { total: users.length, created: 0, failed: 0, errors: [] }

    for (const u of users) {
        const name = u.name?.trim()
        const email = u.email?.trim()
        const password = u.password

        if (!name || !email || !password) {
            result.failed++
            result.errors.push(`${email || 'N/A'}: Data tidak lengkap`)
            continue
        }

        // Create auth user
        const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        })

        if (authError) {
            result.failed++
            result.errors.push(`${email}: ${authError.message}`)
            continue
        }

        // Insert into roles_pengguna
        const spreadsheet_id = extractSpreadsheetId(u.spreadsheet_url || '')
        const { error: insertError } = await adminSupabase
            .from('roles_pengguna')
            .insert({
                name,
                email,
                role: 'awardee',
                angkatan: sharedData.angkatan || null,
                gender: sharedData.gender || null,
                batch: sharedData.batch || null,
                asal_univ: u.asal_univ || null,
                status: 'aktif',
                auth_uid: authData.user.id,
                spreadsheet_id: spreadsheet_id || null,
            })

        if (insertError) {
            await adminSupabase.auth.admin.deleteUser(authData.user.id)
            result.failed++
            result.errors.push(`${email}: ${insertError.message}`)
            continue
        }

        result.created++
    }

    revalidatePath('/dashboard/admin/pengguna/awardee')
    return result
}

// ─── Update User ──────────────────────────────────────────────────────

export async function updateUser(id: number, formData: FormData): Promise<ActionResult> {
    let supabase;
    try { supabase = await requireAdmin() } catch { return { error: 'Sesi berakhir, silakan muat ulang halaman' } }
    const adminSupabase = createAdminClient()

    const name = (formData.get('name') as string)?.trim()
    const newEmail = (formData.get('email') as string)?.trim()
    const angkatan = (formData.get('angkatan') as string)?.trim() || null
    const gender = (formData.get('gender') as string)?.trim() || null
    const batch = (formData.get('batch') as string)?.trim() || null
    const asal_univ = (formData.get('asal_univ') as string)?.trim() || null
    const spreadsheetUrl = (formData.get('spreadsheet_url') as string)?.trim() || ''
    const spreadsheet_id = extractSpreadsheetId(spreadsheetUrl)

    if (!name) return { error: 'Nama wajib diisi.' }

    // Get current user data for auth_uid and old email
    const { data: currentUser } = await supabase
        .from('roles_pengguna')
        .select('auth_uid, email')
        .eq('id', id)
        .single()

    // Update email in Supabase Auth if changed
    if (newEmail && currentUser?.email && newEmail !== currentUser.email && currentUser.auth_uid) {
        const { error: authEmailError } = await adminSupabase.auth.admin.updateUserById(
            currentUser.auth_uid,
            { email: newEmail, email_confirm: true }
        )
        if (authEmailError) return { error: 'Gagal mengubah email di Auth: ' + authEmailError.message }
    }

    const updatePayload: Record<string, unknown> = { name, angkatan, gender, batch, asal_univ }
    if (newEmail && newEmail !== currentUser?.email) updatePayload.email = newEmail
    if (spreadsheet_id !== undefined) updatePayload.spreadsheet_id = spreadsheet_id || null

    const { error } = await supabase
        .from('roles_pengguna')
        .update(updatePayload)
        .eq('id', id)

    if (error) return { error: 'Gagal memperbarui pengguna: ' + error.message }

    revalidatePath('/dashboard/admin/pengguna/awardee')
    return { success: `Data ${name} berhasil diperbarui!` }
}

// ─── Reset Password ───────────────────────────────────────────────────

export async function resetUserPassword(id: number, newPassword: string): Promise<ActionResult> {
    try { await requireAdmin() } catch { return { error: 'Sesi berakhir, silakan muat ulang halaman' } }
    const adminSupabase = createAdminClient()
    const supabase = await createClient()

    if (!newPassword || newPassword.length < 6) {
        return { error: 'Password baru minimal 6 karakter.' }
    }

    const { data: userData } = await supabase
        .from('roles_pengguna')
        .select('auth_uid, name')
        .eq('id', id)
        .single()

    if (!userData?.auth_uid) {
        return { error: 'Auth UID tidak ditemukan untuk pengguna ini.' }
    }

    const { error } = await adminSupabase.auth.admin.updateUserById(
        userData.auth_uid,
        { password: newPassword }
    )

    if (error) return { error: 'Gagal mereset password: ' + error.message }
    return { success: `Password ${userData.name} berhasil direset!` }
}

// ─── Delete User ──────────────────────────────────────────────────────

export async function deleteUser(id: number): Promise<ActionResult> {
    let supabase;
    try { supabase = await requireAdmin() } catch { return { error: 'Sesi berakhir, silakan muat ulang halaman' } }
    const adminSupabase = createAdminClient()

    // Get the auth_uid first
    const { data: userData } = await supabase
        .from('roles_pengguna')
        .select('auth_uid, name')
        .eq('id', id)
        .single()

    // Delete from roles_pengguna
    const { error: deleteError } = await supabase
        .from('roles_pengguna')
        .delete()
        .eq('id', id)

    if (deleteError) return { error: 'Gagal menghapus pengguna: ' + deleteError.message }

    // Delete auth user if auth_uid exists
    if (userData?.auth_uid) {
        await adminSupabase.auth.admin.deleteUser(userData.auth_uid)
    }

    revalidatePath('/dashboard/admin/pengguna/awardee')
    return { success: `Pengguna ${userData?.name || ''} berhasil dihapus.` }
}

// ─── Toggle Single User Status ────────────────────────────────────────

export async function toggleUserStatus(id: number, newStatus: string): Promise<ActionResult> {
    let supabase;
    try { supabase = await requireAdmin() } catch { return { error: 'Sesi berakhir, silakan muat ulang halaman' } }

    const { error } = await supabase
        .from('roles_pengguna')
        .update({ status: newStatus })
        .eq('id', id)

    if (error) return { error: 'Gagal mengubah status: ' + error.message }

    revalidatePath('/dashboard/admin/pengguna/awardee')
    return { success: `Status berhasil diubah menjadi ${newStatus}.` }
}

// ─── Toggle Batch Status ──────────────────────────────────────────────

export async function toggleBatchStatus(angkatan: string, newStatus: string): Promise<ActionResult> {
    let supabase;
    try { supabase = await requireAdmin() } catch { return { error: 'Sesi berakhir, silakan muat ulang halaman' } }

    const { error, count } = await supabase
        .from('roles_pengguna')
        .update({ status: newStatus })
        .eq('role', 'awardee')
        .eq('angkatan', angkatan)

    if (error) return { error: 'Gagal mengubah status batch: ' + error.message }

    revalidatePath('/dashboard/admin/pengguna/awardee')
    return { success: `Semua awardee angkatan ${angkatan} berhasil diubah ke ${newStatus}.` }
}

// ─── FASILITATOR ACTIONS ───────────────────────────────────────────────

export async function fetchFasilitatorUsers(): Promise<PenggunaRow[]> {
    const supabase = await requireAdmin()
    const { data, error } = await supabase
        .from('roles_pengguna')
        .select('*')
        .eq('role', 'fasilitator')
        .order('angkatan', { ascending: false })
        .order('name', { ascending: true })

    if (error) throw new Error('Gagal memuat data pengguna: ' + error.message)
    return (data || []) as PenggunaRow[]
}

export async function createSingleFasilitator(formData: FormData): Promise<ActionResult> {
    try { await requireAdmin() } catch { return { error: 'Sesi berakhir, silakan muat ulang halaman' } }
    const adminSupabase = createAdminClient()

    const name = (formData.get('name') as string)?.trim()
    const email = (formData.get('email') as string)?.trim()
    const password = (formData.get('password') as string)
    const angkatan = (formData.get('angkatan') as string)?.trim() || null
    const gender = (formData.get('gender') as string)?.trim() || null
    const batch = (formData.get('batch') as string)?.trim() || null

    if (!name || !email || !password) {
        return { error: 'Nama, Email, dan Password wajib diisi.' }
    }
    if (password.length < 6) return { error: 'Password minimal 6 karakter.' }

    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email, password, email_confirm: true,
    })

    if (authError) {
        if (authError.message.includes('already been registered')) return { error: `Email ${email} sudah terdaftar.` }
        return { error: 'Gagal membuat akun: ' + authError.message }
    }

    const { error: insertError } = await adminSupabase
        .from('roles_pengguna')
        .insert({
            name, email, role: 'fasilitator',
            angkatan, gender, batch, status: 'aktif',
            auth_uid: authData.user.id,
        })

    if (insertError) {
        await adminSupabase.auth.admin.deleteUser(authData.user.id)
        return { error: 'Gagal menyimpan data pengguna: ' + insertError.message }
    }

    revalidatePath('/dashboard/admin/pengguna/fasilitator')
    return { success: `Fasilitator ${name} berhasil ditambahkan!` }
}

export async function createBatchFasilitators(
    users: { name: string; email: string; password: string }[],
    sharedData: { angkatan: string; gender: string; batch: string }
): Promise<BatchResult> {
    try { await requireAdmin() } catch { return { total: users.length, created: 0, failed: users.length, errors: ['Sesi berakhir, silakan muat ulang halaman'] } }
    const adminSupabase = createAdminClient()
    const result: BatchResult = { total: users.length, created: 0, failed: 0, errors: [] }

    for (const u of users) {
        const name = u.name?.trim()
        const email = u.email?.trim()
        const password = u.password

        if (!name || !email || !password) {
            result.failed++
            result.errors.push(`${email || 'N/A'}: Data tidak lengkap`)
            continue
        }

        const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
            email, password, email_confirm: true,
        })

        if (authError) {
            result.failed++; result.errors.push(`${email}: ${authError.message}`); continue
        }

        const { error: insertError } = await adminSupabase
            .from('roles_pengguna')
            .insert({
                name, email, role: 'fasilitator',
                angkatan: sharedData.angkatan || null,
                gender: sharedData.gender || null,
                batch: sharedData.batch || null,
                status: 'aktif', auth_uid: authData.user.id,
            })

        if (insertError) {
            await adminSupabase.auth.admin.deleteUser(authData.user.id)
            result.failed++; result.errors.push(`${email}: ${insertError.message}`); continue
        }
        result.created++
    }

    revalidatePath('/dashboard/admin/pengguna/fasilitator')
    return result
}

export async function updateFasilitator(id: number, formData: FormData): Promise<ActionResult> {
    let supabase;
    try { supabase = await requireAdmin() } catch { return { error: 'Sesi berakhir, silakan muat ulang halaman' } }
    const adminSupabase = createAdminClient()

    const name = (formData.get('name') as string)?.trim()
    const newEmail = (formData.get('email') as string)?.trim()
    const angkatan = (formData.get('angkatan') as string)?.trim() || null
    const gender = (formData.get('gender') as string)?.trim() || null
    const batch = (formData.get('batch') as string)?.trim() || null

    if (!name) return { error: 'Nama wajib diisi.' }

    const { data: currentUser } = await supabase.from('roles_pengguna').select('auth_uid, email').eq('id', id).single()

    if (newEmail && currentUser?.email && newEmail !== currentUser.email && currentUser.auth_uid) {
        const { error: authEmailError } = await adminSupabase.auth.admin.updateUserById(
            currentUser.auth_uid, { email: newEmail, email_confirm: true }
        )
        if (authEmailError) return { error: 'Gagal mengubah email di Auth: ' + authEmailError.message }
    }

    const updatePayload: Record<string, unknown> = { name, angkatan, gender, batch }
    if (newEmail && newEmail !== currentUser?.email) updatePayload.email = newEmail

    const { error } = await supabase.from('roles_pengguna').update(updatePayload).eq('id', id)
    if (error) return { error: 'Gagal memperbarui pengguna: ' + error.message }

    revalidatePath('/dashboard/admin/pengguna/fasilitator')
    return { success: `Data ${name} berhasil diperbarui!` }
}

export async function toggleFasilitatorBatchStatus(angkatan: string, newStatus: string): Promise<ActionResult> {
    let supabase;
    try { supabase = await requireAdmin() } catch { return { error: 'Sesi berakhir, silakan muat ulang halaman' } }
    const { error } = await supabase.from('roles_pengguna').update({ status: newStatus }).eq('role', 'fasilitator').eq('angkatan', angkatan)
    if (error) return { error: 'Gagal mengubah status batch: ' + error.message }
    revalidatePath('/dashboard/admin/pengguna/fasilitator')
    return { success: `Semua fasilitator angkatan ${angkatan} berhasil diubah ke ${newStatus}.` }
}

export async function deleteFasilitatorUser(id: number): Promise<ActionResult> {
    const res = await deleteUser(id) // reuses deleteUser logic
    revalidatePath('/dashboard/admin/pengguna/fasilitator')
    return res
}

export async function toggleFasilitatorStatus(id: number, newStatus: string): Promise<ActionResult> {
    const res = await toggleUserStatus(id, newStatus) // reuses logic
    revalidatePath('/dashboard/admin/pengguna/fasilitator')
    return res
}

// ─── Helper ───────────────────────────────────────────────────────────

function extractSpreadsheetId(url: string): string | null {
    if (!url) return null
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
    return match?.[1] || url // If it's already just an ID, use as-is
}
