'use client'

import { useState, useTransition, useEffect, useCallback, useMemo } from 'react'
import { getIbadahMonthEntries, getIbadahForDate, upsertIbadahHarian, updateIbadahCell, getAngkatan } from "./actions"
import type { IbadahEntry } from './actions'
import { useLoading } from "@/src/components/LoadingProvider"
import toast from 'react-hot-toast'
import DeleteConfirmModal from '@/src/components/DeleteConfirmModal'
import {
    BookOpen, Send, Loader2, CalendarDays, CheckCircle2, Edit3, PlusCircle,
    RefreshCw, Save, X, ChevronUp, ChevronDown,
    Pencil, Trash2, Info
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────

const TOGGLE_ACTIVITIES = [
    { name: 'dzikirPagi', label: 'Dzikir Pagi', emoji: '🌅' },
    { name: 'mendoakan', label: "Mendo'akan / Memaafkan", emoji: '🤲' },
    { name: 'shalatDhuha', label: 'Shalat Dhuha', emoji: '☀️' },
    { name: 'membacaQuran', label: 'Membaca Al-Quran', emoji: '📖' },
    { name: 'shaumSunnah', label: 'Shaum Sunnah', emoji: '🌙' },
    { name: 'berinfak', label: 'Berinfak', emoji: '💝' },
]

type IbadahData = {
    shalatBerjamaah: string
    qiyamulLail: string
    dzikirPagi: string
    mendoakan: string
    shalatDhuha: string
    membacaQuran: string
    shaumSunnah: string
    berinfak: string
}

const TABLE_ACTIVITIES = [
    { key: 'shalatBerjamaah', label: "Shalat Berjama'ah 5 Waktu", target: '5 waktu', actIdx: 0, type: 'number' as const, max: 5 },
    { key: 'qiyamulLail', label: 'Shalat Malam/Qiyamul Lail', target: '10×/bln', actIdx: 1, type: 'number' as const },
    { key: 'dzikirPagi', label: 'Dzikir Pagi', target: 'Tiap hari', actIdx: 2, type: 'boolean' as const },
    { key: 'mendoakan', label: "Mendo'akan/memaafkan", target: 'Tiap hari', actIdx: 3, type: 'boolean' as const },
    { key: 'shalatDhuha', label: 'Shalat Dhuha', target: 'Tiap hari', actIdx: 4, type: 'boolean' as const },
    { key: 'membacaQuran', label: 'Membaca Al-Quran', target: 'Tiap hari', actIdx: 5, type: 'boolean' as const },
    { key: 'shaumSunnah', label: 'Shaum Sunnah', target: '3×/bln', actIdx: 6, type: 'boolean' as const },
    { key: 'berinfak', label: 'Berinfak', target: 'Tiap hari', actIdx: 7, type: 'boolean' as const },
]

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

// ─── Sub-Components ─────────────────────────────────────────────────

function PageHeader() {
    return (
        <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00529C] to-[#15A4FA] text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BookOpen className="w-5 h-5" />
            </div>
            <div>
                <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Laporan Ibadah Harian</h1>
                <p className="text-gray-500 dark:text-slate-400 text-xs">Catat dan edit ibadah harianmu</p>
            </div>
        </div>
    )
}

function NumberActivity({
    id, name, label, emoji, hint, max, defaultValue, dateKey
}: {
    id: string; name: string; label: string; emoji: string
    hint: string; max?: number; defaultValue: string; dateKey: string
}) {
    return (
        <div>
            <h3 className="text-xs font-bold text-gray-700 dark:text-slate-200 mb-2">{emoji} {label}</h3>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-2">{hint}</p>
            <div className="flex items-center gap-2">
                <input
                    type="number" id={id} name={name} min="0" max={max}
                    key={`${id}-${dateKey}-${defaultValue}`}
                    defaultValue={defaultValue}
                    className="w-20 px-3 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-800 dark:text-slate-100 font-bold text-center text-lg focus:ring-2 focus:ring-[#15A4FA]/40 focus:border-[#15A4FA] outline-none transition-all"
                />
                {max ? <span className="text-xs text-gray-400 dark:text-slate-500">/ {max} waktu</span>
                    : <span className="text-xs text-gray-400 dark:text-slate-500">kali</span>}
            </div>
        </div>
    )
}

function ToggleActivity({ activity, isChecked, dateKey }: {
    activity: { name: string; label: string; emoji: string }
    isChecked: boolean; dateKey: string
}) {
    return (
        <label
            key={`${activity.name}-${dateKey}-${isChecked}`}
            htmlFor={activity.name}
            className="group relative flex items-center gap-2.5 p-3.5 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl cursor-pointer hover:border-[#15A4FA]/50 hover:bg-blue-50/30 dark:hover:bg-slate-700 transition-all has-[:checked]:bg-[#00529C]/5 dark:has-[:checked]:bg-[#00529C]/20 has-[:checked]:border-[#00529C] dark:has-[:checked]:border-[#60b5ff] has-[:checked]:shadow-sm"
        >
            <input
                type="checkbox" id={activity.name} name={activity.name}
                defaultChecked={isChecked}
                className="w-4.5 h-4.5 rounded border-2 border-gray-300 dark:border-slate-500 text-[#00529C] focus:ring-[#15A4FA] accent-[#00529C] cursor-pointer"
            />
            <span className="text-xs font-semibold text-gray-700 dark:text-slate-200 group-has-[:checked]:text-[#00529C] dark:group-has-[:checked]:text-[#60b5ff]">
                {activity.emoji} {activity.label}
            </span>
        </label>
    )
}

function BooleanCell({ value, onClick, day }: { value: string; onClick: () => void; day: number }) {
    if (value === '') {
        return <span className="text-[10px] text-gray-300 dark:text-slate-600 cursor-default">—</span>
    }
    const isTrue = value === '1'
    return (
        <button
            onClick={onClick}
            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all hover:scale-110 hover:shadow-sm cursor-pointer ${isTrue
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                }`}
            title={`Hari ${day}: Klik untuk edit`}
        >
            {isTrue ? '1' : '0'}
        </button>
    )
}

function NumberCell({ value, onClick, day }: { value: string; onClick: () => void; day: number }) {
    if (value === '') {
        return <span className="text-[10px] text-gray-300 dark:text-slate-600 cursor-default">—</span>
    }
    return (
        <button
            onClick={onClick}
            className="w-7 h-7 rounded-lg text-xs font-bold transition-all hover:scale-110 hover:shadow-sm cursor-pointer bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            title={`Hari ${day}: Klik untuk edit`}
        >
            {value}
        </button>
    )
}

function CellEditor({
    actType, editValue, setEditValue, onSave, onCancel, isSaving, max
}: {
    actType: 'boolean' | 'number'
    editValue: string; setEditValue: (v: string) => void
    onSave: () => void; onCancel: () => void; isSaving: boolean; max?: number
}) {
    return (
        <div className="flex flex-col items-center gap-0.5">
            {actType === 'boolean' ? (
                <button
                    type="button"
                    onClick={() => setEditValue(editValue === '1' ? '0' : '1')}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${editValue === '1'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                >
                    {editValue === '1' ? '✓' : '✗'}
                </button>
            ) : (
                <input
                    type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                    min="0" max={max} autoFocus
                    className="w-9 h-7 px-1 text-center text-xs font-bold bg-white dark:bg-slate-700 border border-blue-300 dark:border-blue-500 rounded-lg outline-none focus:ring-1 focus:ring-blue-400 text-gray-800 dark:text-slate-100"
                />
            )}
            <div className="flex gap-0.5">
                <button onClick={onSave} disabled={isSaving} className="p-0.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors disabled:opacity-50" title="Simpan">
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                </button>
                <button onClick={onCancel} className="p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors" title="Batal">
                    <X className="w-3 h-3" />
                </button>
            </div>
        </div>
    )
}

function PercentBadge({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
    const colorCls = value >= 80
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : value >= 50
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    const textCls = size === 'lg' ? 'text-sm font-black px-3 py-1' : 'text-xs font-bold px-2 py-1'
    return <span className={`${textCls} rounded-full ${colorCls}`}>{value}%</span>
}

// ─── Main Component ─────────────────────────────────────────────────

export default function LaporanIbadahHarianPage() {
    // ── Form State ──
    const [showForm, setShowForm] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [existingData, setExistingData] = useState<IbadahData | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [isFetching, startFetch] = useTransition()
    const [showTutorial, setShowTutorial] = useState(true)
    const { setGlobalLoading } = useLoading()

    // ── Table State ──
    const now = new Date()
    const [tableMonth, setTableMonth] = useState(now.getMonth() + 1)
    const [tableYear, setTableYear] = useState(now.getFullYear())
    const [userAngkatan, setUserAngkatan] = useState(now.getFullYear())
    const [entries, setEntries] = useState<IbadahEntry[]>([])
    const [isTableLoading, startTableFetch] = useTransition()
    const [tableMode, setTableMode] = useState<'view' | 'edit' | 'delete'>('view')
    // Edit mode: buffer of all editable values { 'day_actKey': string }
    const [editBuffer, setEditBuffer] = useState<Record<string, string>>({})
    const [isBatchSaving, setIsBatchSaving] = useState(false)
    // Delete mode: set of 'day_actKey' keys to clear
    const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    // ── Fetch form data when date changes ──
    useEffect(() => {
        if (!showForm) return
        startFetch(async () => {
            const result = await getIbadahForDate(selectedDate)
            if (result.error) { toast.error(result.error); setExistingData(null); setIsEditing(false); return }
            if (result.data) { setExistingData(result.data); setIsEditing(true) }
            else { setExistingData(null); setIsEditing(false) }
        })
    }, [selectedDate, showForm])

    // ── Fetch table data ──
    const fetchTableData = useCallback((forceRefresh?: boolean) => {
        startTableFetch(async () => {
            const result = await getIbadahMonthEntries(tableMonth, tableYear, forceRefresh === true)
            if (result.error) { toast.error(result.error); setEntries([]) }
            else if (result.data) setEntries(result.data)
        })
    }, [tableMonth, tableYear])

    useEffect(() => { fetchTableData() }, [fetchTableData])

    useEffect(() => {
        getAngkatan().then(val => {
            if (val) setUserAngkatan(val)
        })
    }, [])

    // ── Derived ──
    const daysInMonth = new Date(tableYear, tableMonth, 0).getDate()

    const dayMap = useMemo(() => {
        const map = new Map<number, IbadahEntry>()
        for (const e of entries) map.set(e.day, e)
        return map
    }, [entries])

    const percentages = useMemo(() => {
        const result: Record<string, number> = {}
        for (const act of TABLE_ACTIVITIES) {
            let sum = 0
            let filledCount = 0
            for (const e of entries) {
                const val = (e as any)[act.key]
                if (val !== '' && val !== undefined && val !== null) {
                    filledCount++
                    if (act.type === 'boolean') sum += val === '1' ? 1 : 0
                    else sum += parseFloat(val) || 0
                }
            }

            let pctFraction = 0
            if (act.key === 'shalatBerjamaah') {
                const avg = filledCount > 0 ? sum / filledCount : 0
                pctFraction = avg / 5
            } else if (act.key === 'qiyamulLail') {
                pctFraction = sum < 10 ? sum / 10 : 1
            } else if (act.key === 'shaumSunnah') {
                pctFraction = sum < 3 ? sum / 3 : 1
            } else {
                const avg = filledCount > 0 ? sum / filledCount : 0
                pctFraction = avg < 1 ? avg : 1
            }

            result[act.key] = Math.max(0, Math.min(100, Math.round(pctFraction * 100)))
        }
        return result
    }, [entries])

    const overallAvg = useMemo(() => {
        const vals = Object.values(percentages)
        if (vals.length === 0) return 0
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    }, [percentages])

    // ── Handlers ──
    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true)
        setGlobalLoading(true)
        setSubmitted(false)
        const result = await upsertIbadahHarian(formData)
        setIsSubmitting(false)
        setGlobalLoading(false)
        if (result.error) { toast.error(result.error) }
        else if (result.success) {
            toast.success(result.success)
            setSubmitted(true)
            setTimeout(() => setSubmitted(false), 3000)
            const d = new Date(selectedDate)
            if (d.getMonth() + 1 === tableMonth && d.getFullYear() === tableYear) fetchTableData(true)
        }
    }

    // ── Edit mode helpers ──
    function enterEditMode() {
        const buf: Record<string, string> = {}
        for (const e of entries) {
            for (const act of TABLE_ACTIVITIES) {
                const val = (e as any)[act.key]
                buf[`${e.day}_${act.key}`] = act.type === 'boolean' ? (val ? '1' : '0') : String(val ?? '')
            }
        }
        setEditBuffer(buf)
        setTableMode('edit')
    }

    function updateEditBuffer(day: number, actKey: string, value: string) {
        setEditBuffer(prev => ({ ...prev, [`${day}_${actKey}`]: value }))
    }

    async function batchSaveEdits() {
        setIsBatchSaving(true)
        setGlobalLoading(true)
        let changed = 0, failed = 0
        for (const e of entries) {
            for (const act of TABLE_ACTIVITIES) {
                const key = `${e.day}_${act.key}`
                const original = act.type === 'boolean' ? ((e as any)[act.key] ? '1' : '0') : String((e as any)[act.key] ?? '')
                const edited = editBuffer[key] ?? original
                if (edited !== original) {
                    changed++
                    const result = await updateIbadahCell(tableMonth, tableYear, e.day, act.actIdx, edited)
                    if (result.error) failed++
                }
            }
        }
        setIsBatchSaving(false)
        setGlobalLoading(false)
        if (changed === 0) { toast('Tidak ada perubahan', { icon: 'ℹ️' }); setTableMode('view'); return }
        if (failed > 0) { toast.error(`${failed} sel gagal disimpan`); fetchTableData(true) }
        else { toast.success(`${changed} perubahan berhasil disimpan! ✅`); fetchTableData(true) }
        setTableMode('view')
    }

    // ── Delete mode helpers ──
    function toggleCellSelection(day: number, actKey: string) {
        const key = `${day}_${actKey}`
        setSelectedCells(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key); else next.add(key)
            return next
        })
    }

    function toggleColumnSelection(day: number) {
        setSelectedCells(prev => {
            const next = new Set(prev)
            const dayActs = TABLE_ACTIVITIES.map(a => `${day}_${a.key}`)
                .filter(key => {
                    const e = dayMap.get(day)
                    if (!e) return false
                    const val = (e as any)[key.split('_')[1]]
                    return val !== ''
                })

            if (dayActs.length === 0) return next

            const allSelected = dayActs.every(k => next.has(k))
            if (allSelected) {
                dayActs.forEach(k => next.delete(k))
            } else {
                dayActs.forEach(k => next.add(k))
            }
            return next
        })
    }

    async function batchDeleteCells() {
        if (selectedCells.size === 0) return
        setShowDeleteModal(false)
        setIsBatchSaving(true)
        setGlobalLoading(true)
        let failed = 0
        for (const key of selectedCells) {
            const [dayStr, actKey] = key.split('_')
            const day = parseInt(dayStr)
            const act = TABLE_ACTIVITIES.find(a => a.key === actKey)
            if (!act) continue
            const result = await updateIbadahCell(tableMonth, tableYear, day, act.actIdx, '')
            if (result.error) failed++
        }
        setIsBatchSaving(false)
        setGlobalLoading(false)
        setSelectedCells(new Set())
        setTableMode('view')
        if (failed > 0) { toast.error(`${failed} sel gagal dihapus`); fetchTableData(true) }
        else { toast.success(`${selectedCells.size} sel berhasil dihapus! 🗑️`); fetchTableData(true) }
    }

    function exitMode() {
        setTableMode('view')
        setEditBuffer({})
        setSelectedCells(new Set())
    }

    const d = existingData

    return (
        <div className="space-y-6">
            <PageHeader />

            {/* ─── Collapsible Tutorial Card ───────────────────────────── */}
            <div className="bg-blue-50/80 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-800/40 rounded-2xl overflow-hidden">
                <button
                    onClick={() => setShowTutorial(!showTutorial)}
                    className="w-full px-4 sm:px-5 py-3 flex items-center justify-between hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-black text-blue-800 dark:text-blue-200">Petunjuk Pengisian</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-blue-400 dark:text-blue-500 transition-transform ${showTutorial ? 'rotate-180' : ''}`} />
                </button>
                {showTutorial && (
                    <div className="px-4 sm:px-5 pb-4 pt-0">
                        <ol className="text-[11px] text-blue-600/90 dark:text-blue-400/80 space-y-1.5 list-decimal list-outside pl-4 leading-relaxed">
                            <li>Isilah kolom pencapaian target ibadah harian ini dengan sebenar-benarnya ikhlas karena Allah Swt dan menjadikannya bagian dari pendidikan untuk diri sendiri!</li>
                            <li>Pada kolom <strong>shalat berjama&apos;ah</strong>, isi dengan angka jumlah shalat wajib berjama&apos;ah dalam sehari. Bila berhalangan (khusus wanita) maka kosongkan (tidak diinput)!</li>
                            <li>Pada kolom <strong>2-8</strong>, cukup menuliskan angka <strong>1</strong> (satu) bila dilakukan dan tulis angka <strong>0</strong> (nol) bila tidak dilakukan. Khusus wanita bila berhalangan maka cukup dikosongkan!</li>
                            <li>Bila dalam satu bulan kurang dari 31 hari, maka pada tanggal tersebut cukup dikosongkan (tidak diinput)!</li>
                        </ol>
                    </div>
                )}
            </div>

            {/* ─── Collapsible Input Form ────────────────────────────── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                {/* Toggle Button */}
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="w-full px-4 sm:px-6 py-4 flex items-center justify-between bg-gray-50/80 dark:bg-slate-700/50 hover:bg-gray-100/80 dark:hover:bg-slate-700 transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                        <PlusCircle className="w-4 h-4 text-[#15A4FA]" />
                        <span className="text-sm font-bold text-gray-800 dark:text-white">Input / Edit Ibadah Harian</span>
                        {isEditing && showForm && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">EDIT</span>
                        )}
                    </div>
                    {showForm ? <ChevronUp className="w-4 h-4 text-gray-400 dark:text-slate-500" /> : <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-500" />}
                </button>

                {showForm && (
                    <>
                        {/* Date Picker Bar */}
                        <div className="px-4 sm:px-6 py-3 border-t border-b border-gray-100 dark:border-slate-700 flex flex-wrap items-center gap-3 sm:gap-4">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-[#15A4FA]" />
                                <label htmlFor="datePicker" className="text-xs font-bold text-gray-700 dark:text-slate-200">Tanggal:</label>
                            </div>
                            <input
                                type="date" id="datePicker" value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#15A4FA]/40 focus:border-[#15A4FA] outline-none transition-all"
                            />
                            {isFetching && <Loader2 className="w-4 h-4 text-[#15A4FA] animate-spin" />}
                            {!isFetching && isEditing && (
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full">
                                    <Edit3 className="w-3 h-3" />Mode Edit
                                </span>
                            )}
                            {!isFetching && !isEditing && (
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full">
                                    <PlusCircle className="w-3 h-3" />Entri Baru
                                </span>
                            )}
                        </div>

                        {/* Form */}
                        <form action={handleSubmit} className="p-4 sm:p-6 space-y-6">
                            <input type="hidden" name="tanggal" value={selectedDate} />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <NumberActivity
                                    id="shalatBerjamaah" name="shalatBerjamaah"
                                    label="Shalat Berjama'ah 5 Waktu" emoji="🕌"
                                    hint="Berapa kali berjama'ah hari ini? (0 - 5)"
                                    max={5} defaultValue={d?.shalatBerjamaah || '0'} dateKey={selectedDate}
                                />
                                <NumberActivity
                                    id="qiyamulLail" name="qiyamulLail"
                                    label="Qiyamul Lail" emoji="🌌"
                                    hint="Berapa kali shalat malam?"
                                    defaultValue={d?.qiyamulLail || '0'} dateKey={selectedDate}
                                />
                            </div>

                            <div>
                                <h3 className="text-xs font-bold text-gray-700 dark:text-slate-200 mb-3">Aktivitas Ibadah Lainnya</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {TOGGLE_ACTIVITIES.map((activity) => (
                                        <ToggleActivity
                                            key={activity.name} activity={activity}
                                            isChecked={d ? d[activity.name as keyof IbadahData] === '1' : false}
                                            dateKey={selectedDate}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-slate-700 flex flex-wrap items-center gap-3">
                                <button type="submit" disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 bg-linear-to-r from-[#00529C] to-[#15A4FA] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:hover:scale-100">
                                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</> :
                                        submitted ? <><CheckCircle2 className="w-4 h-4" />Tersimpan!</> :
                                            isEditing ? <><Edit3 className="w-4 h-4" />Perbarui Data</> :
                                                <><Send className="w-4 h-4" />Kirim Laporan</>}
                                </button>
                                {isEditing && <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Data untuk tanggal ini akan diperbarui</p>}
                            </div>
                        </form>
                    </>
                )}
            </div>

            {/* ─── Monthly Table Card ────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                {/* Table Header Bar */}
                <div className="px-4 sm:px-6 py-4 bg-gray-50/80 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-bold text-gray-800 dark:text-white">Tabel Ibadah Bulanan</h2>
                        <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap">
                            {isTableLoading ? '...' : `${entries.length} hari terisi`}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Month Navigation */}
                        <div className="flex items-center gap-2 mr-2">
                            <select
                                value={tableMonth}
                                onChange={(e) => setTableMonth(Number(e.target.value))}
                                className="px-2 py-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all cursor-pointer"
                            >
                                {MONTH_NAMES.map((name, i) => (
                                    <option key={i} value={i + 1}>{name}</option>
                                ))}
                            </select>
                            <select
                                value={tableYear}
                                onChange={(e) => setTableYear(Number(e.target.value))}
                                className="px-2 py-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all cursor-pointer"
                            >
                                {Array.from({ length: 5 }, (_, i) => userAngkatan + i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        {/* Mode & Actions */}
                        {tableMode === 'view' ? (
                            <>
                                <button
                                    onClick={enterEditMode}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                    onClick={() => { setTableMode('delete'); setSelectedCells(new Set()) }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                                </button>
                                <button onClick={() => fetchTableData(true)} disabled={isTableLoading}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-all disabled:opacity-50">
                                    <RefreshCw className={`w-3.5 h-3.5 ${isTableLoading ? 'animate-spin' : ''}`} /> Refresh
                                </button>
                            </>
                        ) : tableMode === 'edit' ? (
                            <>
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md hidden sm:flex">Mode Edit</span>
                                <button onClick={batchSaveEdits} disabled={isBatchSaving}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors shadow-sm disabled:opacity-60">
                                    {isBatchSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Simpan
                                </button>
                                <button onClick={exitMode} disabled={isBatchSaving}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
                                    <X className="w-3.5 h-3.5" /> Batal
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md hidden sm:flex">Mode Hapus</span>
                                {selectedCells.size > 0 && (
                                    <button onClick={() => setShowDeleteModal(true)} disabled={isBatchSaving}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm disabled:opacity-60">
                                        {isBatchSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Hapus {selectedCells.size}
                                    </button>
                                )}
                                <button onClick={exitMode} disabled={isBatchSaving}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
                                    <X className="w-3.5 h-3.5" /> Batal
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Table */}
                {isTableLoading && entries.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 text-[#15A4FA] animate-spin" />
                        <span className="ml-2 text-sm text-gray-500 dark:text-slate-400">Memuat data...</span>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-4 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl m-4 bg-gray-50/50 dark:bg-slate-800/50">
                        <Info className="w-10 h-10 text-gray-400 dark:text-slate-500 mb-3" />
                        <h3 className="text-sm font-bold text-gray-700 dark:text-slate-200">Tidak ada tabel</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Apakah kamu memasukkan bulan & tahun dengan benar?</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto scrollbar-minimal">
                        <table className="w-full text-left" style={{ minWidth: `${200 + daysInMonth * 42 + 120}px` }}>
                            <thead>
                                <tr className="border-b-2 border-[#00529C] dark:border-[#15A4FA]">
                                    <th className="sticky left-0 z-10 bg-[#00529C] text-white px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider min-w-[32px]">No.</th>
                                    <th className="sticky left-[32px] z-10 bg-[#00529C] text-white px-3 py-2.5 text-[11px] font-bold min-w-[160px]">Aktivitas</th>
                                    {Array.from({ length: daysInMonth }, (_, i) => {
                                        const day = i + 1
                                        return (
                                            <th key={i} className="bg-[#00529C] text-white px-1 py-2.5 text-[11px] font-bold text-center min-w-[36px]">
                                                {tableMode === 'delete' ? (
                                                    <button
                                                        onClick={() => toggleColumnSelection(day)}
                                                        className="hover:text-red-300 transition-colors w-full"
                                                        title={`Pilih/Batal seluruh hari ${day}`}
                                                    >
                                                        {day}
                                                    </button>
                                                ) : day}
                                            </th>
                                        )
                                    })}
                                    <th className="bg-[#00529C] text-white px-2 py-2.5 text-[11px] font-bold text-center min-w-[50px] sticky right-0 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.15)] before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-white/20">%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {TABLE_ACTIVITIES.map((act, actIdx) => (
                                    <tr key={act.key} className={`border-b border-gray-100 dark:border-slate-700 ${actIdx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-800/50'} hover:bg-blue-50/30 dark:hover:bg-slate-700/30 transition-colors`}>
                                        <td className="sticky left-0 z-10 px-3 py-2 text-xs font-bold text-gray-500 dark:text-slate-400 bg-inherit">{actIdx + 1}</td>
                                        <td className="sticky left-[32px] z-10 px-3 py-2 text-xs font-semibold text-gray-800 dark:text-slate-200 bg-inherit whitespace-nowrap">{act.label}</td>

                                        {Array.from({ length: daysInMonth }, (_, dayIdx) => {
                                            const day = dayIdx + 1
                                            const entry = dayMap.get(day)
                                            const cellKey = `${day}_${act.key}`

                                            if (!entry) {
                                                return <td key={dayIdx} className="px-1 py-2 text-center"><span className="text-[10px] text-gray-300 dark:text-slate-600">—</span></td>
                                            }

                                            const val = (entry as any)[act.key]

                                            // ── Edit mode: inline restricted inputs ──
                                            if (tableMode === 'edit') {
                                                const bufVal = editBuffer[cellKey] ?? (act.type === 'boolean' ? (val ? '1' : '0') : String(val ?? ''))
                                                if (act.type === 'boolean' || (act.key === 'qiyamulLail')) {
                                                    // 0/1 toggle button
                                                    const isOn = bufVal === '1'
                                                    return (
                                                        <td key={dayIdx} className="px-0.5 py-1 text-center">
                                                            <button
                                                                onClick={() => updateEditBuffer(day, act.key, isOn ? '0' : '1')}
                                                                className={`w-7 h-7 rounded-md text-[11px] font-bold transition-all mx-auto flex items-center justify-center ${isOn
                                                                    ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                                                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                                    }`}
                                                            >
                                                                {isOn ? '1' : '0'}
                                                            </button>
                                                        </td>
                                                    )
                                                } else {
                                                    // Number input (1-5 for shalat berjamaah)
                                                    return (
                                                        <td key={dayIdx} className="px-0.5 py-1 text-center">
                                                            <input
                                                                type="number"
                                                                min={0} max={act.max || 99}
                                                                value={bufVal}
                                                                onChange={e => {
                                                                    let v = parseInt(e.target.value)
                                                                    if (isNaN(v)) v = 0
                                                                    if (act.max && v > act.max) v = act.max
                                                                    if (v < 0) v = 0
                                                                    updateEditBuffer(day, act.key, String(v))
                                                                }}
                                                                className="w-8 h-7 rounded-md text-center text-[11px] font-bold bg-slate-700/50 border border-slate-500/30 text-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                        </td>
                                                    )
                                                }
                                            }

                                            // ── Delete mode: clickable cells ──
                                            if (tableMode === 'delete') {
                                                const isSelected = selectedCells.has(cellKey)
                                                return (
                                                    <td key={dayIdx} className="px-0.5 py-1 text-center">
                                                        <button
                                                            onClick={() => {
                                                                if (val !== '') toggleCellSelection(day, act.key)
                                                            }}
                                                            className={`w-7 h-7 rounded-md text-[11px] font-bold transition-all mx-auto flex items-center justify-center ${isSelected
                                                                ? 'bg-red-500 text-white ring-2 ring-red-400 scale-110'
                                                                : val === ''
                                                                    ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                                                                    : (parseFloat(val) > 0 ? 'text-green-400' : 'text-red-400')
                                                                }`}
                                                            title={isSelected ? 'Batal pilih' : (val === '' ? 'Sel kosong' : 'Pilih untuk dihapus')}
                                                            disabled={val === ''}
                                                        >
                                                            {isSelected ? <X className="w-3 h-3" /> : (val === '' ? '—' : val)}
                                                        </button>
                                                    </td>
                                                )
                                            }

                                            // ── View mode: static display ──
                                            return (
                                                <td key={dayIdx} className="px-1 py-2 text-center">
                                                    {act.type === 'boolean'
                                                        ? <BooleanCell value={val} onClick={() => { }} day={day} />
                                                        : <NumberCell value={val} onClick={() => { }} day={day} />
                                                    }
                                                </td>
                                            )
                                        })}

                                        <td className="px-2 py-2 text-center sticky right-0 z-10 bg-inherit shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.2)] before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-gray-100 dark:before:bg-slate-700"><PercentBadge value={percentages[act.key]} /></td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-[#00529C] dark:border-[#15A4FA] bg-gray-50/80 dark:bg-slate-700/50">
                                    <td colSpan={2 + daysInMonth} className="px-3 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-200">Rerata</td>
                                    <td className="px-2 py-3 text-center sticky right-0 z-10 bg-inherit shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.2)] before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-gray-100 dark:before:bg-slate-700"><PercentBadge value={overallAvg} size="lg" /></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            <DeleteConfirmModal
                isOpen={showDeleteModal}
                count={selectedCells.size}
                label="sel ibadah"
                isDeleting={isBatchSaving}
                onConfirm={batchDeleteCells}
                onCancel={() => setShowDeleteModal(false)}
            />
        </div>
    )
}
