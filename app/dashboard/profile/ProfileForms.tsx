'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { updatePasswordAction, updateProfileDetailsAction, updateSpreadsheetAction, updateSheetConfigAction, updateEducationConfigAction } from './actions'
import { uploadAvatarAction } from './avatar-actions'
import { Camera, Loader2, Save, KeyRound, User, Link2, Settings2, BookOpen, GraduationCap } from 'lucide-react'

type ProfileData = {
    name: string
    email: string
    avatar_url: string
    spreadsheet_id: string
    sheet_config: Record<string, string> | null
}

const TABS = [
    { key: 'umum', label: 'Umum', icon: User },
    { key: 'ibadah', label: 'Ibadah', icon: BookOpen },
    { key: 'pendidikan', label: 'Pendidikan', icon: GraduationCap },
] as const

type TabKey = typeof TABS[number]['key']

export default function ProfileForms({ initialData }: { initialData: ProfileData }) {
    const [activeTab, setActiveTab] = useState<TabKey>('umum')
    const [avatar, setAvatar] = useState(initialData.avatar_url)
    const [uploading, setUploading] = useState(false)
    const [savingDetails, setSavingDetails] = useState(false)
    const [savingPassword, setSavingPassword] = useState(false)
    const [savingSpreadsheet, setSavingSpreadsheet] = useState(false)
    const [savingIbadah, setSavingIbadah] = useState(false)
    const [savingPendidikan, setSavingPendidikan] = useState(false)

    // --- Handlers ---
    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        const formData = new FormData()
        formData.append('avatar', file)
        setUploading(true)
        const t = toast.loading('Mengunggah foto...')
        try {
            const r = await uploadAvatarAction(formData)
            if (r.error) toast.error(r.error, { id: t })
            else if (r.success && r.avatarUrl) { setAvatar(r.avatarUrl); toast.success(r.success, { id: t }) }
        } catch { toast.error('Gagal mengunggah.', { id: t }) }
        finally { setUploading(false) }
    }

    async function handleForm(action: (fd: FormData) => Promise<{ error?: string; success?: string }>, setLoading: (v: boolean) => void, e: React.FormEvent<HTMLFormElement>, reset?: boolean) {
        e.preventDefault()
        setLoading(true)
        try {
            const r = await action(new FormData(e.currentTarget))
            if (r.error) toast.error(r.error)
            else if (r.success) { toast.success(r.success); if (reset) (e.target as HTMLFormElement).reset() }
        } catch { toast.error('Terjadi kesalahan.') }
        finally { setLoading(false) }
    }

    const sc = initialData.sheet_config || {}
    const spreadsheetDisplayUrl = initialData.spreadsheet_id ? `https://docs.google.com/spreadsheets/d/${initialData.spreadsheet_id}/edit` : ''

    return (
        <div className="space-y-6">
            {/* Tab Bar */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {TABS.map(tab => {
                    const Icon = tab.icon
                    return (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-white text-[#00529C] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Icon className="w-4 h-4" />{tab.label}
                        </button>
                    )
                })}
            </div>

            {/* ─── Tab: Umum ─────────────────────────────────────────────── */}
            {activeTab === 'umum' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Avatar Column */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
                            <div className="relative group mb-4">
                                <div className="w-32 h-32 rounded-full bg-blue-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-[#00529C] text-4xl font-bold ring-4 ring-[#15A4FA]/20">
                                    {avatar ? <img src={avatar} alt="Profile" className="w-full h-full object-cover" /> : initialData.name.charAt(0).toUpperCase()}
                                </div>
                                <label htmlFor="avatar-upload" className="absolute bottom-1 right-1 w-9 h-9 bg-[#15A4FA] hover:bg-[#00529C] text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-colors" title="Ubah Foto">
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                </label>
                                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 text-center">{initialData.name}</h3>
                            <p className="text-xs text-gray-500 bg-gray-50 px-2.5 py-0.5 rounded-full mt-1">{initialData.email}</p>
                        </div>
                    </div>

                    {/* Forms Column */}
                    <div className="md:col-span-2 space-y-5">
                        {/* Details */}
                        <Card icon={<User className="w-4.5 h-4.5 text-[#00529C]" />} title="Informasi Pribadi">
                            <form onSubmit={(e) => handleForm(updateProfileDetailsAction, setSavingDetails, e)} className="space-y-4">
                                <Input id="name" name="name" label="Nama Tampilan" defaultValue={initialData.name} required />
                                <div>
                                    <Input id="email" name="email" label="Alamat Email" type="email" defaultValue={initialData.email} required />
                                    <p className="text-[11px] text-gray-500 mt-1.5">Perubahan email memerlukan verifikasi ulang.</p>
                                </div>
                                <SubmitBtn loading={savingDetails} label="Simpan" />
                            </form>
                        </Card>

                        {/* Spreadsheet URL */}
                        <Card icon={<Link2 className="w-4.5 h-4.5 text-[#00529C]" />} title="Konfigurasi Spreadsheet">
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

                        {/* Password */}
                        <Card icon={<KeyRound className="w-4.5 h-4.5 text-[#00529C]" />} title="Ubah Password">
                            <form onSubmit={(e) => handleForm(updatePasswordAction, setSavingPassword, e, true)} className="space-y-4">
                                <Input id="newPassword" name="newPassword" label="Password Baru" type="password" required minLength={6} placeholder="Minimal 6 karakter" />
                                <Input id="confirmPassword" name="confirmPassword" label="Konfirmasi Password" type="password" required minLength={6} placeholder="Ketik ulang" />
                                <SubmitBtn loading={savingPassword} label="Perbarui Password" variant="dark" />
                            </form>
                        </Card>
                    </div>
                </div>
            )}

            {/* ─── Tab: Ibadah ────────────────────────────────────────────── */}
            {activeTab === 'ibadah' && (
                <Card icon={<BookOpen className="w-4.5 h-4.5 text-[#00529C]" />} title="Konfigurasi Chart Ibadah">
                    <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                        Tentukan nama sheet dan range sel di Google Spreadsheet yang berisi data ibadah. Sistem akan membaca data dari konfigurasi ini.
                    </p>
                    <form onSubmit={(e) => handleForm(updateSheetConfigAction, setSavingIbadah, e)} className="space-y-4 max-w-lg">
                        <Input id="ibadahSheet" name="ibadahSheet" label="Nama Sheet Ibadah" defaultValue={sc.ibadah_sheet || sc.ibadah_sheet_name || 'LaporanIbadah'} placeholder="LaporanIbadah" />
                        <Input id="rerataRange" name="rerataRange" label="Range Sel Rerata (Opsional)" defaultValue={sc.rerata_range || ''} placeholder="Tahun ke-1!AJ12:AJ19" />
                        <SubmitBtn loading={savingIbadah} label="Simpan Konfigurasi Ibadah" />
                    </form>
                </Card>
            )}

            {/* ─── Tab: Pendidikan ────────────────────────────────────────── */}
            {activeTab === 'pendidikan' && (
                <Card icon={<GraduationCap className="w-4.5 h-4.5 text-[#00529C]" />} title="Konfigurasi Chart Pendidikan">
                    <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                        Tentukan range sel untuk data pendidikan. Sistem akan membaca data IP/IPK dan capaian dari Spreadsheet sesuai konfigurasi ini.
                    </p>
                    <form onSubmit={(e) => handleForm(updateEducationConfigAction, setSavingPendidikan, e)} className="space-y-4 max-w-lg">
                        <Input id="ipIpkRange" name="ipIpkRange" label="Range IP & IPK" defaultValue={sc.ip_ipk_range || ''} placeholder="Perkuliahan!B2:D10" />
                        <Input id="pembinaanRange" name="pembinaanRange" label="Range Pembinaan S/H Skills" defaultValue={sc.pembinaan_range || ''} placeholder="Pembinaan!A2:B20" />
                        <Input id="prestasiRange" name="prestasiRange" label="Range Riwayat Prestasi" defaultValue={sc.prestasi_range || ''} placeholder="Prestasi!A2:C10" />
                        <Input id="organisasiRange" name="organisasiRange" label="Range Riwayat Organisasi" defaultValue={sc.organisasi_range || ''} placeholder="Organisasi!A2:B10" />
                        <Input id="workshopRange" name="workshopRange" label="Range Workshop / Seminar" defaultValue={sc.workshop_range || ''} placeholder="Workshop!A2:B15" />
                        <SubmitBtn loading={savingPendidikan} label="Simpan Konfigurasi Pendidikan" />
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
                <h2 className="text-base font-bold text-gray-900">{title}</h2>
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

function SubmitBtn({ loading, label, variant }: { loading: boolean; label: string; variant?: 'dark' }) {
    const bg = variant === 'dark' ? 'bg-gray-800 hover:bg-gray-900 shadow-md' : 'bg-[#00529C] hover:bg-[#004280] shadow-[0_4px_14px_0_rgba(0,82,156,0.39)]'
    return (
        <button type="submit" disabled={loading} className={`py-2.5 px-5 ${bg} text-white text-sm font-semibold rounded-xl transition flex items-center gap-2 disabled:opacity-60`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Menyimpan...' : label}
        </button>
    )
}
