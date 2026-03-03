'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import {
    updatePasswordAction, updateProfileDetailsAction, updateSpreadsheetAction,
    updateSheetConfigAction, updateIbadahHarianConfigAction,
    updateEducationConfigAction,
    updatePemberdayaanConfigAction, updateHafalanConfigAction,
} from './actions'
import { uploadAvatarAction } from './avatar-actions'
import {
    Camera, Loader2, Save, KeyRound, User, Link2, BookOpen, GraduationCap,
    Eye, EyeOff, HeartHandshake, ScrollText, Settings2, ChevronDown, CalendarDays
} from 'lucide-react'
import { ACADEMIC_MONTHS, getFullCellRef } from '@/src/lib/ibadahDefaults'

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
    { key: 'pendidikan', label: 'Pendidikan', icon: GraduationCap },
    { key: 'pemberdayaan', label: 'Pemberdayaan', icon: HeartHandshake },
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

    // Loading states
    const [savingDetails, setSavingDetails] = useState(false)
    const [savingPassword, setSavingPassword] = useState(false)
    const [savingSpreadsheet, setSavingSpreadsheet] = useState(false)
    const [savingIbadah, setSavingIbadah] = useState(false)
    const [savingIbadahHarian, setSavingIbadahHarian] = useState(false)
    const [savingPendidikan, setSavingPendidikan] = useState(false)
    const [savingPemberdayaan, setSavingPemberdayaan] = useState(false)
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
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
                {TABS.map(tab => {
                    const Icon = tab.icon
                    return (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.key ? 'bg-white text-[#00529C] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Icon className="w-3.5 h-3.5" />{tab.label}
                        </button>
                    )
                })}
            </div>

            {/* ─── Tab: Umum ─────────────────────────────────────────────── */}
            {activeTab === 'umum' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
                            <div className="relative group mb-3">
                                <div className="w-28 h-28 rounded-full bg-blue-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-[#00529C] text-3xl font-bold ring-4 ring-[#15A4FA]/20">
                                    {avatar ? <img src={avatar} alt="Profile" className="w-full h-full object-cover" /> : initialData.name.charAt(0).toUpperCase()}
                                </div>
                                <label htmlFor="avatar-upload" className="absolute bottom-0.5 right-0.5 w-8 h-8 bg-[#15A4FA] hover:bg-[#00529C] text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-colors" title="Ubah Foto">
                                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                                </label>
                                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                            </div>
                            <p className="text-[10px] text-gray-400 mb-3">Ukuran maksimal 500 KB</p>
                            <h3 className="text-base font-bold text-gray-900 text-center">{initialData.name}</h3>
                            <p className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full mt-1">{initialData.email}</p>
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-5">
                        <Card icon={<User className="w-4 h-4 text-[#00529C]" />} title="Informasi Pribadi">
                            <form onSubmit={(e) => handleForm(updateProfileDetailsAction, setSavingDetails, e)} className="space-y-4">
                                <Input id="name" name="name" label="Nama Tampilan" defaultValue={initialData.name} required />
                                <div>
                                    <Input id="email" name="email" label="Alamat Email" type="email" defaultValue={initialData.email} required />
                                    <p className="text-[11px] text-gray-500 mt-1.5">Perubahan email memerlukan verifikasi ulang.</p>
                                </div>
                                <SubmitBtn loading={savingDetails} label="Simpan" />
                            </form>
                        </Card>

                        <Card icon={<Link2 className="w-4 h-4 text-[#00529C]" />} title="Konfigurasi Spreadsheet">
                            <form onSubmit={(e) => handleForm(updateSpreadsheetAction, setSavingSpreadsheet, e)} className="space-y-4">
                                <div>
                                    <Input id="spreadsheetUrl" name="spreadsheetUrl" label="URL Google Spreadsheet" type="url" defaultValue={spreadsheetDisplayUrl} placeholder="https://docs.google.com/spreadsheets/d/.../edit" />
                                    <p className="text-[11px] text-gray-500 mt-1.5">Tempelkan link lengkap. ID akan diekstrak otomatis.</p>
                                    {initialData.spreadsheet_id && (
                                        <p className="text-[11px] text-green-600 font-medium mt-1">✅ ID: <code className="bg-green-50 px-1 rounded text-[10px]">{initialData.spreadsheet_id}</code></p>
                                    )}
                                </div>
                                <SubmitBtn loading={savingSpreadsheet} label="Simpan Spreadsheet" />
                            </form>
                        </Card>

                        <Card icon={<KeyRound className="w-4 h-4 text-[#00529C]" />} title="Ubah Password">
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
                <div className="space-y-6">
                    {/* ─── Sub-section 1: Konfigurasi Ibadah Bulanan ─────────── */}
                    <Card icon={<BookOpen className="w-4 h-4 text-[#00529C]" />} title="Konfigurasi Ibadah Bulanan">
                        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
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
                                    <div key={year} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                                        <button 
                                            type="button" 
                                            onClick={() => setExpandedYear(isExp ? null : yk)}
                                            className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-lg bg-[#00529C]/10 text-[#00529C] flex items-center justify-center font-bold text-xs">{year}</div>
                                                <span className="font-bold text-sm text-gray-800">Tahun ke-{year}</span>
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        {isExp && (
                                            <div className="p-4 md:p-5 border-t border-gray-100 space-y-5 animate-in slide-in-from-top-2 duration-200">
                                                <div>
                                                    <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
                                                        Pemetaan Sel Skor Ibadah (Rerata). Otomatis menggunakan awalan <code className="text-gray-700 font-semibold">'Tahun ke-{year}'!</code>
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

                    {/* ─── Sub-section 2: Konfigurasi Ibadah Harian ──────────── */}
                    <Card icon={<CalendarDays className="w-4 h-4 text-[#00529C]" />} title="Konfigurasi Ibadah Harian">
                        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                            Konfigurasi untuk input harian dan grafik perbandingan bulan ini vs bulan lalu.
                        </p>
                        <form onSubmit={(e) => handleForm(updateIbadahHarianConfigAction, setSavingIbadahHarian, e)} className="space-y-4 max-w-xl">
                            <Input 
                                id="ibadahHarianSheet" 
                                name="ibadahHarianSheet" 
                                label="Nama Sheet Laporan Harian" 
                                defaultValue={((initialData.sheet_config as any)?.ibadah?.harian?.sheet_name) || ''}
                                placeholder="LaporanIbadah" 
                            />
                            <Input 
                                id="ibadahHarianRange" 
                                name="ibadahHarianRange" 
                                label="Range Data Harian (Kolom A sampai I)" 
                                defaultValue={((initialData.sheet_config as any)?.ibadah?.harian?.data_range) || ''}
                                placeholder="LaporanIbadah!A:I" 
                            />
                            <div className="pt-2">
                                <SubmitBtn loading={savingIbadahHarian} label="Simpan Konfigurasi Harian" />
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* ─── Tab: Pendidikan ────────────────────────────────────────── */}
            {activeTab === 'pendidikan' && (
                <Card icon={<GraduationCap className="w-4 h-4 text-[#00529C]" />} title="Konfigurasi Chart Pendidikan">
                    <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                        Tentukan range sel dari sheet Resume untuk data pendidikan.
                    </p>
                    <form onSubmit={(e) => handleForm(updateEducationConfigAction, setSavingPendidikan, e)} className="space-y-4 max-w-xl">
                        <Input id="ipIpkRange" name="ipIpkRange" label="Range IP & IPK" defaultValue={sc('ip_ipk_range') || ''} placeholder="Resume!B48:I48" />
                        <Input id="pembinaanRange" name="pembinaanRange" label="Range Pembinaan S/H Skills" defaultValue={sc('pembinaan_range') || ''} placeholder="Resume!B73:J95" />
                        <Input id="prestasiRange" name="prestasiRange" label="Range Riwayat Prestasi" defaultValue={sc('prestasi_range') || ''} placeholder="Resume!B108:J120" />
                        <Input id="organisasiRange" name="organisasiRange" label="Range Riwayat Organisasi" defaultValue={sc('organisasi_range') || ''} placeholder="Resume!B127:J132" />
                        <Input id="workshopRange" name="workshopRange" label="Range Workshop / Seminar" defaultValue={sc('workshop_range') || ''} placeholder="Resume!B137:J158" />
                        <SubmitBtn loading={savingPendidikan} label="Simpan Konfigurasi Pendidikan" />
                    </form>
                </Card>
            )}

            {/* ─── Tab: Pemberdayaan ──────────────────────────────────────── */}
            {activeTab === 'pemberdayaan' && (
                <Card icon={<HeartHandshake className="w-4 h-4 text-[#00529C]" />} title="Konfigurasi Chart Pemberdayaan">
                    <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                        Tentukan range sel untuk data pemberdayaan masyarakat.
                    </p>
                    <form onSubmit={(e) => handleForm(updatePemberdayaanConfigAction, setSavingPemberdayaan, e)} className="space-y-4 max-w-xl">
                        <Input id="kunjunganRange" name="kunjunganRange" label="Range Kunjungan Program" defaultValue={sc('kunjungan_range') || ''} placeholder="Resume!B164:J187" />
                        <Input id="portfolioRange" name="portfolioRange" label="Range Portfolio Social Project" defaultValue={sc('portfolio_range') || ''} placeholder="Resume!B192:J197" />
                        <Input id="narasumberRange" name="narasumberRange" label="Range Narasumber Pemberdayaan" defaultValue={sc('narasumber_range') || ''} placeholder="Resume!B202:J207" />
                        <SubmitBtn loading={savingPemberdayaan} label="Simpan Konfigurasi Pemberdayaan" />
                    </form>
                </Card>
            )}

            {/* ─── Tab: Hafalan ───────────────────────────────────────────── */}
            {activeTab === 'hafalan' && (
                <Card icon={<ScrollText className="w-4 h-4 text-[#00529C]" />} title="Konfigurasi Laporan Hafalan">
                    <p className="text-xs text-gray-500 mb-5 leading-relaxed">
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5 bg-gray-50/50">
                {icon}
                <h2 className="text-sm font-bold text-gray-900">{title}</h2>
            </div>
            <div className="p-6">{children}</div>
        </div>
    )
}

function Input({ id, label, ...props }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
            <input id={id} {...props} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#15A4FA]/40 focus:border-transparent transition-all text-gray-900" />
        </div>
    )
}

function PasswordInput({ id, name, label, show, onToggle, placeholder }: { id: string; name: string; label: string; show: boolean; onToggle: () => void; placeholder?: string }) {
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
            <div className="relative">
                <input id={id} name={name} type={show ? 'text' : 'password'} required minLength={6} placeholder={placeholder}
                    className="w-full px-3.5 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#15A4FA]/40 focus:border-transparent transition-all text-gray-900" />
                <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" tabIndex={-1}>
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    )
}

function SubmitBtn({ loading, label, variant }: { loading: boolean; label: string; variant?: 'dark' }) {
    const bg = variant === 'dark' ? 'bg-gray-800 hover:bg-gray-900 shadow-md' : 'bg-[#00529C] hover:bg-[#004280] shadow-[0_4px_14px_0_rgba(0,82,156,0.39)]'
    return (
        <button type="submit" disabled={loading} className={`py-2.5 px-5 ${bg} text-white text-sm font-semibold rounded-xl transition flex items-center gap-2 disabled:opacity-60`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Menyimpan...' : label}
        </button>
    )
}
