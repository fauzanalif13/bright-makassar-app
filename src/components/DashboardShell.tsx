'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { menuConfig, MenuItem } from '@/src/lib/menuConfig'
import { Menu, X, LogOut, ChevronDown, ChevronRight } from 'lucide-react'
import { logoutAction } from '@/app/dashboard/actions'
import { useTheme } from '@/src/components/ThemeProvider'

type DashboardShellProps = {
    children: React.ReactNode;
    roleName: string;
    displayName: string;
    avatarUrl: string | null;
    subtitle?: string;
}

export default function DashboardShell({
    children,
    roleName,
    displayName,
    avatarUrl,
    subtitle,
}: DashboardShellProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const pathname = usePathname()
    const { isDark } = useTheme()

    // Helper: check if any child path matches the current pathname
    const hasActiveChild = (item: MenuItem): boolean => {
        if (!item.submenu) return false
        return item.submenu.some(sub =>
            (sub.path && sub.path !== '#' && pathname.startsWith(sub.path)) ||
            hasActiveChild(sub)
        )
    }

    // Auto-open dropdowns that contain the active child
    const roleKey = roleName.toUpperCase()
    const menus = menuConfig[roleKey] || menuConfig['AWARDEE']
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {}
        menus.forEach(item => {
            if (item.submenu && hasActiveChild(item)) {
                initial[item.title] = true
            }
        })
        return initial
    })

    const toggleMenu = (title: string) => {
        setOpenMenus(prev => ({
            ...prev,
            [title]: !prev[title]
        }))
    }

    const renderMenuItem = (item: MenuItem, depth = 0) => {
        const hasSubmenu = item.submenu && item.submenu.length > 0;
        const isOpen = openMenus[item.title];

        // For items WITH a submenu: highlight if any child is active
        // For leaf items: exact match only (prevents Dashboard from matching all sub-paths)
        const isActive = hasSubmenu
            ? hasActiveChild(item)
            : (item.path === pathname);

        const Icon = item.icon;

        return (
            <div key={item.title} className="mb-1 w-full">
                {hasSubmenu ? (
                    <button
                        onClick={() => toggleMenu(item.title)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive
                            ? 'bg-blue-50 text-[#00529C] dark:bg-[#00529C]/20 dark:text-[#60b5ff]'
                            : 'text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700/50'
                            }`}
                        style={{ paddingLeft: `${depth * 1 + 1}rem` }}
                    >
                        <div className="flex items-center">
                            {Icon && <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[#00529C] dark:text-[#60b5ff]' : 'text-gray-400 dark:text-slate-500'}`} />}
                            {item.title}
                        </div>
                        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-500" /> : <ChevronRight className="w-4 h-4 text-gray-400 dark:text-slate-500" />}
                    </button>
                ) : (
                    <Link
                        href={item.path || '#'}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive
                            ? 'bg-blue-50 text-[#00529C] dark:bg-[#00529C]/20 dark:text-[#60b5ff]'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-[#00529C] dark:text-slate-300 dark:hover:bg-slate-700/50 dark:hover:text-[#60b5ff]'
                            }`}
                        style={{ paddingLeft: `${depth * 1 + 1}rem` }}
                    >
                        {Icon && <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[#00529C] dark:text-[#60b5ff]' : 'text-gray-400 dark:text-slate-500'}`} />}
                        {item.title}
                    </Link>
                )}

                {hasSubmenu && isOpen && (
                    <div className="mt-1 space-y-1">
                        {item.submenu!.map(sub => renderMenuItem(sub, depth + 1))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex font-sans">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between md:justify-center">
                    <div className="flex items-center">
                        <div className="flex items-center align-middle space-x-4">
                            <img src={isDark ? '/logo-ybm-white.png' : '/logo-ybm.png'} alt="Logo" width={100} height={100} />
                            <img src="/logo-bright.png" alt="Logo" width={100} height={100} />
                        </div>
                    </div>
                    <button className="md:hidden text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200" onClick={() => setIsMobileMenuOpen(false)}>
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* User Info Section */}
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex flex-col items-center">
                    <div className="w-24 h-24 bg-blue-50 dark:bg-[#00529C]/20 rounded-full flex items-center justify-center text-[#00529C] dark:text-[#60b5ff] text-3xl font-bold mb-4 shadow-sm border-4 border-white dark:border-slate-800 ring-2 ring-blue-100 dark:ring-[#00529C]/30 overflow-hidden">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            displayName.charAt(0).toUpperCase()
                        )}
                    </div>
                    <h2 className="font-bold text-gray-800 dark:text-slate-100 text-center text-base truncate w-full px-2" title={displayName}>
                        {displayName}
                    </h2>
                    <span className="mt-2 px-4 py-1.5 bg-[#15A4FA]/10 text-[#00529C] dark:text-[#60b5ff] text-xs font-bold rounded-full uppercase tracking-wider">
                        {roleName}
                    </span>
                    {subtitle && (
                        <p className="mt-1.5 text-[11px] text-gray-500 dark:text-slate-400 font-medium">{subtitle}</p>
                    )}
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                    {menus.map(item => renderMenuItem(item))}
                </nav>

                {/* Logout Button */}
                <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                    <form action={logoutAction}>
                        <button
                            type="submit"
                            className="flex items-center w-full px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <LogOut className="w-5 h-5 mr-3" />
                            Keluar
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 md:pt-0 pt-16 h-screen overflow-y-auto bg-gray-50 dark:bg-slate-950">
                {/* Mobile Header (Visible only on small screens) */}
                <div className="fixed top-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-sm h-16 flex items-center justify-between px-4 md:hidden">
                    <div className="flex items-center">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-600 hover:text-[#00529C] dark:text-slate-400 dark:hover:text-[#60b5ff] mr-4 transition-colors">
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex items-center align-middle space-x-4">
                            <img src={isDark ? '/logo-ybm-white.png' : '/logo-ybm.png'} alt="Logo" width={50} height={50} />
                            <img src="/logo-bright.png" alt="Logo" width={50} height={50} />
                        </div>
                    </div>
                    <Link href="/dashboard/profile" className="text-gray-600 dark:text-slate-400">
                        <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-[#00529C]/20 border-2 border-white dark:border-slate-800 ring-1 ring-blue-100 dark:ring-[#00529C]/30 flex items-center justify-center text-[#00529C] dark:text-[#60b5ff] font-bold overflow-hidden shadow-sm">
                            {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : displayName.charAt(0).toUpperCase()}
                        </div>
                    </Link>
                </div>

                {/* Page Content */}
                <main className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full flex-1">
                    {children}
                </main>

                {/* Footer */}
                <footer className="w-full border-t border-gray-200 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm mt-auto">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-5">
                        {/* Credit line */}
                        <p className="text-center text-sm text-gray-600 dark:text-slate-400 font-medium">
                            Made by{' '}
                            <span className="text-[#00529C] dark:text-[#60b5ff] font-semibold">Fauzan Alif Anwar</span>
                            <span className="text-gray-400 dark:text-slate-600 mx-1.5">•</span>
                            Fasilitator Putra YBM BRILiaN RO Makassar
                        </p>

                        {/* Copyright & social links */}
                        <div className="mt-3 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-gray-500 dark:text-slate-500">
                            {/* Copyright */}
                            <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M14.83 14.83a4 4 0 1 1 0-5.66" />
                                </svg>
                                2026
                            </span>

                            <span className="hidden sm:inline text-gray-300 dark:text-slate-700">|</span>

                            {/* Instagram */}
                            <a
                                href="https://instagram.com/barengsiojan"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-gray-500 dark:text-slate-500 hover:text-[#E1306C] dark:hover:text-[#E1306C] transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                                </svg>
                                @barengsiojan
                            </a>

                            <span className="hidden sm:inline text-gray-300 dark:text-slate-700">|</span>

                            {/* LinkedIn */}
                            <a
                                href="https://linkedin.com/in/fauzanalif"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-gray-500 dark:text-slate-500 hover:text-[#0A66C2] dark:hover:text-[#60b5ff] transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                                    <rect x="2" y="9" width="4" height="12" />
                                    <circle cx="4" cy="4" r="2" />
                                </svg>
                                Fauzan Alif Anwar
                            </a>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    )
}
