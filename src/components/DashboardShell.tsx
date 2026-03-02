'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { menuConfig, MenuItem } from '@/src/lib/menuConfig'
import { Menu, X, LogOut, ChevronDown, ChevronRight } from 'lucide-react'
import { logoutAction } from '@/app/dashboard/actions'

type DashboardShellProps = {
    children: React.ReactNode;
    roleName: string;
    displayName: string;
    avatarUrl: string | null;
}

export default function DashboardShell({
    children,
    roleName,
    displayName,
    avatarUrl,
}: DashboardShellProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})
    const pathname = usePathname()

    const toggleMenu = (title: string) => {
        setOpenMenus(prev => ({
            ...prev,
            [title]: !prev[title]
        }))
    }

    const roleKey = roleName.toUpperCase()
    const menus = menuConfig[roleKey] || menuConfig['AWARDEE']

    const renderMenuItem = (item: MenuItem, depth = 0) => {
        const hasSubmenu = item.submenu && item.submenu.length > 0;
        const isOpen = openMenus[item.title];
        const isActive = item.path === pathname || (item.path !== '#' && item.path !== '' && pathname.startsWith(item.path || 'invalid_path'));
        const Icon = item.icon;

        return (
            <div key={item.title} className="mb-1 w-full">
                {hasSubmenu ? (
                    <button
                        onClick={() => toggleMenu(item.title)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-blue-50 text-[#00529C]' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        style={{ paddingLeft: `${depth * 1 + 1}rem` }}
                    >
                        <div className="flex items-center">
                            {Icon && <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[#00529C]' : 'text-gray-400'}`} />}
                            {item.title}
                        </div>
                        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </button>
                ) : (
                    <Link
                        href={item.path || '#'}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-blue-50 text-[#00529C]' : 'text-gray-700 hover:bg-gray-50 hover:text-[#00529C]'
                            }`}
                        style={{ paddingLeft: `${depth * 1 + 1}rem` }}
                    >
                        {Icon && <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[#00529C]' : 'text-gray-400'}`} />}
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
        <div className="min-h-screen bg-gray-50 flex font-sans">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between md:justify-center">
                    <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#00529C] to-[#15A4FA] rounded-xl flex items-center justify-center text-white font-bold text-xl mr-3 shadow-md">
                            B
                        </div>
                        <h1 className="font-bold text-[#00529C] tracking-tight leading-tight">Bright Scholarship<br /><span className="text-[#15A4FA] text-sm">RO Makassar</span></h1>
                    </div>
                    <button className="md:hidden text-gray-500 hover:text-gray-700" onClick={() => setIsMobileMenuOpen(false)}>
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* User Info Section */}
                <div className="p-6 border-b border-gray-100 flex flex-col items-center">
                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-[#00529C] text-3xl font-bold mb-4 shadow-sm border-4 border-white ring-2 ring-blue-100 overflow-hidden">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            displayName.charAt(0).toUpperCase()
                        )}
                    </div>
                    <h2 className="font-bold text-gray-800 text-center text-base truncate w-full px-2" title={displayName}>
                        {displayName}
                    </h2>
                    <span className="mt-2 px-4 py-1.5 bg-[#15A4FA]/10 text-[#00529C] text-xs font-bold rounded-full uppercase tracking-wider">
                        {roleName}
                    </span>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                    {menus.map(item => renderMenuItem(item))}
                </nav>

                {/* Logout Button */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <form action={logoutAction}>
                        <button
                            type="submit"
                            className="flex items-center w-full px-4 py-3 text-sm font-semibold text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="w-5 h-5 mr-3" />
                            Keluar
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 md:pt-0 pt-16 h-screen overflow-y-auto bg-gray-50">
                {/* Mobile Header (Visible only on small screens) */}
                <div className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-sm h-16 flex items-center justify-between px-4 md:hidden">
                    <div className="flex items-center">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-600 hover:text-[#00529C] mr-4 transition-colors">
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="w-8 h-8 bg-gradient-to-br from-[#00529C] to-[#15A4FA] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            B
                        </div>
                    </div>
                    <Link href="/dashboard/profile" className="text-gray-600">
                        <div className="w-9 h-9 rounded-full bg-blue-50 border-2 border-white ring-1 ring-blue-100 flex items-center justify-center text-[#00529C] font-bold overflow-hidden shadow-sm">
                            {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : displayName.charAt(0).toUpperCase()}
                        </div>
                    </Link>
                </div>

                {/* Page Content */}
                <main className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
                    {children}
                </main>
            </div>
        </div>
    )
}
