import PlaceholderPage from "@/src/components/PlaceholderPage";

export default function PesanKhususPlaceholder() {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-gray-100 dark:border-slate-700/60 p-6 md:p-8">
            <PlaceholderPage 
                title="Buat Pesan Khusus" 
                description="Fitur pengiriman pesan langsung ke Awardee sedang dalam tahap pengembangan." 
                backHref="/dashboard/fasilitator" 
            />
        </div>
    )
}
