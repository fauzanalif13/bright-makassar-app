'use client'

import { useState, useEffect, useTransition, useCallback, useMemo } from 'react'
import { getOrganisasiEntries, addOrganisasiEntry, updateOrganisasiEntry, deleteOrganisasiEntries } from './actions'
import type { OrganisasiEntry } from './actions'
import DeleteConfirmModal from '@/src/components/DeleteConfirmModal'
import toast from 'react-hot-toast'
import {
    Users,
    Plus,
    Loader2,
    CheckCircle2,
    Send,
    X,
    CalendarDays,
    Building2,
    Briefcase,
    Tag,
    RefreshCw,
    Pencil,
    Save,
    ChevronDown,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Trash2,
    CheckSquare,
    Square
} from 'lucide-react'

const LEVEL_OPTIONS = ['Lokal/Kampus', 'Kota/Kabupaten', 'Provinsi', 'Nasional', 'Internasional'] as const

const LIMIT_OPTIONS = [
    { value: 10, label: '10 terbaru' },
    { value: 30, label: '30 terbaru' },
    { value: 50, label: '50 terbaru' },
    { value: -1, label: 'Semua data' },
] as const

// ─── Sort Types ──────────────────────────────────────────────────────

type SortKey = 'no' | 'tahun' | 'daftarOrganisasi' | 'jabatan' | 'level'
type SortDir = 'asc' | 'desc'
type SortState = { key: SortKey; dir: SortDir } | null

const LEVEL_ORDER: Record<string, number> = {
    'Lokal/Kampus': 1,
    'Kota/Kabupaten': 2,
    'Provinsi': 3,
    'Nasional': 4,
    'Internasional': 5,
}

// ─── Main Component ─────────────────────────────────────────────────

