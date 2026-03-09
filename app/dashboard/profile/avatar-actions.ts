'use server'

import { createClient } from '@/src/utils/supabase/server'

export async function uploadAvatarAction(formData: FormData) {
    const file = formData.get('avatar') as File
    if (!file || file.size === 0) {
        return { error: 'Harap pilih file gambar terlebih dahulu.' }
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        return { error: 'Hanya file gambar yang diperbolehkan.' }
    }

    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
        return { error: 'Ukuran gambar maksimal adalah 2MB.' }
    }

    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        return { error: 'Sesi kedaluwarsa. Silakan login kembali.' }
    }

    // Unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
    const filePath = `public/${fileName}`

    // Convert file to Buffer to ensure compatibility with Supabase storage in Node.js
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 1. Upload to Supabase Storage Bucket 'avatars'
    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, buffer, { 
            upsert: true,
            contentType: file.type
        })

    if (uploadError) {
        return { error: 'Gagal mengunggah gambar: ' + uploadError.message }
    }

    // 2. Get Public URL
    const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

    const avatarUrl = publicUrlData.publicUrl

    // 3. Update User Metadata (can also be saved to roles_pengguna table if preferred)
    const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl }
    })

    if (updateError) {
        return { error: 'Gagal memperbarui profil: ' + updateError.message }
    }

    return { success: 'Foto profil berhasil diperbarui!', avatarUrl }
}
