'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { updatePasswordAction, updateProfileDetailsAction } from './actions'
import { uploadAvatarAction } from './avatar-actions'
import { Camera, Loader2, Save, KeyRound, User } from 'lucide-react'

type ProfileData = {
    name: string
    email: string
    avatar_url: string
}

export default function ProfileForms({ initialData }: { initialData: ProfileData }) {
    const [avatar, setAvatar] = useState(initialData.avatar_url)
    const [uploading, setUploading] = useState(false)
    const [savingDetails, setSavingDetails] = useState(false)
    const [savingPassword, setSavingPassword] = useState(false)

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]
        const formData = new FormData()
        formData.append('avatar', file)

        setUploading(true)
        const loadingToast = toast.loading('Mengunggah foto...')

        try {
            const result = await uploadAvatarAction(formData)
            if (result.error) {
                toast.error(result.error, { id: loadingToast })
            } else if (result.success && result.avatarUrl) {
                setAvatar(result.avatarUrl)
                toast.success(result.success, { id: loadingToast })
            }
        } catch (err) {
            toast.error('Terjadi kesalahan saat mengunggah.', { id: loadingToast })
        } finally {
            setUploading(false)
        }
    }

    async function handleDetailsUpdate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSavingDetails(true)

        const formData = new FormData(e.currentTarget)
        try {
            const result = await updateProfileDetailsAction(formData)
            if (result.error) {
                toast.error(result.error)
            } else if (result.success) {
                toast.success(result.success, { duration: 5000 })
            }
        } catch (err) {
            toast.error('Terjadi kesalahan yang tidak terduga.')
        } finally {
            setSavingDetails(false)
        }
    }

    async function handlePasswordUpdate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSavingPassword(true)

        const form = e.currentTarget
        const formData = new FormData(form)

        try {
            const result = await updatePasswordAction(formData)
            if (result.error) {
                toast.error(result.error)
            } else if (result.success) {
                toast.success(result.success)
                form.reset()
            }
        } catch (err) {
            toast.error('Terjadi kesalahan yang tidak terduga.')
        } finally {
            setSavingPassword(false)
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Avatar Selection Column */}
            <div className="md:col-span-1">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center">
                    <div className="relative group mb-6">
                        <div className="w-40 h-40 rounded-full bg-blue-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-[#00529C] text-5xl font-bold ring-4 ring-[#15A4FA]/20">
                            {avatar ? (
                                <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                initialData.name.charAt(0).toUpperCase()
                            )}
                        </div>
                        <label
                            htmlFor="avatar-upload"
                            className="absolute bottom-2 right-2 w-10 h-10 bg-[#15A4FA] hover:bg-[#00529C] text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-colors"
                            title="Ubah Foto Profil"
                        >
                            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                        </label>
                        <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                            disabled={uploading}
                        />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 text-center">{initialData.name}</h3>
                    <p className="text-sm text-gray-500 text-center mt-1 bg-gray-50 px-3 py-1 rounded-full">{initialData.email}</p>
                </div>
            </div>

            {/* Forms Column */}
            <div className="md:col-span-2 space-y-6">

                {/* Details Form */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-8 py-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                        <User className="w-5 h-5 text-[#00529C]" />
                        <h2 className="text-lg font-bold text-gray-900">Informasi Pribadi</h2>
                    </div>
                    <div className="p-8">
                        <form onSubmit={handleDetailsUpdate} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="name">
                                    Nama Tampilan
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    defaultValue={initialData.name}
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#15A4FA] focus:border-transparent transition-all text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="email">
                                    Alamat Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    defaultValue={initialData.email}
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#15A4FA] focus:border-transparent transition-all text-gray-900"
                                />
                                <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                                    <svg className="w-4 h-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Catatan: Jika Anda mengubah email, kami akan mengirimkan tautan verifikasi ke email baru Anda. Perubahan akan aktif setelah Anda memverifikasinya.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={savingDetails}
                                className="w-full md:w-auto py-3 px-6 bg-[#00529C] hover:bg-[#004280] text-white font-semibold rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(0,82,156,0.39)]"
                            >
                                {savingDetails ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {savingDetails ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Password Form */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-8 py-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                        <KeyRound className="w-5 h-5 text-[#00529C]" />
                        <h2 className="text-lg font-bold text-gray-900">Ubah Password</h2>
                    </div>
                    <div className="p-8">
                        <form onSubmit={handlePasswordUpdate} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="newPassword">
                                    Password Baru
                                </label>
                                <input
                                    id="newPassword"
                                    name="newPassword"
                                    type="password"
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#15A4FA] focus:border-transparent transition-all text-gray-900"
                                    placeholder="Minimal 6 karakter"
                                    minLength={6}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="confirmPassword">
                                    Konfirmasi Password Baru
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#15A4FA] focus:border-transparent transition-all text-gray-900"
                                    placeholder="Ketik ulang password baru"
                                    minLength={6}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={savingPassword}
                                className="w-full md:w-auto py-3 px-6 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-md"
                            >
                                {savingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {savingPassword ? 'Menyimpan...' : 'Perbarui Password'}
                            </button>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    )
}
