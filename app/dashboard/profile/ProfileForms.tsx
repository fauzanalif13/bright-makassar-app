'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import {
    updatePasswordAction, updateProfileDetailsAction, updateSpreadsheetAction,
    updateSheetConfigAction, updateIbadahHarianConfigAction,
    updateHafalanConfigAction,
} from './actions'
import { uploadAvatarAction } from './avatar-actions'
import {
    Camera, Loader2, Save, KeyRound, User, Link2, BookOpen,
    Eye, EyeOff, ScrollText, Settings2, ChevronDown, CalendarDays,
    Sun, Moon, Monitor
} from 'lucide-react'
import { ACADEMIC_MONTHS, getFullCellRef, getDailyBlockDefault } from '@/src/lib/ibadahDefaults'
import { useTheme } from '@/src/components/ThemeProvider'

type ProfileData = {
    name: string
    email: string
    avatar_url: string
    spreadsheet_id: string
    sheet_config: Record<string, unknown> | null
}

const TABS = [
    { key: 'umum', label: 'Umum', icon: User },
    { key: 'ibadah', label: 'Ibadah', icon: BookOpen },
    { key: 'hafalan', label: 'Hafalan', icon: ScrollText },
] as const

type TabKey = typeof TABS[number]['key']

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export default function ProfileForms({ initialData }: { initialData: ProfileData }) {
    const [activeTab, setActiveTab] = useState<TabKey>('umum')
    const [avatar, setAvatar] = useState(initialData.avatar_url)
    const [uploading, setUploading] = useState(false)
    const [showPw1, setShowPw1] = useState(false)
    const [showPw2, setShowPw2] = useState(false)
    const [expandedYear, setExpandedYear] = useState<string | null>('tahun_1')

    // Ibadah sub-tab state
    const [ibadahSubTab, setIbadahSubTab] = useState<'bulanan' | 'harian'>('bulanan')
    const [expandedDailyYear, setExpandedDailyYear] = useState<string | null>('tahun_1')

    // Theme
    const { theme, toggleTheme, isDark } = useTheme()

    // Loading states
    const [savingDetails, setSavingDetails] = useState(false)
    const [savingPassword, setSavingPassword] = useState(false)
    const [savingSpreadsheet, setSavingSpreadsheet] = useState(false)
    const [savingIbadah, setSavingIbadah] = useState(false)
    const [savingIbadahHarian, setSavingIbadahHarian] = useState(false)
    const [savingHafalan, setSavingHafalan] = useState(false)

    function sc(key: string): string {
        return String((initialData.sheet_config as Record<string, unknown>)?.[key] ?? '')
    }

    function scObj(key: string): Record<string, string> {
        return ((initialData.sheet_config as Record<string, unknown>)?.[key] as Record<string, string>) || {}
    }

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.[0]) return
        const formData = new FormData()
        formData.append('avatar', e.target.files[0])
        setUploading(true)
        const t = toast.loading('Mengunggah foto...')
        try {
            const r = await uploadAvatarAction(formData)
            if (r.error) toast.error(r.error, { id: t })
            else if (r.success && r.avatarUrl) { setAvatar(r.avatarUrl); toast.success(r.success, { id: t }) }
        } catch { toast.error('Gagal mengunggah.', { id: t }) }
        finally { setUploading(false) }
    }

    async function handleForm(
        action: (fd: FormData) => Promise<{ error?: string; success?: string }>,
        setLoading: (v: boolean) => void,
        e: React.FormEvent<HTMLFormElement>,
        reset?: boolean
    ) {
        e.preventDefault()
        setLoading(true)
        try {
            const r = await action(new FormData(e.currentTarget))
            if (r.error) toast.error(r.error)
            else if (r.success) { toast.success(r.success); if (reset) (e.target as HTMLFormElement).reset() }
        } catch { toast.error('Terjadi kesalahan.') }
        finally { setLoading(false) }
    }

    const spreadsheetDisplayUrl = initialData.spreadsheet_id ? `https://docs.google.com/spreadsheets/d/${initialData.spreadsheet_id}/edit` : ''

    return (
        <div className="space-y-6">
            {/* Tab Bar */}
            <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto">
                {TABS.map(tab => {
                    const Icon = tab.icon
                    return (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.key ? 'bg-white dark:bg-slate-700 text-[#00529C] dark:text-[#60b5ff] shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
                            <Icon className="w-3.5 h-3.5" />{tab.label}
                        </button>
                    )
                })}
            </div>

            {/* ─── Tab: Umum ─────────────────────────────────────────────── */}
            {activeTab === 'umum' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-5">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col items-center">
                            <div className="relative group mb-3">
                                <div className="w-28 h-28 rounded-full bg-blue-50 dark:bg-[#00529C]/20 border-4 border-white dark:border-slate-700 shadow-lg overflow-hidden flex items-center justify-center text-[#00529C] dark:text-[#60b5ff] text-3xl font-bold ring-4 ring-[#15A4FA]/20 dark:ring-[#00529C]/30">
                                    {avatar ? <img src={avatar} alt="Profile" className="w-full h-full object-cover" /> : initialData.name.charAt(0).toUpperCase()}
                                </div>
                                <label htmlFor="avatar-upload" className="absolute bottom-0.5 right-0.5 w-8 h-8 bg-[#15A4FA] hover:bg-[#00529C] text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-colors" title="Ubah Foto">
                                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                                </label>
                                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-3">Ukuran maksimal 500 KB</p>
                            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 text-center">{initialData.name}</h3>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-700 px-2 py-0.5 rounded-full mt-1">{initialData.email}</p>
                        </div>

                        {/* ─── Theme Toggle Card ─────────────────────────── */}
                        <Card icon={isDark ? <Moon className="w-4 h-4 text-[#00529C] dark:text-[#60b5ff]" /> : <Sun className="w-4 h-4 text-[#00529C]" />} title="Tampilan / Tema">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-500'}`}>
                                        {isDark ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Mode {isDark ? 'Gelap' : 'Terang'}</p>
                                        <p className="text-[11px] text-gray-500 dark:text-slate-400">{isDark ? 'Nyaman untuk mata di malam hari' : 'Tampilan cerah dan bersih'}</p>
                                    </div>
                                </div>
                                {/* Toggle Switch */}
                                <button
                                    onClick={toggleTheme}
                                    className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#15A4FA]/40 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${isDark ? 'bg-[#00529C]' : 'bg-gray-300'}`}
                                    role="switch"
                                    aria-checked={isDark}
                                    aria-label="Toggle dark mode"
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center transition-transform duration-300 ${isDark ? 'translate-x-7' : 'translate-x-0'}`}>
                                        {isDark
                                            ? <Moon className="w-3.5 h-3.5 text-[#00529C]" />
                                            : <Sun className="w-3.5 h-3.5 text-amber-500" />
                                        }
                                    </span>
                                </button>
                            </div>
                        </Card>
                    </div>

                    <div className="md:col-span-2 space-y-5">
                        <Card icon={<User className="w-4 h-4 text-[#00529C] dark:text-[#60b5ff]" />} title="Informasi Pribadi">
                            <form onSubmit={(e) => handleForm(updateProfileDetailsAction, setSavingDetails, e)} className="space-y-4">
                                <Input id="name" name="name" label="Nama Tampilan" defaultValue={initialData.name} required />
                                <div>
                                    <Input id="email" name="email" label="Alamat Email" type="email" defaultValue={initialData.email} required />
                                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1.5">Perubahan email memerlukan verifikasi ulang.</p>
                                </div>
                                <SubmitBtn loading={savingDetails} label="Simpan" />
                            </form>
                        </Card>

                        <Card icon={<Link2 className="w-4 h-4 text-[#00529C] dark:text-[#60b5ff]" />} title="Konfigurasi Spreadsheet">
                            <form onSubmit={(e) => handleForm(updateSpreadsheetAction, setSavingSpreadsheet, e)} className="space-y-4">
                                <div>
                                    <Input id="spreadsheetUrl" name="spreadsheetUrl" label="URL Google Spreadsheet" type="url" defaultValue={spreadsheetDisplayUrl} placeholder="https://docs.google.com/spreadsheets/d/.../edit" />
                                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1.5">Tempelkan link lengkap. ID akan diekstrak otomatis.</p>
                                    {initialData.spreadsheet_id && (
                                        <p className="text-[11px] text-green-600 dark:text-green-400 font-medium mt-1">✅ ID: <code className="bg-green-50 dark:bg-green-900/30 px-1 rounded text-[10px]">{initialData.spreadsheet_id}</code></p>
                                    )}
                                </div>
                                <SubmitBtn loading={savingSpreadsheet} label="Simpan Spreadsheet" />
                            </form>
                        </Card>

                        <Card icon={<KeyRound className="w-4 h-4 text-[#00529C] dark:text-[#60b5ff]" />} title="Ubah Password">
                            <form onSubmit={(e) => handleForm(updatePasswordAction, setSavingPassword, e, true)} className="space-y-4">
                                <PasswordInput id="newPassword" name="newPassword" label="Password Baru" show={showPw1} onToggle={() => setShowPw1(!showPw1)} placeholder="Minimal 6 karakter" />
                                <PasswordInput id="confirmPassword" name="confirmPassword" label="Konfirmasi Password" show={showPw2} onToggle={() => setShowPw2(!showPw2)} placeholder="Ketik ulang" />
                                <SubmitBtn loading={savingPassword} label="Perbarui Password" variant="dark" />
                            </form>
                        </Card>
                    </div>
                </div>
            )}

            {/* ─── Tab: Ibadah ────────────────────────────────────────────── */}
            {activeTab === 'ibadah' && (
                <div className="space-y-5">
                    {/* ─── Horizontal Sub-Tabs ─────────────────────────────── */}
                    <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setIbadahSubTab('bulanan')}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${ibadahSubTab === 'bulanan' ? 'bg-white dark:bg-slate-700 text-[#00529C] dark:text-[#60b5ff] shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            Konfigurasi Ibadah Bulanan
                        </button>
                        <button
                            onClick={() => setIbadahSubTab('harian')}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${ibadahSubTab === 'harian' ? 'bg-white dark:bg-slate-700 text-[#00529C] dark:text-[#60b5ff] shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                        >
                            <CalendarDays className="w-3.5 h-3.5" />
                            Konfigurasi Ibadah Harian
                        </button>
                    </div>

                    {/* ─── Sub-Tab: Bulanan ─────────────────────────────────── */}
                    {ibadahSubTab === 'bulanan' && (
                        <Card icon={<BookOpen className="w-4 h-4 text-[#00529C] dark:text-[#60b5ff]" />} title="Konfigurasi Ibadah Bulanan">
                            <p className="text-xs text-gray-500 dark:text-slate-400 mb-5 leading-relaxed">
                                Pemetaan sel rerata skor ibadah per bulan untuk grafik tren historis. Nilai default telah terisi otomatis.
                            </p>
                            <form onSubmit={(e) => handleForm(updateSheetConfigAction, setSavingIbadah, e)} className="space-y-4">
                                {[1, 2, 3, 4].map(year => {
                                    const yk = `tahun_${year}`
                                    const isExp = expandedYear === yk
                                    const savedY = (initialData.sheet_config as any)?.ibadah?.bulanan?.[yk]
                                        || (initialData.sheet_config as any)?.ibadah?.[yk]
                                        || {}

                                    return (
                                        <div key={year} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                                            <button
                                                type="button"
                                                onClick={() => setExpandedYear(isExp ? null : yk)}
                                                className="w-full flex items-center justify-between p-4 bg-gray-50/50 dark:bg-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-lg bg-[#00529C]/10 text-[#00529C] dark:text-[#60b5ff] flex items-center justify-center font-bold text-xs">{year}</div>
                                                    <span className="font-bold text-sm text-gray-800 dark:text-slate-200">Tahun ke-{year}</span>
                                                </div>
                                                <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                                            </button>

                                            {isExp && (
                                                <div className="p-4 md:p-5 border-t border-gray-100 dark:border-slate-700 space-y-5 animate-in slide-in-from-top-2 duration-200">
                                                    <div>
                                                        <Input
                                                            id={`sheet_name_${yk}`}
                                                            name={`sheet_name_${yk}`}
                                                            label="Nama Sheet"
                                                            defaultValue={savedY.sheet_name || `Tahun ke-${year}`}
                                                            placeholder={`Tahun ke-${year}`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-3 leading-relaxed">
                                                            Pemetaan Sel Skor Ibadah (Rerata). Otomatis divalidasi dengan Nama Sheet di atas.
                                                        </p>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                            {ACADEMIC_MONTHS.map(m => {
                                                                const defaultVal = getFullCellRef(year, m.id)
                                                                const value = savedY.months?.[m.id] !== undefined ? savedY.months[m.id] : defaultVal
                                                                return (
                                                                    <Input
                                                                        key={m.id}
                                                                        id={`ibadah_${yk}_${m.id}`}
                                                                        name={`ibadah_${yk}_${m.id}`}
                                                                        label={m.label}
                                                                        defaultValue={value}
                                                                        placeholder={defaultVal || 'Kosong (tidak aktif)'}
                                                                    />
                                                                )
                                                            })}
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 flex justify-end">
                                                        <SubmitBtn loading={savingIbadah} label={`Simpan Bulanan (Tahun ${year})`} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </form>
                        </Card>
                    )}

                    {/* ─── Sub-Tab: Harian ──────────────────────────────────── */}
                    {ibadahSubTab === 'harian' && (
                        <Card icon={<CalendarDays className="w-4 h-4 text-[#00529C] dark:text-[#60b5ff]" />} title="Konfigurasi Ibadah Harian">
                            <p className="text-xs text-gray-500 dark:text-slate-400 mb-5 leading-relaxed">
                                Range blok grid harian (8 aktivitas × 31 hari) per bulan. Default dihitung otomatis dari sel Rerata bulanan.
                                <br />
                                <span className="text-gray-400 dark:text-slate-500">Contoh: <code className="bg-gray-50 dark:bg-slate-700 px-1 rounded text-[10px] font-semibold">G13:AK20</code> untuk bulan dengan Rerata di <code className="bg-gray-50 dark:bg-slate-700 px-1 rounded text-[10px] font-semibold">AM13</code></span>
                            </p>
                            <form onSubmit={(e) => handleForm(updateIbadahHarianConfigAction, setSavingIbadahHarian, e)} className="space-y-4">
                                {[1, 2, 3, 4].map(year => {
                                    const yk = `tahun_${year}`
                                    const isExp = expandedDailyYear === yk
                                    const savedHarian = (initialData.sheet_config as any)?.ibadah?.harian?.[yk] || {}

                                    return (
                                        <div key={year} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                                            <button
                                                type="button"
                                                onClick={() => setExpandedDailyYear(isExp ? null : yk)}
                                                className="w-full flex items-center justify-between p-4 bg-gray-50/50 dark:bg-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">{year}</div>
                                                    <span className="font-bold text-sm text-gray-800 dark:text-slate-200">Tahun ke-{year}</span>
                                                </div>
                                                <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                                            </button>

                                            {isExp && (
                                                <div className="p-4 md:p-5 border-t border-gray-100 dark:border-slate-700 space-y-5 animate-in slide-in-from-top-2 duration-200">
                                                    <div>
                                                        <Input
                                                            id={`sheet_name_${yk}`}
                                                            name={`sheet_name_${yk}`}
                                                            label="Nama Sheet"
                                                            defaultValue={savedHarian.sheet_name || `Tahun ke-${year}`}
                                                            placeholder={`Tahun ke-${year}`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-3 leading-relaxed">
                                                            Block range harian untuk sheet yang dikonfigurasi. Format: <code className="text-gray-700 dark:text-slate-300 font-semibold">G13:AK20</code>
                                                        </p>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                            {ACADEMIC_MONTHS.map(m => {
                                                                const smartDefault = getDailyBlockDefault(year, m.id)
                                                                const savedValue = savedHarian.months?.[m.id]
                                                                const value = savedValue !== undefined ? savedValue : smartDefault
                                                                return (
                                                                    <Input
                                                                        key={m.id}
                                                                        id={`harian_${yk}_${m.id}`}
                                                                        name={`harian_${yk}_${m.id}`}
                                                                        label={m.label}
                                                                        defaultValue={value}
                                                                        placeholder={smartDefault || 'Kosong (tidak aktif)'}
                                                                    />
                                                                )
                                                            })}
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 flex justify-end">
                                                        <SubmitBtn loading={savingIbadahHarian} label={`Simpan Harian (Tahun ${year})`} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </form>
                        </Card>
                    )}
                </div>
            )}



            {/* ─── Tab: Hafalan ───────────────────────────────────────────── */}
            {activeTab === 'hafalan' && (
                <Card icon={<ScrollText className="w-4 h-4 text-[#00529C] dark:text-[#60b5ff]" />} title="Konfigurasi Laporan Hafalan">
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-5 leading-relaxed">
                        Konfigurasi ini akan digunakan saat fitur Laporan Hafalan tersedia. Tentukan nama sheet dan range sel.
                    </p>
                    <form onSubmit={(e) => handleForm(updateHafalanConfigAction, setSavingHafalan, e)} className="space-y-4 max-w-xl">
                        <Input id="hafalanSheet" name="hafalanSheet" label="Nama Sheet Hafalan" defaultValue={sc('hafalan_sheet') || ''} placeholder="LaporanHafalan" />
                        <Input id="hafalanRange" name="hafalanRange" label="Range Data Hafalan" defaultValue={sc('hafalan_range') || ''} placeholder="LaporanHafalan!A:E" />
                        <SubmitBtn loading={savingHafalan} label="Simpan Konfigurasi Hafalan" />
                    </form>
                </Card>
            )}
        </div>
    )
}

// ─── Reusable UI helpers ──────────────────────────────────────────────

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2.5 bg-gray-50/50 dark:bg-slate-700/50">
                {icon}
                <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">{title}</h2>
            </div>
            <div className="p-6">{children}</div>
        </div>
    )
}

function Input({ id, label, ...props }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">{label}</label>
            <input id={id} {...props} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#15A4FA]/40 focus:border-transparent transition-all text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500" />
        </div>
    )
}

function PasswordInput({ id, name, label, show, onToggle, placeholder }: { id: string; name: string; label: string; show: boolean; onToggle: () => void; placeholder?: string }) {
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">{label}</label>
            <div className="relative">
                <input id={id} name={name} type={show ? 'text' : 'password'} required minLength={6} placeholder={placeholder}
                    className="w-full px-3.5 py-2.5 pr-10 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#15A4FA]/40 focus:border-transparent transition-all text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500" />
                <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors" tabIndex={-1}>
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    )
}

function SubmitBtn({ loading, label, variant }: { loading: boolean; label: string; variant?: 'dark' }) {
    const bg = variant === 'dark' ? 'bg-gray-800 hover:bg-gray-900 dark:bg-slate-600 dark:hover:bg-slate-500 shadow-md' : 'bg-[#00529C] hover:bg-[#004280] shadow-[0_4px_14px_0_rgba(0,82,156,0.39)]'
    return (
        <button type="submit" disabled={loading} className={`py-2.5 px-5 ${bg} text-white text-sm font-semibold rounded-xl transition flex items-center gap-2 disabled:opacity-60`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Menyimpan...' : label}
        </button>
    )
}
