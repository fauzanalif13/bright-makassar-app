import { createClient } from '@/src/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from '@/src/components/DashboardShell'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch user details including name and role
    const { data: userData } = await supabase
        .from('roles_pengguna')
        .select('name, role')
        .eq('email', user.email)
        .single()

    const roleName = userData?.role || 'Pengguna'
    const displayName = userData?.name || user.email?.split('@')[0] || 'Member'
    const userMetadata = user.user_metadata || {}
    const avatarUrl = userMetadata.avatar_url || null

    return (
        <DashboardShell
            roleName={roleName}
            displayName={displayName}
            avatarUrl={avatarUrl}
        >
            {children}
        </DashboardShell>
    )
}
