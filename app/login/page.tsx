'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { loginAction } from './actions'
import { createClient } from '@/src/utils/supabase/client'
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setErrorMsg('')

        const formData = new FormData(e.currentTarget)

        try {
            const result = await loginAction(formData)
            if (result?.error) {
                setErrorMsg(result.error)
                toast.error(result.error)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    async function handleGoogleLogin() {
        try {
            setLoading(true)
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`
                }
            })
            if (error) {
                toast.error('Gagal login dengan Google: ' + error.message)
            }
        } catch (error) {
            toast.error('Terjadi kesalahan saat otentikasi Google')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
            <div className="max-w-5xl w-full flex rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-zinc-900 min-h-[600px]">

                {/* Left Side - Branding */}
                <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-[#00529C] to-[#15A4FA] p-12 flex-col justify-between relative overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#15A4FA]/30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

                    <div className="relative z-10">

                        <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
                            Selamat Datang di <br />
                            <span className="text-blue-100">Sister Bright</span>
                        </h1>
                        <p className="text-white/80 text-lg max-w-sm">
                            Sistem Informasi Terpadu untuk memantau perkembangan Awardee Bright Scholarship YBM BRILiaN RO Makassar.

                        </p>
                    </div>

                    <div className="relative z-10">
                        <div className="flex align-middle space-x-4">
                            <img src="/logo-ybm-white.png" alt="Logo" width={120} />
                            <img src="/logo-bright.png" alt="Logo" width={120} />
                        </div>

                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
                    <div className="lg:hidden mb-8 text-center flex flex-col items-center">
                        <div className="w-14 h-14 bg-linear-to-br from-[#00529C] to-[#15A4FA] rounded-xl flex items-center justify-center text-white font-bold text-3xl mb-4 shadow-md">
                            B
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                            Sister Bright
                        </h2>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Masuk ke Akun</h2>
                        <p className="text-gray-500 dark:text-gray-400">Silakan masukkan detail login Anda di bawah.</p>
                    </div>

                    {errorMsg && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm border border-red-100 flex items-start gap-3">
                            <div className="mt-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span className="leading-relaxed">{errorMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2 dark:text-gray-300" htmlFor="email">
                                Alamat Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#15A4FA] focus:border-transparent transition-all dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-100"
                                    placeholder="nama@email.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2 dark:text-gray-300" htmlFor="password">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#15A4FA] focus:border-transparent transition-all dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-100"
                                    placeholder="••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center">
                                <input
                                    id="remember"
                                    name="remember"
                                    type="checkbox"
                                    className="h-4 w-4 text-[#00529C] focus:ring-[#15A4FA] border-gray-300 rounded cursor-pointer"
                                />
                                <label htmlFor="remember" className="ml-2 block text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                                    Ingat saya
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 px-4 bg-[#00529C] hover:bg-[#004280] text-white font-semibold rounded-xl shadow-[0_4px_14px_0_rgba(0,82,156,0.39)] hover:shadow-[0_6px_20px_rgba(0,82,156,0.23)] transition duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                            {loading ? 'Loading' : 'Masuk'}
                        </button>
                    </form>

                    <div className="mt-8 flex items-center justify-center space-x-4">
                        <div className="flex-1 border-t border-gray-200 dark:border-zinc-700"></div>
                        <span className="text-sm text-gray-400 font-medium px-2 bg-white dark:bg-zinc-900">Atau lanjutkan dengan</span>
                        <div className="flex-1 border-t border-gray-200 dark:border-zinc-700"></div>
                    </div>

                    <div className="mt-8">
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center px-4 py-3.5 border-2 border-gray-100 rounded-xl shadow-sm bg-white hover:bg-gray-50 hover:border-gray-200 text-gray-700 font-semibold transition-all duration-200 disabled:opacity-70 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-700"
                        >
                            <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Masuk dengan Google
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

