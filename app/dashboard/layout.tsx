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

    const { data: userData } = await supabase
        .from('roles_pengguna')
        .select('name, role, batch, gender')
        .eq('email', user.email)
        .single()

    const roleName = userData?.role || 'Pengguna'
    const displayName = userData?.name || user.email?.split('@')[0] || 'Member'
    const userMetadata = user.user_metadata || {}
    const avatarUrl = userMetadata.avatar_url || null

    // Build subtitle: "Awardee / BS 8 / Putra"
    const subtitleParts: string[] = [roleName.charAt(0).toUpperCase() + roleName.slice(1)]
    if (userData?.batch) subtitleParts.push(`BS ${userData.batch}`)
    if (userData?.gender) subtitleParts.push(userData.gender)
    const subtitle = subtitleParts.join(' / ')

    return (
        <DashboardShell
            roleName={roleName}
            displayName={displayName}
            avatarUrl={avatarUrl}
            subtitle={subtitle}
        >
            {children}
        </DashboardShell>
    )
}
