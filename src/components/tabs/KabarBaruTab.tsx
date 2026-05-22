'use client'

import { useState, useEffect, useTransition, useCallback, useRef } from 'react'
import { getKabarBaruFeed, getActiveBatches } from '@/app/dashboard/fasilitator/actions'
import type { KabarBaruItem } from '@/app/dashboard/fasilitator/actions'
import { useTheme } from '@/src/components/ThemeProvider'
import {
    Megaphone, CalendarDays, Trophy, ArrowUpDown, Filter,
    Users, Loader2, ChevronDown, Newspaper
} from 'lucide-react'

const TYPE_CONFIG: Record<string, {
    label: string
    icon: any
    colorLight: string
    colorDark: string
    bgLight: string
    bgDark: string
    accentLight: string
    accentDark: string
}> = {
    pengumuman: {
        label: 'Pengumuman',
        icon: Megaphone,
        colorLight: 'text-[#00529C]', colorDark: 'text-[#60b5ff]',
        bgLight: 'bg-blue-50', bgDark: 'bg-[#00529C]/15',
        accentLight: '#00529C', accentDark: '#60b5ff',
    },
    pembinaan: {
        label: 'Pembinaan',
        icon: CalendarDays,
        colorLight: 'text-emerald-600', colorDark: 'text-emerald-400',
        bgLight: 'bg-emerald-50', bgDark: 'bg-emerald-500/15',
        accentLight: '#059669', accentDark: '#34d399',
    },
    prestasi: {
        label: 'Prestasi',
        icon: Trophy,
        colorLight: 'text-amber-600', colorDark: 'text-amber-400',
        bgLight: 'bg-amber-50', bgDark: 'bg-amber-500/15',
        accentLight: '#D97706', accentDark: '#fbbf24',
    },
}