export default function OrganisasiPage() {
    const [entries, setEntries] = useState<OrganisasiEntry[]>([])
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [isFetching, startFetch] = useTransition()
    const [editingRow, setEditingRow] = useState<number | null>(null)
    const [editValues, setEditValues] = useState<Record<string, string>>({})
    const [isSavingEdit, setIsSavingEdit] = useState(false)
    const [displayLimit, setDisplayLimit] = useState<number>(10)
    const [sort, setSort] = useState<SortState>(null)
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchEntries = useCallback((forceRefresh?: boolean) => {
        startFetch(async () => {
            const result = await getOrganisasiEntries(forceRefresh === true)
            if (result.error) toast.error(result.error)
            else if (result.data) setEntries(result.data)
        })
    }, [])

    useEffect(() => { fetchEntries() }, [fetchEntries])

    // ─── Sort logic ──────────────────────────────────────────────────

    function toggleSort(key: SortKey) {
        setSort(prev => {
            if (prev?.key === key) {
                if (prev.dir === 'asc') return { key, dir: 'desc' }
                return null  // third click → reset to original sheet order
            }
            return { key, dir: 'asc' }
        })
    }

    function getSortIcon(key: SortKey) {
        if (sort?.key !== key) return <ArrowUpDown className="w-3 h-3 opacity-40" />
        if (sort.dir === 'asc') return <ArrowUp className="w-3 h-3 text-emerald-500" />
        return <ArrowDown className="w-3 h-3 text-emerald-500" />
    }

    const sortedEntries = useMemo(() => {
        // Default (no sort) = original sheet order (oldest first, 1→N)
        if (!sort) return entries

        const sorted = [...entries].sort((a, b) => {
            let aVal: string | number
            let bVal: string | number

            if (sort.key === 'no') {
                // Sort by original row index (sheet position)
                aVal = a.rowIndex
                bVal = b.rowIndex
            } else if (sort.key === 'level') {
                aVal = LEVEL_ORDER[a.level] || 0
                bVal = LEVEL_ORDER[b.level] || 0
            } else if (sort.key === 'tahun') {
                aVal = parseInt(a.tahun) || 0
                bVal = parseInt(b.tahun) || 0
            } else {
                aVal = a[sort.key].toLowerCase()
                bVal = b[sort.key].toLowerCase()
            }

            if (aVal < bVal) return sort.dir === 'asc' ? -1 : 1
            if (aVal > bVal) return sort.dir === 'asc' ? 1 : -1
            return 0
        })
        return sorted
    }, [entries, sort])

    // When "10 terbaru", take the LAST 10 (most recent entries)
    const visibleEntries = displayLimit === -1
        ? sortedEntries
        : sortedEntries.slice(-displayLimit)

    // ─── Submit / Edit handlers ──────────────────────────────────────

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true); setSubmitted(false)

        const result = await addOrganisasiEntry(formData)

        if (result.error) {
            setIsSubmitting(false)
            toast.error(result.error)
        } else {
            // Optimistic: add immediately after server confirms
            if (result.newEntry) {
                setEntries(prev => [...prev, result.newEntry!])
            } else {
                fetchEntries()
            }
            setIsSubmitting(false)
            setSubmitted(true)
            setIsFormOpen(false)
            setSort(null) // reset sort to show nearest locally
            toast.success(result.success!)
            setTimeout(() => setSubmitted(false), 3000)
        }
    }

    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; rowIndices: number[] }>({ isOpen: false, rowIndices: [] })
    function requestDelete(rowIndices: number[]) { setDeleteModal({ isOpen: true, rowIndices }) }
    async function handleDelete(rowIndices: number[]) {
        setDeleteModal({ isOpen: false, rowIndices: [] })
        setIsDeleting(true)

        // Optimistic delete
        setEntries(prev => prev.filter(e => !rowIndices.includes(e.rowIndex)))
        setSelectedRows(new Set())

        const result = await deleteOrganisasiEntries(rowIndices)
        setIsDeleting(false)
        if (result.error) {
            toast.error(result.error)
            fetchEntries(true)
        } else {
            toast.success(result.success!)
        }
    }

    function toggleSelectAll() {
        if (selectedRows.size === visibleEntries.length) {
            setSelectedRows(new Set())
        } else {
            setSelectedRows(new Set(visibleEntries.map(e => e.rowIndex)))
        }
    }

    function toggleSelect(rowIndex: number) {
        const newSet = new Set(selectedRows)
        if (newSet.has(rowIndex)) newSet.delete(rowIndex)
        else newSet.add(rowIndex)
        setSelectedRows(newSet)
    }

    function startEdit(entry: OrganisasiEntry) {
        setEditingRow(entry.rowIndex)
        setEditValues({ tahun: entry.tahun, daftarOrganisasi: entry.daftarOrganisasi, jabatan: entry.jabatan, level: entry.level })
    }

    async function saveEdit(rowIndex: number) {
        setIsSavingEdit(true)

        // Optimistic: immediately update local state
        setEntries(prev => prev.map(e => e.rowIndex === rowIndex ? {
            ...e,
            tahun: editValues.tahun || e.tahun,
            daftarOrganisasi: editValues.daftarOrganisasi || e.daftarOrganisasi,
            jabatan: editValues.jabatan || e.jabatan,
            level: editValues.level ?? e.level,
        } : e))
        setEditingRow(null)

        const fd = new FormData()
        fd.set('rowIndex', String(rowIndex))
        fd.set('tahun', editValues.tahun || '')
        fd.set('daftarOrganisasi', editValues.daftarOrganisasi || '')
        fd.set('jabatan', editValues.jabatan || '')
        fd.set('level', editValues.level || '')
        const result = await updateOrganisasiEntry(fd)
        setIsSavingEdit(false)
        setEditValues({})
        if (result.error) {
            toast.error(result.error)
            fetchEntries()
        } else {
            toast.success(result.success!)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-linear-to-br from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Riwayat Organisasi</h1>
                        <p className="text-gray-500 dark:text-slate-400 text-xs">Aktivitas organisasi selama perkuliahan</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {selectedRows.size > 0 && (
                        <button onClick={() => requestDelete(Array.from(selectedRows))} disabled={isDeleting} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-red-500 rounded-lg shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-50">
                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Hapus ({selectedRows.size})
                        </button>
                    )}
                    <button onClick={() => fetchEntries(true)} disabled={isFetching || isDeleting} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50">
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                    <button onClick={() => setIsFormOpen(!isFormOpen)} disabled={isDeleting} className="inline-flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-emerald-500 to-teal-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                        {isFormOpen ? <><X className="w-4 h-4" />Tutup Form</> : <><Plus className="w-4 h-4" />Tambah Data</>}
                    </button>
                </div>
            </div>

            {/* Add Form */}
            {isFormOpen && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/80 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                        <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-500" /> Tambah Organisasi Baru</h2>
                    </div>
                    <form action={handleSubmit} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label htmlFor="tahun" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5"><CalendarDays className="w-3.5 h-3.5 text-emerald-500" /> Tahun <span className="text-red-400">*</span></label>
                                <input type="text" id="tahun" name="tahun" placeholder="2024" required className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/40 outline-none transition-all" />
                            </div>
                            <div>
                                <label htmlFor="daftarOrganisasi" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5"><Building2 className="w-3.5 h-3.5 text-emerald-500" /> Nama Organisasi <span className="text-red-400">*</span></label>
                                <input type="text" id="daftarOrganisasi" name="daftarOrganisasi" placeholder="Contoh: BEM Fakultas Ekonomi" required className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/40 outline-none transition-all" />
                            </div>
                            <div>
                                <label htmlFor="jabatan" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5"><Briefcase className="w-3.5 h-3.5 text-emerald-500" /> Jabatan <span className="text-red-400">*</span></label>
                                <input type="text" id="jabatan" name="jabatan" placeholder="Contoh: Anggota, Ketua Divisi" required className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/40 outline-none transition-all" />
                            </div>
                            <div>
                                <label htmlFor="level" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5"><Tag className="w-3.5 h-3.5 text-emerald-500" /> Level</label>
                                <select id="level" name="level" className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-400/40 outline-none transition-all">
                                    <option value="">— Pilih Level —</option>
                                    {LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="pt-5 mt-5 border-t border-gray-100 dark:border-slate-700 flex items-center gap-3">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-emerald-500 to-teal-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</>
                                ) : submitted ? (
                                    <><CheckCircle2 className="w-4 h-4" />Tersimpan!</>
                                ) : (
                                    <><Send className="w-4 h-4" />Kirim Data</>
                                )}
                            </button>
                            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors">Batal</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/80 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
                    <h2 className="text-sm font-bold text-gray-800 dark:text-white">Riwayat Organisasi</h2>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <select value={displayLimit} onChange={(e) => setDisplayLimit(parseInt(e.target.value))} className="appearance-none pl-3 pr-7 py-1.5 text-[11px] font-bold bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-400/40 cursor-pointer">
                                {LIMIT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 dark:text-slate-500 pointer-events-none" />
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">{isFetching ? '...' : `${visibleEntries.length} / ${entries.length} entri`}</span>
                    </div>
                </div>

                {isFetching && entries.length === 0 ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /><span className="ml-2 text-sm text-gray-500 dark:text-slate-400">Memuat data...</span></div>
                ) : entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-3"><Users className="w-5 h-5 text-gray-400 dark:text-slate-500" /></div>
                        <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">Belum ada data organisasi</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left table-fixed">
                            <colgroup><col className="w-[36px]" /><col className="w-[40px]" /><col className="w-[70px]" /><col /><col className="w-[130px]" /><col className="w-[130px]" /><col className="w-[80px]" /></colgroup>
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-slate-700">
                                    <th className="px-3 py-3 w-8 text-center pt-3.5">
                                        <button onClick={toggleSelectAll} className="text-gray-400 hover:text-emerald-500 transition-colors">
                                            {visibleEntries.length > 0 && selectedRows.size === visibleEntries.length ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4" />}
                                        </button>
                                    </th>
                                    <SortableHeader label="No" sortKey="no" sort={sort} onClick={toggleSort} getIcon={getSortIcon} narrow />
                                    <SortableHeader label="Tahun" sortKey="tahun" sort={sort} onClick={toggleSort} getIcon={getSortIcon} />
                                    <SortableHeader label="Daftar Organisasi" sortKey="daftarOrganisasi" sort={sort} onClick={toggleSort} getIcon={getSortIcon} />
                                    <SortableHeader label="Jabatan" sortKey="jabatan" sort={sort} onClick={toggleSort} getIcon={getSortIcon} />
                                    <SortableHeader label="Level" sortKey="level" sort={sort} onClick={toggleSort} getIcon={getSortIcon} />
                                    <th className="px-3 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                {visibleEntries.map((entry, idx) => {
                                    const isEditing = editingRow === entry.rowIndex
                                    const isSelected = selectedRows.has(entry.rowIndex)
                                    // Show the entry's position in the original (unsorted) array
                                    const originalPos = entries.indexOf(entry) + 1
                                    return (
                                        <tr key={entry.rowIndex} className={`transition-colors ${isEditing || isSelected ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'hover:bg-gray-50/50 dark:hover:bg-slate-700/30'}`}>
                                            <td className="px-3 py-2.5 text-center">
                                                <button onClick={() => toggleSelect(entry.rowIndex)} className="text-gray-400 hover:text-emerald-500 transition-colors">
                                                    {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4" />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs font-bold text-gray-400 dark:text-slate-500">{originalPos}</td>
                                            <td className="px-3 py-2.5 text-xs">{isEditing ? <input type="text" value={editValues.tahun} onChange={(e) => setEditValues({ ...editValues, tahun: e.target.value })} className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-xs focus:ring-2 focus:ring-emerald-400/40 outline-none" /> : <span className="font-medium text-gray-700 dark:text-slate-300">{entry.tahun}</span>}</td>
                                            <td className="px-3 py-2.5 text-xs">{isEditing ? <input type="text" value={editValues.daftarOrganisasi} onChange={(e) => setEditValues({ ...editValues, daftarOrganisasi: e.target.value })} className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-xs focus:ring-2 focus:ring-emerald-400/40 outline-none" /> : <span className="font-semibold text-gray-800 dark:text-slate-200 truncate block">{entry.daftarOrganisasi}</span>}</td>
                                            <td className="px-3 py-2.5 text-xs">{isEditing ? <input type="text" value={editValues.jabatan} onChange={(e) => setEditValues({ ...editValues, jabatan: e.target.value })} className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-xs focus:ring-2 focus:ring-emerald-400/40 outline-none" /> : <span className="text-gray-600 dark:text-slate-300">{entry.jabatan}</span>}</td>
                                            <td className="px-3 py-2.5 text-xs">{isEditing ? <select value={editValues.level} onChange={(e) => setEditValues({ ...editValues, level: e.target.value })} className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-xs focus:ring-2 focus:ring-emerald-400/40 outline-none"><option value="">—</option>{LEVEL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select> : <LevelBadge level={entry.level} />}</td>
                                            <td className="px-3 py-2.5 text-xs">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-1"><button onClick={() => saveEdit(entry.rowIndex)} disabled={isSavingEdit} className="p-1.5 rounded-lg text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50" title="Simpan">{isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}</button><button onClick={() => { setEditingRow(null); setEditValues({}) }} className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title="Batal"><X className="w-3.5 h-3.5" /></button></div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => startEdit(entry)} className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => requestDelete([entry.rowIndex])} disabled={isDeleting} className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <DeleteConfirmModal isOpen={deleteModal.isOpen} count={deleteModal.rowIndices.length} label="data organisasi" isDeleting={isDeleting} onConfirm={() => handleDelete(deleteModal.rowIndices)} onCancel={() => setDeleteModal({ isOpen: false, rowIndices: [] })} />
        </div>
    )
}

// ─── Sub-Components ─────────────────────────────────────────────────

function SortableHeader({ label, sortKey, sort, onClick, getIcon, narrow }: {
    label: string
    sortKey: SortKey
    sort: SortState
    onClick: (key: SortKey) => void
    getIcon: (key: SortKey) => React.ReactNode
    narrow?: boolean
}) {
    const isActive = sort?.key === sortKey
    return (
        <th className={narrow ? 'px-4 py-3' : 'px-3 py-3'}>
            <button
                onClick={() => onClick(sortKey)}
                className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    isActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                }`}
            >
                {label}
                {getIcon(sortKey)}
            </button>
        </th>
    )
}

function LevelBadge({ level }: { level: string }) {
    const cls = level === 'Internasional'
        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
        : level === 'Nasional'
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
        : level === 'Provinsi'
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
        : level === 'Kota/Kabupaten'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'

    return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>{level || '—'}</span>
}
