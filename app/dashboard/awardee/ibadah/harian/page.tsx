'use client'

import { useState, useTransition, useEffect } from 'react'
import { upsertIbadahHarian, getIbadahForDate } from './actions'
import toast from 'react-hot-toast'
import { BookOpen, Send, Loader2, CalendarDays, CheckCircle2, Edit3, PlusCircle, RefreshCw } from 'lucide-react'

const TOGGLE_ACTIVITIES = [
    { name: 'dzikirPagi', label: 'Dzikir Pagi', emoji: '🌅' },
    { name: 'mendoakan', label: "Mendo'akan / Memaafkan", emoji: '🤲' },
    { name: 'shalatDhuha', label: 'Shalat Dhuha', emoji: '☀️' },
    { name: 'membacaQuran', label: 'Membaca Al-Quran', emoji: '📖' },
    { name: 'shaumSunnah', label: 'Shaum Sunnah', emoji: '🌙' },
    { name: 'berinfak', label: 'Berinfak', emoji: '💝' },
]

type IbadahData = {
    shalatBerjamaah: string
    qiyamulLail: string
    dzikirPagi: boolean
    mendoakan: boolean
    shalatDhuha: boolean
    membacaQuran: boolean
    shaumSunnah: boolean
    berinfak: boolean
}

export default function LaporanIbadahHarianPage() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [existingData, setExistingData] = useState<IbadahData | null>(null)
    const [isEditing, setIsEditing] = useState(false) // true if row exists for selected date
    const [isFetching, startFetch] = useTransition()

    // Fetch data when date changes
    useEffect(() => {
        startFetch(async () => {
            const result = await getIbadahForDate(selectedDate)
            if (result.error) {
                toast.error(result.error)
                setExistingData(null)
                setIsEditing(false)
                return
            }
            if (result.data) {
                setExistingData(result.data)
                setIsEditing(true)
            } else {
                setExistingData(null)
                setIsEditing(false)
            }
        })
    }, [selectedDate])

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true)
        setSubmitted(false)
        const result = await upsertIbadahHarian(formData)
        setIsSubmitting(false)
        if (result.error) {
            toast.error(result.error)
        } else if (result.success) {
            toast.success(result.success)
            setSubmitted(true)
            setTimeout(() => setSubmitted(false), 3000)
        }
    }

    const d = existingData

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00529C] to-[#15A4FA] text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <BookOpen className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Laporan Ibadah Harian</h1>
                    <p className="text-gray-500 text-xs">Catat dan edit ibadah harianmu</p>
                </div>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Date Picker Bar */}
                <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-[#15A4FA]" />
                        <label htmlFor="datePicker" className="text-xs font-bold text-gray-700">Pilih Tanggal:</label>
                    </div>
                    <input
                        type="date"
                        id="datePicker"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-[#15A4FA]/40 focus:border-[#15A4FA] outline-none transition-all"
                    />
                    {isFetching && <Loader2 className="w-4 h-4 text-[#15A4FA] animate-spin" />}
                    {!isFetching && isEditing && (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                            <Edit3 className="w-3 h-3" />Mode Edit
                        </span>
                    )}
                    {!isFetching && !isEditing && (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                            <PlusCircle className="w-3 h-3" />Entri Baru
                        </span>
                    )}
                </div>

                {/* Form */}
                <form action={handleSubmit} className="p-6 space-y-6">
                    <input type="hidden" name="tanggal" value={selectedDate} />

                    {/* Shalat Berjama'ah */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-xs font-bold text-gray-700 mb-2">🕌 Shalat Berjama&apos;ah 5 Waktu</h3>
                            <p className="text-[11px] text-gray-500 mb-2">Berapa kali berjama&apos;ah hari ini? (0 - 5)</p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number" id="shalatBerjamaah" name="shalatBerjamaah" min="0" max="5"
                                    key={`shalat-${selectedDate}-${d?.shalatBerjamaah}`}
                                    defaultValue={d?.shalatBerjamaah || '0'}
                                    className="w-20 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-bold text-center text-lg focus:ring-2 focus:ring-[#15A4FA]/40 focus:border-[#15A4FA] outline-none transition-all"
                                />
                                <span className="text-xs text-gray-400">/ 5 waktu</span>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-gray-700 mb-2">🌌 Qiyamul Lail</h3>
                            <p className="text-[11px] text-gray-500 mb-2">Berapa kali shalat malam?</p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number" id="qiyamulLail" name="qiyamulLail" min="0"
                                    key={`qiyamul-${selectedDate}-${d?.qiyamulLail}`}
                                    defaultValue={d?.qiyamulLail || '0'}
                                    className="w-20 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-bold text-center text-lg focus:ring-2 focus:ring-[#15A4FA]/40 focus:border-[#15A4FA] outline-none transition-all"
                                />
                                <span className="text-xs text-gray-400">kali</span>
                            </div>
                        </div>
                    </div>

                    {/* Toggle Activities */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-700 mb-3">Aktivitas Ibadah Lainnya</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {TOGGLE_ACTIVITIES.map((activity) => {
                                const isChecked = d ? d[activity.name as keyof IbadahData] as boolean : false
                                return (
                                    <label
                                        key={`${activity.name}-${selectedDate}-${isChecked}`}
                                        htmlFor={activity.name}
                                        className="group relative flex items-center gap-2.5 p-3.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:border-[#15A4FA]/50 hover:bg-blue-50/30 transition-all has-[:checked]:bg-[#00529C]/5 has-[:checked]:border-[#00529C] has-[:checked]:shadow-sm"
                                    >
                                        <input
                                            type="checkbox" id={activity.name} name={activity.name}
                                            defaultChecked={isChecked}
                                            className="w-4.5 h-4.5 rounded border-2 border-gray-300 text-[#00529C] focus:ring-[#15A4FA] accent-[#00529C] cursor-pointer"
                                        />
                                        <span className="text-xs font-semibold text-gray-700 group-has-[:checked]:text-[#00529C]">
                                            {activity.emoji} {activity.label}
                                        </span>
                                    </label>
                                )
                            })}
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
                        <button
                            type="submit" disabled={isSubmitting}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00529C] to-[#15A4FA] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:hover:scale-100"
                        >
                            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</> :
                             submitted ? <><CheckCircle2 className="w-4 h-4" />Tersimpan!</> :
                             isEditing ? <><Edit3 className="w-4 h-4" />Perbarui Data</> :
                             <><Send className="w-4 h-4" />Kirim Laporan</>}
                        </button>
                        {isEditing && (
                            <p className="text-[11px] text-amber-600 font-medium">Data untuk tanggal ini akan diperbarui</p>
                        )}
                    </div>
                </form>
            </div>
        </div>
    )
}
