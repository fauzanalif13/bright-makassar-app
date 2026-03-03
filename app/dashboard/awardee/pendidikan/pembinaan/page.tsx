'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { getPembinaanEntries, addPembinaanEntry, updatePembinaanEntry } from './actions'
import type { PembinaanEntry } from './actions'
import toast from 'react-hot-toast'
import {
    GraduationCap,
    Plus,
    Loader2,
    CheckCircle2,
    Send,
    X,
    ExternalLink,
    CalendarDays,
    BookOpen,
    User,
    Link2,
    RefreshCw,
    Pencil,
    Save,
    ChevronDown,
} from 'lucide-react'

// ─── Form Field Configuration ────────────────────────────────────────
// Single source of truth for form fields. Used by both Add and Edit forms.

const FORM_FIELDS = [
    {
        name: 'tanggal',
        label: 'Tanggal',
        type: 'date' as const,
        icon: CalendarDays,
        placeholder: '',
        required: true,
        helpText: 'Tanggal pelaksanaan pembinaan',
    },
    {
        name: 'tema',
        label: 'Tema Pembinaan',
        type: 'text' as const,
        icon: BookOpen,
        placeholder: 'Contoh: Pelatihan Essai, Pembinaan Kajian Islam',
        required: true,
        helpText: 'Judul atau tema kegiatan pembinaan',
    },
    {
        name: 'narasumber',
        label: 'Narasumber',
        type: 'text' as const,
        icon: User,
        placeholder: 'Contoh: Dr. Ahmad Syafii, M.Pd.',
        required: true,
        helpText: 'Nama narasumber atau pembicara',
    },
    {
        name: 'linkResume',
        label: 'Link Resume / Laporan',
        type: 'url' as const,
        icon: Link2,
        placeholder: 'https://drive.google.com/...',
        required: false,
        helpText: 'Link Google Drive file resume (opsional)',
    },
] as const

// ─── Entry Limit Options ─────────────────────────────────────────────

const LIMIT_OPTIONS = [
    { value: 10, label: '10 terbaru' },
    { value: 30, label: '30 terbaru' },
    { value: 50, label: '50 terbaru' },
    { value: -1, label: 'Semua data' },
] as const

// ─── Component ───────────────────────────────────────────────────────

