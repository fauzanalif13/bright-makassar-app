import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-[#15A4FA] selection:text-white">
      <div className="text-center space-y-6 max-w-md">
        {/* Ikon Animasi/Visual */}
        <div className="flex justify-center">
          <div className="bg-[#00529C]/10 dark:bg-[#00529C]/20 p-6 rounded-full">
            <FileQuestion
              className="w-20 h-20 text-[#00529C] dark:text-[#60b5ff]"
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Teks 404 */}
        <div>
          <h1 className="text-7xl font-extrabold text-[#00529C] dark:text-[#60b5ff] tracking-tight">
            404
          </h1>
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mt-4">
            Halaman Tidak Ditemukan
          </h2>
          <p className="text-slate-500 dark:text-slate-300 mt-2">
            Maaf, fitur atau halaman yang Anda coba akses sedang dalam tahap
            pengembangan atau tidak tersedia.
          </p>
        </div>

        {/* Tombol Aksi */}
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-[#00529C] hover:bg-[#15A4FA] transition-colors duration-300 shadow-md hover:shadow-lg"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
