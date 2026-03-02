export default function FasilitatorLoading() {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Hero skeleton */}
            <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded-3xl p-8 md:p-10 h-40" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart skeleton */}
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <div className="h-5 w-56 bg-gray-200 rounded-lg mb-2" />
                    <div className="h-3 w-44 bg-gray-100 rounded-lg mb-6" />
                    <div className="h-80 bg-gray-50 rounded-2xl" />
                </div>

                {/* Feed skeleton */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <div className="h-5 w-32 bg-gray-200 rounded-lg mb-8" />
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-36 bg-gray-200 rounded-lg" />
                                <div className="h-3 w-full bg-gray-100 rounded-lg" />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-36 bg-gray-200 rounded-lg" />
                                <div className="h-3 w-full bg-gray-100 rounded-lg" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
