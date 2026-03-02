'use client'

import { useState, useTransition } from 'react'
import { FasilitatorBarChart } from '@/src/components/charts/FasilitatorCharts'
import type { FasilitatorChartData } from '@/src/components/charts/FasilitatorCharts'
import { AwardeeIbadahMonthlyChart, AwardeeIbadahDailyChart } from '@/src/components/charts/AwardeeCharts'
import type { IbadahMonthlyChartData, IbadahDailyChartData } from '@/src/components/charts/AwardeeCharts'
import { getAwardeeChartData } from '@/app/dashboard/fasilitator/actions'
import type { AwardeeChartResult } from '@/app/dashboard/fasilitator/actions'
import { Users, User, Loader2, ChevronDown, BarChart3, Eye } from 'lucide-react'

type AwardeeInfo = {
    name: string
    spreadsheet_id: string | null
    sheet_config: { ibadah_sheet?: string; ibadah_sheet_name?: string } | null
}

type Props = {
    displayName: string
    aggregatedData: FasilitatorChartData[]
    awardees: AwardeeInfo[]
}

export default function FasilitatorDashboardClient({ displayName, aggregatedData, awardees }: Props) {
    const [activeTab, setActiveTab] = useState<'rekapan' | 'individu'>('rekapan')
    const [selectedAwardee, setSelectedAwardee] = useState<string>('')
    const [individualData, setIndividualData] = useState<AwardeeChartResult | null>(null)
    const [isPending, startTransition] = useTransition()

    function handleSelectAwardee(name: string) {
        setSelectedAwardee(name)
        setIndividualData(null)

        const awardee = awardees.find(a => a.name === name)
        if (!awardee?.spreadsheet_id) return

        const sheetName = awardee.sheet_config?.ibadah_sheet || awardee.sheet_config?.ibadah_sheet_name || 'LaporanIbadah'

        startTransition(async () => {
            try {
                const result = await getAwardeeChartData(awardee.spreadsheet_id!, sheetName)
                setIndividualData(result)
            } catch (err) {
                console.error('Failed to fetch individual data:', err)
            }
        })
    }

    return (
        <div className="space-y-8">
            {/* Hero Banner */}
            <div className="bg-gradient-to-r from-[#00529C] to-[#15A4FA] rounded-3xl p-8 md:p-10 shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                    <h1 className="text-3xl md:text-4xl font-black mb-3">Selamat datang, {displayName}!</h1>
                    <p className="text-blue-50 text-lg opacity-90 max-w-2xl">Pantau perkembangan ibadah dan aktivitas seluruh awardee di wilayah Anda melalui dashboard ini.</p>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('rekapan')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'rekapan'
                            ? 'bg-white text-[#00529C] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <BarChart3 className="w-4 h-4" />
                    Rekapan
                </button>
                <button
                    onClick={() => setActiveTab('individu')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'individu'
                            ? 'bg-white text-[#00529C] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Eye className="w-4 h-4" />
                    Individu
                </button>
            </div>

            {/* ─── Rekapan Tab ───────────────────────────────────────────── */}
            {activeTab === 'rekapan' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Rerata Ibadah Awardee (Angkatan)</h2>
                                <p className="text-sm text-gray-500">Rata-rata capaian ibadah seluruh awardee aktif bulan ini</p>
                            </div>
                        </div>
                        <FasilitatorBarChart data={aggregatedData} />
                    </div>

                    {/* Awardee Summary */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#00529C] flex items-center justify-center">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Daftar Awardee</h2>
                                <p className="text-xs text-gray-500">{awardees.length} awardee terdaftar</p>
                            </div>
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {awardees.map((a) => (
                                <div key={a.name} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-blue-50/50 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-[#00529C]/10 text-[#00529C] flex items-center justify-center text-xs font-bold shrink-0">
                                        {a.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{a.name}</p>
                                        <p className="text-[11px] text-gray-400">
                                            {a.spreadsheet_id ? '✅ Spreadsheet terkonfigurasi' : '⚠️ Belum ada spreadsheet'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {awardees.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-6">Belum ada awardee aktif</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Individu Tab ──────────────────────────────────────────── */}
            {activeTab === 'individu' && (
                <div className="space-y-6">
                    {/* Dropdown selector */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <User className="w-5 h-5 text-[#00529C]" />
                            <h2 className="text-lg font-bold text-gray-900">Pilih Awardee</h2>
                        </div>
                        <div className="relative max-w-md">
                            <select
                                value={selectedAwardee}
                                onChange={(e) => handleSelectAwardee(e.target.value)}
                                className="w-full appearance-none px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#15A4FA]/40 focus:border-[#15A4FA] transition-all cursor-pointer"
                            >
                                <option value="">-- Pilih Awardee --</option>
                                {awardees
                                    .filter(a => a.spreadsheet_id)
                                    .map((a) => (
                                        <option key={a.name} value={a.name}>{a.name}</option>
                                    ))
                                }
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Loading state */}
                    {isPending && (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 flex items-center justify-center">
                            <div className="text-center space-y-3">
                                <Loader2 className="w-8 h-8 text-[#15A4FA] animate-spin mx-auto" />
                                <p className="text-sm text-gray-500 font-medium">Memuat data {selectedAwardee}...</p>
                            </div>
                        </div>
                    )}

                    {/* Individual charts */}
                    {!isPending && individualData && selectedAwardee && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold text-[#00529C]">Dashboard {selectedAwardee}</h2>
                                    <p className="text-sm text-gray-500">Grafik ibadah individual bulan ini</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Daily Chart */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 text-center mb-2">Tren Harian</h3>
                                        <AwardeeIbadahDailyChart data={individualData.daily as IbadahDailyChartData[]} />
                                    </div>

                                    {/* Monthly Chart */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 text-center mb-2">Rerata Capaian (%)</h3>
                                        <AwardeeIbadahMonthlyChart data={individualData.monthly as IbadahMonthlyChartData[]} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {!isPending && !individualData && !selectedAwardee && (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 flex items-center justify-center">
                            <div className="text-center space-y-2">
                                <Users className="w-10 h-10 text-gray-300 mx-auto" />
                                <p className="text-gray-400 font-medium">Pilih awardee dari dropdown untuk melihat dashboard individu</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
