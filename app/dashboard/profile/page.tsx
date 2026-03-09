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
        .select('name, spreadsheet_id, sheet_config, role')
        .eq('email', user.email)
        .single()

    const initialData = {
        name: userData?.name || user.email?.split('@')[0] || '',
        email: user.email || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        spreadsheet_id: userData?.spreadsheet_id || '',
        sheet_config: (userData?.sheet_config as Record<string, string> | null) || null,
        role: userData?.role || '',
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Pengaturan Profil</h1>
                <p className="text-gray-500 dark:text-slate-300 text-sm mt-1">Kelola identitas, konfigurasi spreadsheet, dan kata sandi Anda.</p>
            </div>
            <ProfileForms initialData={initialData} />
        </div>
    )
}
