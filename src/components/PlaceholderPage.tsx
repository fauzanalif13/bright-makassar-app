import { Construction, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PlaceholderPage({ title, description, backHref = '/dashboard' }: { title: string; description?: string; backHref?: string }) {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
            <div className="text-center space-y-5 max-w-md">
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-linear-to-br from-[#15A4FA]/20 to-[#00529C]/10 rounded-full blur-2xl scale-150 animate-pulse" />
                        <div className="relative bg-linear-to-br from-[#00529C]/5 to-[#15A4FA]/5 dark:from-[#00529C]/20 dark:to-[#15A4FA]/20 p-6 rounded-full border border-[#15A4FA]/20 dark:border-[#15A4FA]/30">
                            <Construction className="w-10 h-10 text-[#00529C] dark:text-[#60b5ff]" strokeWidth={1.5} />
                        </div>
                    </div>
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">{title}</h1>
                    <p className="text-gray-500 dark:text-slate-300 text-sm mt-2 leading-relaxed">
                        {description || `Halaman ${title} sedang dalam tahap pengembangan. Fitur ini akan segera tersedia.`}
                    </p>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                    <Link href={backHref} className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-[#00529C] to-[#15A4FA] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                        <ArrowLeft className="w-4 h-4" />Kembali
                    </Link>
                </div>
            </div>
        </div>
    )
}
