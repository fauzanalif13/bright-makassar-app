export default function AwardeeLoading() {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Hero skeleton */}
            <div className="bg-gradient-to-r from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-600 rounded-3xl p-8 md:p-10 h-48" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart skeleton 1 */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-8">
                    <div className="h-5 w-48 bg-gray-200 dark:bg-slate-700 rounded-lg mb-2" />
                    <div className="h-3 w-24 bg-gray-100 dark:bg-slate-600 rounded-lg mb-6" />
                    <div className="h-72 bg-gray-50 dark:bg-slate-700/50 rounded-2xl" />
                </div>
                {/* Chart skeleton 2 */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-8">
                    <div className="h-5 w-36 bg-gray-200 dark:bg-slate-700 rounded-lg mb-2" />
                    <div className="h-3 w-32 bg-gray-100 dark:bg-slate-600 rounded-lg mb-6" />
                    <div className="h-72 bg-gray-50 dark:bg-slate-700/50 rounded-2xl" />
                </div>
            </div>

            {/* Announcements skeleton */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-8">
                <div className="h-6 w-56 bg-gray-200 dark:bg-slate-700 rounded-lg mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-36 bg-gray-50 dark:bg-slate-700/50 rounded-2xl" />
                    <div className="h-36 bg-gray-50 dark:bg-slate-700/50 rounded-2xl" />
                </div>
            </div>
        </div>
    )
}
