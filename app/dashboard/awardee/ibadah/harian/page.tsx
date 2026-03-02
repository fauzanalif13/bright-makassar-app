'use client'

import { useState } from 'react'
import { submitIbadahHarian } from './actions'
import toast from 'react-hot-toast'
import { BookOpen, Send, Loader2, CalendarDays, CheckCircle2 } from 'lucide-react'

const TOGGLE_ACTIVITIES = [
    { name: 'dzikirPagi', label: 'Dzikir Pagi', emoji: '🌅' },
    { name: 'mendoakan', label: "Mendo'akan / Memaafkan Orang Lain", emoji: '🤲' },
    { name: 'shalatDhuha', label: 'Shalat Dhuha', emoji: '☀️' },
    { name: 'membacaQuran', label: 'Membaca Al-Quran', emoji: '📖' },
    { name: 'shaumSunnah', label: 'Shaum Sunnah', emoji: '🌙' },
    { name: 'berinfak', label: 'Berinfak', emoji: '💝' },
]

export default function LaporanIbadahHarianPage() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true)
        setSubmitted(false)

        const result = await submitIbadahHarian(formData)

        setIsSubmitting(false)

        if (result.error) {
            toast.error(result.error)
        } else if (result.success) {
            toast.success(result.success)
            setSubmitted(true)
            setTimeout(() => setSubmitted(false), 3000)
        }
    }

    const today = new Date().toISOString().split('T')[0]

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00529C] to-[#15A4FA] text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Laporan Ibadah Harian</h1>
                        <p className="text-gray-500 text-sm">Catat ibadah harianmu dan tingkatkan konsistensi</p>
                    </div>
                </div>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-10 relative overflow-hidden">
                {/* Decorative accent */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#15A4FA]/5 to-[#00529C]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <form action={handleSubmit} className="relative z-10 space-y-8">
                    {/* Tanggal */}
                    <div>
                        <label htmlFor="tanggal" className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <CalendarDays className="w-4 h-4 text-[#15A4FA]" />
                            Tanggal
                        </label>
                        <input
                            type="date"
                            id="tanggal"
                            name="tanggal"
                            defaultValue={today}
                            required
                            className="w-full md:w-72 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#15A4FA]/40 focus:border-[#15A4FA] transition-all"
                        />
                    </div>

                    {/* 1. Shalat Berjama'ah 5 Waktu (Number) */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-3">🕌 Shalat Berjama&apos;ah 5 Waktu</h3>
                        <p className="text-xs text-gray-500 mb-3">Berapa kali shalat berjama&apos;ah hari ini? (0 - 5)</p>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                id="shalatBerjamaah"
                                name="shalatBerjamaah"
                                min="0"
                                max="5"
                                defaultValue="0"
                                className="w-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-bold text-center text-lg focus:outline-none focus:ring-2 focus:ring-[#15A4FA]/40 focus:border-[#15A4FA] transition-all"
                            />
                            <span className="text-sm text-gray-500">/ 5 waktu</span>
                        </div>
                    </div>

                    {/* 2. Shalat Malam / Qiyamul Lail (Number) */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-3">🌌 Shalat Malam / Qiyamul Lail</h3>
                        <p className="text-xs text-gray-500 mb-3">Berapa kali shalat malam hari ini?</p>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                id="qiyamulLail"
                                name="qiyamulLail"
                                min="0"
                                defaultValue="0"
                                className="w-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-bold text-center text-lg focus:outline-none focus:ring-2 focus:ring-[#15A4FA]/40 focus:border-[#15A4FA] transition-all"
                            />
                            <span className="text-sm text-gray-500">kali</span>
                        </div>
                    </div>

                    {/* Toggle Activities (3-8) */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-4">Aktivitas Ibadah Lainnya</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {TOGGLE_ACTIVITIES.map((activity) => (
                                <label
                                    key={activity.name}
                                    htmlFor={activity.name}
                                    className="group relative flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:border-[#15A4FA]/50 hover:bg-blue-50/30 transition-all has-[:checked]:bg-[#00529C]/5 has-[:checked]:border-[#00529C] has-[:checked]:shadow-sm"
                                >
                                    <input
                                        type="checkbox"
                                        id={activity.name}
                                        name={activity.name}
                                        className="w-5 h-5 rounded-md border-2 border-gray-300 text-[#00529C] focus:ring-[#15A4FA] focus:ring-offset-0 accent-[#00529C] cursor-pointer"
                                    />
                                    <span className="text-sm font-semibold text-gray-700 group-has-[:checked]:text-[#00529C]">
                                        {activity.emoji} {activity.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 border-t border-gray-100">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-[#00529C] to-[#15A4FA] text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Mengirim...
                                </>
                            ) : submitted ? (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Terkirim!
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Kirim Laporan
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