export default function PembinaanPage() {
    const [entries, setEntries] = useState<PembinaanEntry[]>([])
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [isFetching, startFetch] = useTransition()
    const [editingRow, setEditingRow] = useState<number | null>(null)
    const [editValues, setEditValues] = useState<Record<string, string>>({})
    const [isSavingEdit, setIsSavingEdit] = useState(false)
    const [displayLimit, setDisplayLimit] = useState<number>(10)

    // Fetch existing entries on mount
    const fetchEntries = useCallback(() => {
        startFetch(async () => {
            const result = await getPembinaanEntries()
            if (result.error) {
                toast.error(result.error)
            } else if (result.data) {
                setEntries(result.data)
            }
        })
    }, [])

    useEffect(() => {
        fetchEntries()
    }, [fetchEntries])

    // Handle add form submission
    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true)
        setSubmitted(false)

        const result = await addPembinaanEntry(formData)

        setIsSubmitting(false)

        if (result.error) {
            toast.error(result.error)
        } else if (result.success) {
            toast.success(result.success)
            setSubmitted(true)
            setIsFormOpen(false)
            fetchEntries()
            setTimeout(() => setSubmitted(false), 3000)
        }
    }

    // Start editing a row
    function startEdit(entry: PembinaanEntry) {
        setEditingRow(entry.rowIndex)
        setEditValues({
            tanggal: entry.tanggal,
            tema: entry.tema,
            narasumber: entry.narasumber,
            linkResume: entry.linkResume,
        })
    }

    // Cancel editing
    function cancelEdit() {
        setEditingRow(null)
        setEditValues({})
    }

    // Save edited row
    async function saveEdit(rowIndex: number) {
        setIsSavingEdit(true)

        const formData = new FormData()
        formData.set('rowIndex', String(rowIndex))
        formData.set('tanggal', editValues.tanggal || '')
        formData.set('tema', editValues.tema || '')
        formData.set('narasumber', editValues.narasumber || '')
        formData.set('linkResume', editValues.linkResume || '')

        const result = await updatePembinaanEntry(formData)

        setIsSavingEdit(false)

        if (result.error) {
            toast.error(result.error)
        } else if (result.success) {
            toast.success(result.success)
            setEditingRow(null)
            setEditValues({})
            fetchEntries()
        }
    }

    // Compute visible entries based on display limit
    const visibleEntries = displayLimit === -1
        ? entries
        : entries.slice(-displayLimit)

    return (
        <div className="space-y-6">
            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-linear-to-br from-[#00529C] to-[#15A4FA] text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                            Pembinaan S/H Skills
                        </h1>
                        <p className="text-gray-500 dark:text-slate-400 text-xs">
                            Daftar aktivitas pembinaan soft skills &amp; hard skills
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchEntries}
                        disabled={isFetching}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-[#00529C] to-[#15A4FA] text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        {isFormOpen ? (
                            <><X className="w-4 h-4" />Tutup Form</>
                        ) : (
                            <><Plus className="w-4 h-4" />Tambah Data</>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Add Entry Form ─────────────────────────────────── */}
            {isFormOpen && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/80 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                        <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Plus className="w-4 h-4 text-[#15A4FA]" />
                            Tambah Kegiatan Pembinaan Baru
                        </h2>
                    </div>

                    <form action={handleSubmit} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {FORM_FIELDS.map((field) => {
                                const IconComponent = field.icon
                                return (
                                    <div key={field.name} className={field.type === 'url' ? 'md:col-span-2' : ''}>
                                        <label
                                            htmlFor={field.name}
                                            className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5"
                                        >
                                            <IconComponent className="w-3.5 h-3.5 text-[#15A4FA]" />
                                            {field.label}
                                            {field.required && <span className="text-red-400">*</span>}
                                        </label>
                                        <input
                                            type={field.type}
                                            id={field.name}
                                            name={field.name}
                                            placeholder={field.placeholder}
                                            required={field.required}
                                            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#15A4FA]/40 focus:border-[#15A4FA] outline-none transition-all"
                                        />
                                        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
                                            {field.helpText}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="pt-5 mt-5 border-t border-gray-100 dark:border-slate-700 flex items-center gap-3">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-[#00529C] to-[#15A4FA] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:hover:scale-100"
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</>
                                ) : submitted ? (
                                    <><CheckCircle2 className="w-4 h-4" />Tersimpan!</>
                                ) : (
                                    <><Send className="w-4 h-4" />Kirim Data</>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                            >
                                Batal
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Existing Entries Table ──────────────────────────── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/80 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
                    <h2 className="text-sm font-bold text-gray-800 dark:text-white">
                        Riwayat Pembinaan
                    </h2>
                    <div className="flex items-center gap-3">
                        {/* Entry limit dropdown */}
                        <div className="relative">
                            <select
                                value={displayLimit}
                                onChange={(e) => setDisplayLimit(parseInt(e.target.value))}
                                className="appearance-none pl-3 pr-7 py-1.5 text-[11px] font-bold bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200 focus:ring-2 focus:ring-[#15A4FA]/40 cursor-pointer"
                            >
                                {LIMIT_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 dark:text-slate-500 pointer-events-none" />
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">
                            {isFetching ? '...' : `${visibleEntries.length} / ${entries.length} entri`}
                        </span>
                    </div>
                </div>

                {isFetching && entries.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 text-[#15A4FA] animate-spin" />
                        <span className="ml-2 text-sm text-gray-500 dark:text-slate-400">Memuat data...</span>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                            <BookOpen className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                        </div>
                        <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">Belum ada data pembinaan</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                            Klik &quot;Tambah Data&quot; untuk menambahkan kegiatan pembinaan pertama.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left table-fixed">
                            <colgroup>
                                <col className="w-[40px]" />
                                <col className="w-[110px]" />
                                <col />
                                <col className="w-[180px]" />
                                <col className="w-[100px]" />
                                <col className="w-[60px]" />
                            </colgroup>
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-slate-700">
                                    <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">No</th>
                                    <th className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                                    <th className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tema Pembinaan</th>
                                    <th className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Narasumber</th>
                                    <th className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Link</th>
                                    <th className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                {visibleEntries.map((entry, idx) => {
                                    const isEditing = editingRow === entry.rowIndex
                                    const displayIdx = displayLimit === -1
                                        ? idx + 1
                                        : entries.length - visibleEntries.length + idx + 1

                                    return (
                                        <tr
                                            key={entry.rowIndex}
                                            className={`transition-colors ${isEditing ? 'bg-blue-50/50 dark:bg-[#00529C]/10' : 'hover:bg-gray-50/50 dark:hover:bg-slate-700/30'}`}
                                        >
                                            <td className="px-4 py-2.5 text-xs font-bold text-gray-400 dark:text-slate-500">
                                                {displayIdx}
                                            </td>

                                            {/* Tanggal */}
                                            <td className="px-3 py-2.5 text-xs">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editValues.tanggal}
                                                        onChange={(e) => setEditValues({ ...editValues, tanggal: e.target.value })}
                                                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-xs text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none"
                                                    />
                                                ) : (
                                                    <span className="font-medium text-gray-700 dark:text-slate-300">{entry.tanggal}</span>
                                                )}
                                            </td>

                                            {/* Tema */}
                                            <td className="px-3 py-2.5 text-xs">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editValues.tema}
                                                        onChange={(e) => setEditValues({ ...editValues, tema: e.target.value })}
                                                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-xs text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none"
                                                    />
                                                ) : (
                                                    <span className="font-semibold text-gray-800 dark:text-slate-200 truncate block">{entry.tema}</span>
                                                )}
                                            </td>

                                            {/* Narasumber */}
                                            <td className="px-3 py-2.5 text-xs">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editValues.narasumber}
                                                        onChange={(e) => setEditValues({ ...editValues, narasumber: e.target.value })}
                                                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-xs text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none"
                                                    />
                                                ) : (
                                                    <span className="text-gray-600 dark:text-slate-300 truncate block">{entry.narasumber}</span>
                                                )}
                                            </td>

                                            {/* Link */}
                                            <td className="px-3 py-2.5 text-xs">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editValues.linkResume}
                                                        onChange={(e) => setEditValues({ ...editValues, linkResume: e.target.value })}
                                                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-xs text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none"
                                                    />
                                                ) : entry.linkResume ? (
                                                    <a
                                                        href={entry.linkResume}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-[#15A4FA] hover:text-[#00529C] dark:hover:text-[#60b5ff] font-semibold transition-colors"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        Lihat
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-slate-600">—</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3 py-2.5 text-xs">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => saveEdit(entry.rowIndex)}
                                                            disabled={isSavingEdit}
                                                            className="p-1.5 rounded-lg text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                                                            title="Simpan"
                                                        >
                                                            {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                                            title="Batal"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => startEdit(entry)}
                                                        className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-[#15A4FA] hover:bg-blue-50 dark:hover:bg-[#00529C]/20 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
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
        </div>
    )
}
