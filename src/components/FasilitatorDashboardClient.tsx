'use client'

import { useState } from 'react'
import { Newspaper, BarChart3, User, Calendar } from 'lucide-react'
import KabarBaruTab from '@/src/components/tabs/KabarBaruTab'
import RekapLaporanTab from '@/src/components/tabs/RekapLaporanTab'
import RekapIndividuTab from '@/src/components/tabs/RekapIndividuTab'
import type { AwardeeFullInfo } from '@/app/dashboard/fasilitator/actions'

type Props = {
    displayName: string
    awardees: AwardeeFullInfo[]
}

type TabKey = 'kabar-baru' | 'rekap-laporan' | 'rekap-individu'

const TAB_CONFIG: { key: TabKey; label: string; icon: any }[] = [
    { key: 'kabar-baru', label: 'Kabar Baru', icon: Newspaper },
    { key: 'rekap-laporan', label: 'Rekap Laporan', icon: BarChart3 },
    { key: 'rekap-individu', label: 'Rekap Individu', icon: User },
]

export default function FasilitatorDashboardClient({ displayName, awardees }: Props) {
    const [activeTab, setActiveTab] = useState<TabKey>('kabar-baru')

    return (
        <div className="space-y-8">
            {/* Hero Banner */}
            <div className="bg-gradient-to-r from-[#00529C] to-[#15A4FA] rounded-3xl p-8 md:p-10 shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2" />
                <div className="relative z-10">
                    <h1 className="text-3xl md:text-4xl font-black mb-3">Selamat datang, {displayName}!</h1>
                    <p className="text-blue-50 text-lg opacity-90 max-w-2xl">Pantau perkembangan ibadah dan aktivitas seluruh awardee di wilayah Anda melalui dashboard ini.</p>
                    <div className="flex items-center gap-2 text-blue-100 text-xs font-medium bg-white/10 px-3 py-1.5 rounded-lg mt-4 w-fit">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date().toLocaleDateString('id-ID', {
                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                        })}
                    </div>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit overflow-x-auto max-w-full">
                {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex items-center whitespace-nowrap gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            activeTab === key
                                ? 'bg-white dark:bg-slate-700 text-[#00529C] dark:text-[#60b5ff] shadow-sm'
                                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'kabar-baru' && <KabarBaruTab />}
            {activeTab === 'rekap-laporan' && <RekapLaporanTab />}
            {activeTab === 'rekap-individu' && <RekapIndividuTab awardees={awardees} />}
        </div>
    )
}