export default function KabarBaruTab() {
    const { isDark } = useTheme()
    const [items, setItems] = useState<KabarBaruItem[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [page, setPage] = useState(0)
    const [isPending, startTransition] = useTransition()
    const sentinelRef = useRef<HTMLDivElement>(null)

    // Filters
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
    const [filterAngkatan, setFilterAngkatan] = useState('Semua')
    const [filterGender, setFilterGender] = useState('Semua')

    // Batch options
    const [batches, setBatches] = useState<{ label: string; value: string }[]>([])

    useEffect(() => {
        getActiveBatches().then((b: {label: string, value: string}[]) => {
            setBatches(b)
            if (b.length > 0 && filterAngkatan === 'Semua') {
                setFilterAngkatan(b[0].value) // default to latest batch
            }
        }).catch(() => {})
    }, [])

    // Fetch initial page on filter change (resets pagination)
    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setPage(0)
        setItems([])
        setHasMore(false)

        startTransition(async () => {
            try {
                const { items: data, hasMore: more } = await getKabarBaruFeed({
                    sortOrder,
                    angkatan: filterAngkatan,
                    gender: filterGender,
                    page: 0,
                    pageSize: 10,
                })
                if (!cancelled) {
                    setItems(data)
                    setHasMore(more)
                }
            } catch (err) {
                console.error('Failed to fetch Kabar Baru:', err)
            } finally {
                if (!cancelled) setLoading(false)
            }
        })

        return () => { cancelled = true }
    }, [sortOrder, filterAngkatan, filterGender])

    // Load more items
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return
        setLoadingMore(true)
        const nextPage = page + 1
        try {
            const { items: data, hasMore: more } = await getKabarBaruFeed({
                sortOrder,
                angkatan: filterAngkatan,
                gender: filterGender,
                page: nextPage,
                pageSize: 10,
            })
            setItems(prev => [...prev, ...data])
            setHasMore(more)
            setPage(nextPage)
        } catch (err) {
            console.error('Failed to load more:', err)
        } finally {
            setLoadingMore(false)
        }
    }, [loadingMore, hasMore, page, sortOrder, filterAngkatan, filterGender])

    // Infinite scroll via Intersection Observer
    useEffect(() => {
        const node = sentinelRef.current
        if (!node) return
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) loadMore() },
            { rootMargin: '200px' }
        )
        observer.observe(node)
        return () => observer.disconnect()
    }, [loadMore])

    const formatTimestamp = (ts: string) => {
        try {
            const d = new Date(ts)
            if (isNaN(d.getTime())) return ''
            const now = new Date()
            const diff = now.getTime() - d.getTime()
            const mins = Math.floor(diff / 60000)
            if (mins < 1) return 'Baru saja'
            if (mins < 60) return `${mins} menit lalu`
            const hours = Math.floor(mins / 60)
            if (hours < 24) return `${hours} jam lalu`
            const days = Math.floor(hours / 24)
            if (days < 7) return `${days} hari lalu`
            return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        } catch { return '' }
    }

    return (
        <div className="space-y-5">
            {/* ─── Filter Bar ──────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 shrink-0">
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-semibold">Filter & Urutkan:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 flex-1">
                        {/* Sort */}
                        <div className="relative">
                            <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                className="appearance-none pl-8 pr-7 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none cursor-pointer"
                            >
                                <option value="newest">Terbaru</option>
                                <option value="oldest">Terlama</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Angkatan filter */}
                        <div className="relative">
                            <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                            <select
                                value={filterAngkatan}
                                onChange={(e) => setFilterAngkatan(e.target.value)}
                                className="appearance-none pl-8 pr-7 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none cursor-pointer"
                            >
                                {batches.map(b => (
                                    <option key={b.value} value={b.value}>{b.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Gender filter */}
                        <div className="relative">
                            <select
                                value={filterGender}
                                onChange={(e) => setFilterGender(e.target.value)}
                                className="appearance-none px-4 pr-7 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none cursor-pointer"
                            >
                                <option value="Semua">Semua Gender</option>
                                <option value="Putra">Putra</option>
                                <option value="Putri">Putri</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Feed ────────────────────────────────────────────── */}
            {loading || isPending ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
                    <Loader2 className="w-10 h-10 text-[#00529C] dark:text-[#60b5ff] animate-spin mb-4" />
                    <p className="text-gray-500 dark:text-slate-400 font-medium">Memuat kabar terbaru...</p>
                </div>
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                        <Newspaper className="w-8 h-8 text-gray-400 dark:text-slate-600" />
                    </div>
                    <p className="text-gray-500 dark:text-slate-400 font-semibold">Belum ada kabar terbaru</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Coba ubah filter untuk melihat lebih banyak</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((item, idx) => {
                        const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.pengumuman
                        const Icon = config.icon
                        const accent = isDark ? config.accentDark : config.accentLight

                        return (
                            <div
                                key={item.id}
                                className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                                style={{
                                    animationDelay: `${Math.min(idx, 9) * 50}ms`,
                                    animation: 'fadeInUp 0.4s ease-out forwards',
                                    opacity: 0,
                                }}
                            >
                                <div className="flex gap-4 p-5 relative">
                                    {/* Accent bar */}
                                    <div
                                        className="absolute left-0 top-0 w-1 h-full transition-all duration-300 group-hover:w-1.5"
                                        style={{ backgroundColor: accent }}
                                    />

                                    {/* Icon */}
                                    <div
                                        className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5 ${isDark ? config.bgDark : config.bgLight}`}
                                    >
                                        <Icon className="w-5 h-5" style={{ color: accent }} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2">
                                                {item.title}
                                            </h3>
                                            <span className="text-[11px] text-gray-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                                                {formatTimestamp(item.date)}
                                            </span>
                                        </div>

                                        <p className="text-gray-600 dark:text-slate-300 text-xs leading-relaxed mt-1.5 line-clamp-2">
                                            {item.content}
                                        </p>

                                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                                            {/* Type badge */}
                                            <span
                                                className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                                                style={{
                                                    color: accent,
                                                    backgroundColor: isDark
                                                        ? `${accent}15`
                                                        : `${accent}10`,
                                                }}
                                            >
                                                {config.label}
                                            </span>

                                            {/* Tipe sub-badge for pengumuman */}
                                            {item.tipe && (
                                                <span className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700">
                                                    {item.tipe}
                                                </span>
                                            )}

                                            {/* Author or Awardee */}
                                            {item.author && item.type === 'prestasi' ? (
                                                <span className="text-[10px] text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                                    🏆 {item.author}
                                                </span>
                                            ) : item.author ? (
                                                <span className="text-[10px] text-gray-500 dark:text-slate-400">
                                                    Oleh: {item.author}
                                                </span>
                                            ) : null}

                                            {/* Status badge for pembinaan */}
                                            {item.status && (
                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                                                    item.status === 'Selesai'
                                                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15'
                                                        : item.status === 'Berjalan'
                                                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15'
                                                        : 'text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {/* Load More Sentinel / Button */}
                    {hasMore && (
                        <div ref={sentinelRef} className="flex justify-center py-4">
                            {loadingMore ? (
                                <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="text-sm font-medium">Memuat lebih banyak...</span>
                                </div>
                            ) : (
                                <button
                                    onClick={loadMore}
                                    className="px-6 py-2.5 text-sm font-semibold text-[#00529C] dark:text-[#60b5ff] bg-blue-50 dark:bg-[#00529C]/15 rounded-xl hover:bg-blue-100 dark:hover:bg-[#00529C]/25 transition-colors"
                                >
                                    Muat Lebih Banyak
                                </button>
                            )}
                        </div>
                    )}

                    {!hasMore && items.length > 0 && (
                        <p className="text-center text-xs text-gray-400 dark:text-slate-500 py-4">
                            Semua kabar telah ditampilkan
                        </p>
                    )}
                </div>
            )}

            {/* Animation keyframe */}
            <style jsx>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(12px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    )
}
