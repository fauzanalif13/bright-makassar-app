'use server'

import { createClient } from '@/src/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Email dan password harus diisi.' }
    }

    const supabase = await createClient()

    // 1. Lakukan autentikasi menggunakan Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
            return { error: 'Email atau password salah.' }
        }
        return { error: 'Terjadi kesalahan otentikasi: ' + authError.message }
    }

    // 2. Ambil role pengguna dari tabel roles_pengguna berdasarkan email
    const { data: userData, error: userError } = await supabase
        .from('roles_pengguna')
        .select('role')
        .eq('email', authData.user.email)
        .single()

    if (userError || !userData) {
        // Sign out user if their role is not found so they don't get stuck
        await supabase.auth.signOut()
        return { error: 'Akun Anda belum terdaftar dalam sistem peran (role tidak ditemukan).' }
    }

    // 3. Arahkan pengguna berdasarkan role-nya
    if (userData.role === 'admin') {
        redirect('/dashboard/admin')
    } else if (userData.role === 'fasilitator') {
        redirect('/dashboard/fasilitator')
    } else if (userData.role === 'awardee') {
        redirect('/dashboard/awardee')
    } else {
        await supabase.auth.signOut()
        return { error: `Role '${userData.role}' tidak memiliki akses yang valid.` }
    }
}
