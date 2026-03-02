import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        {/* Animated Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#15A4FA]/20 to-[#00529C]/20 rounded-full blur-2xl scale-150 animate-pulse" />
            <div className="relative bg-gradient-to-br from-[#00529C]/10 to-[#15A4FA]/10 p-8 rounded-full border border-[#15A4FA]/20">
              <FileQuestion
                className="w-16 h-16 text-[#00529C]"
                strokeWidth={1.5}
              />
            </div>
          </div>
        </div>

        {/* Text */}
        <div>
          <h1 className="text-8xl font-black bg-gradient-to-r from-[#00529C] to-[#15A4FA] bg-clip-text text-transparent tracking-tight">
            404
          </h1>
          <h2 className="text-2xl font-bold text-gray-900 mt-4">
            Halaman Tidak Ditemukan
          </h2>
          <p className="text-gray-500 mt-3 leading-relaxed">
            Maaf, halaman yang Anda cari tidak tersedia atau sedang dalam tahap pengembangan.
          </p>
        </div>

        {/* Action */}
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#00529C] to-[#15A4FA] text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
