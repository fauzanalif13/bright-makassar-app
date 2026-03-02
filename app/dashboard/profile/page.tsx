import { createClient } from '@/src/utils/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForms from './ProfileForms'

export default async function ProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: userData } = await supabase
        .from('roles_pengguna')
        .select('name, spreadsheet_id, sheet_config')
        .eq('email', user.email)
        .single()

    const initialData = {
        name: userData?.name || user.email?.split('@')[0] || '',
        email: user.email || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        spreadsheet_id: userData?.spreadsheet_id || '',
        sheet_config: (userData?.sheet_config as { ibadah_sheet?: string; rerata_range?: string } | null) || null,
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Pengaturan Profil</h1>
                <p className="text-gray-500 mt-1 max-w-2xl leading-relaxed">Kelola identitas publik, alamat email, kata sandi, dan foto profil Anda. Beberapa perubahan mungkin memerlukan verifikasi masuk ulang.</p>
            </div>

            <ProfileForms initialData={initialData} />
        </div>
    )
}
