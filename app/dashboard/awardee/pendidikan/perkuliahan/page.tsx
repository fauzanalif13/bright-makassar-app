'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { getPerkuliahanData, updateToeflData, updateIpIpkData } from './actions'
import type { PerkuliahanData } from './actions'
import toast from 'react-hot-toast'
import {
    GraduationCap,
    Loader2,
    Save,
    RefreshCw,
    Pencil,
    X,
    Globe,
    BookOpen,
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────

const SEMESTER_LABELS = ['Smt 1', 'Smt 2', 'Smt 3', 'Smt 4', 'Smt 5', 'Smt 6', 'Smt 7', 'Smt 8'] as const

// ─── Component ───────────────────────────────────────────────────────

export default function PerkuliahanPage() {
    const [data, setData] = useState<PerkuliahanData | null>(null)
    const [isFetching, startFetch] = useTransition()

    // TOEFL edit state
    const [editingToefl, setEditingToefl] = useState(false)
    const [toeflValues, setToeflValues] = useState({ predictionTest: '', toeflItp: '' })
    const [isSavingToefl, setIsSavingToefl] = useState(false)

    // IP/IPK edit state
    const [editingIp, setEditingIp] = useState(false)
    const [ipValues, setIpValues] = useState<string[]>(Array(8).fill(''))
    const [ipkValue, setIpkValue] = useState('')
    const [isSavingIp, setIsSavingIp] = useState(false)

    const fetchData = useCallback(() => {
        startFetch(async () => {
            const result = await getPerkuliahanData()
            if (result.error) {
                toast.error(result.error)
            } else if (result.data) {
                setData(result.data)
                setToeflValues({
                    predictionTest: result.data.toefl.predictionTest,
                    toeflItp: result.data.toefl.toeflItp,
                })
                setIpValues([...result.data.ipIpk.semesters])
                setIpkValue(result.data.ipIpk.ipk)
            }
        })
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // ── TOEFL handlers ──────────────────────────────────────────────

    function startEditToefl() {
        if (data) {
            setToeflValues({
                predictionTest: data.toefl.predictionTest,
                toeflItp: data.toefl.toeflItp,
            })
        }
        setEditingToefl(true)
    }

    async function saveToefl() {
        setIsSavingToefl(true)
        const fd = new FormData()
        fd.set('predictionTest', toeflValues.predictionTest)
        fd.set('toeflItp', toeflValues.toeflItp)
        const result = await updateToeflData(fd)
        setIsSavingToefl(false)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(result.success!)
            setEditingToefl(false)
            fetchData()
        }
    }

    // ── IP/IPK handlers ─────────────────────────────────────────────

    function startEditIp() {
        if (data) {
            setIpValues([...data.ipIpk.semesters])
            setIpkValue(data.ipIpk.ipk)
        }
        setEditingIp(true)
    }

    /** Normalize: replace comma with dot on blur */
    function normalizeIpValue(idx: number) {
        setIpValues(prev => {
            const copy = [...prev]
            copy[idx] = copy[idx].replace(',', '.')
            return copy
        })
    }

    /** Compute IPK as average of all non-empty semester IP values */
    function computeIpk(values: string[]): string {
        const nums = values
            .map(v => parseFloat(v.replace(',', '.')))
            .filter(n => !isNaN(n) && n > 0)
        if (nums.length === 0) return ''
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length
        return avg.toFixed(2)
    }

    const computedIpk = editingIp ? computeIpk(ipValues) : computeIpk(data?.ipIpk.semesters || [])

    async function saveIpIpk() {
        setIsSavingIp(true)
        const fd = new FormData()
        for (let i = 0; i < 8; i++) {
            fd.set(`smt${i + 1}`, ipValues[i].replace(',', '.'))
        }
        fd.set('ipk', computedIpk)
        const result = await updateIpIpkData(fd)
        setIsSavingIp(false)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(result.success!)
            setEditingIp(false)
            fetchData()
        }
    }

    const isLoading = isFetching && !data

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
                            Perkuliahan
                        </h1>
                        <p className="text-gray-500 dark:text-slate-400 text-xs">
                            Data TOEFL &amp; Indeks Prestasi Semester
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    disabled={isFetching}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 text-[#15A4FA] animate-spin" />
                    <span className="ml-2 text-sm text-gray-500 dark:text-slate-400">Memuat data...</span>
                </div>
            ) : (
                <>
                    {/* ── TOEFL Card ─────────────────────────────────── */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50/80 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-[#15A4FA]" />
                                <h2 className="text-sm font-bold text-gray-800 dark:text-white">
                                    Kemampuan Bahasa Inggris
                                </h2>
                            </div>
                            {!editingToefl ? (
                                <button
                                    onClick={startEditToefl}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-[#15A4FA] hover:bg-blue-50 dark:hover:bg-[#00529C]/20 rounded-lg transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Edit
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={saveToefl}
                                        disabled={isSavingToefl}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {isSavingToefl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        Simpan
                                    </button>
                                    <button
                                        onClick={() => setEditingToefl(false)}
                                        className="p-1.5 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Prediction Test */}
                                <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-4">
                                    <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                        Prediction Test
                                    </label>
                                    {editingToefl ? (
                                        <input
                                            type="text"
                                            value={toeflValues.predictionTest}
                                            onChange={(e) => setToeflValues({ ...toeflValues, predictionTest: e.target.value })}
                                            className="mt-2 w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-lg font-bold text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none"
                                            placeholder="387"
                                        />
                                    ) : (
                                        <p className="mt-2 text-2xl font-black text-[#00529C] dark:text-[#60b5ff]">
                                            {data?.toefl.predictionTest || <span className="text-gray-300 dark:text-slate-600 text-lg">—</span>}
                                        </p>
                                    )}
                                </div>

                                {/* TOEFL ITP */}
                                <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-4">
                                    <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                        TOEFL ITP
                                    </label>
                                    <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                                        di tes pada semester terakhir
                                    </p>
                                    {editingToefl ? (
                                        <input
                                            type="text"
                                            value={toeflValues.toeflItp}
                                            onChange={(e) => setToeflValues({ ...toeflValues, toeflItp: e.target.value })}
                                            className="mt-2 w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-lg font-bold text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none"
                                            placeholder="450"
                                        />
                                    ) : (
                                        <p className="mt-2 text-2xl font-black text-[#00529C] dark:text-[#60b5ff]">
                                            {data?.toefl.toeflItp || <span className="text-gray-300 dark:text-slate-600 text-lg">—</span>}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── IP/IPK Card ────────────────────────────────── */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50/80 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-[#15A4FA]" />
                                <h2 className="text-sm font-bold text-gray-800 dark:text-white">
                                    Indeks Prestasi (IP / IPK)
                                </h2>
                            </div>
                            {!editingIp ? (
                                <button
                                    onClick={startEditIp}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-[#15A4FA] hover:bg-blue-50 dark:hover:bg-[#00529C]/20 rounded-lg transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Edit
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={saveIpIpk}
                                        disabled={isSavingIp}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {isSavingIp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        Simpan
                                    </button>
                                    <button
                                        onClick={() => setEditingIp(false)}
                                        className="p-1.5 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-center">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-slate-700">
                                            {SEMESTER_LABELS.map((label) => (
                                                <th key={label} className="px-2 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                                    {label}
                                                </th>
                                            ))}
                                            <th className="px-2 py-3 text-[11px] font-bold text-[#00529C] dark:text-[#60b5ff] uppercase tracking-wider border-l border-gray-200 dark:border-slate-600">
                                                IPK
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            {SEMESTER_LABELS.map((_, idx) => (
                                                <td key={idx} className="px-2 py-4">
                                                    {editingIp ? (
                                                        <input
                                                            type="text"
                                                            value={ipValues[idx]}
                                                            onChange={(e) => {
                                                                const copy = [...ipValues]
                                                                copy[idx] = e.target.value
                                                                setIpValues(copy)
                                                            }}
                                                            onBlur={() => normalizeIpValue(idx)}
                                                            className="w-full min-w-[60px] px-2 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-center text-sm font-bold text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none"
                                                            placeholder="0.00"
                                                        />
                                                    ) : (
                                                        <span className={`text-lg font-bold ${data?.ipIpk.semesters[idx]
                                                            ? 'text-gray-800 dark:text-slate-200'
                                                            : 'text-gray-300 dark:text-slate-600'
                                                            }`}>
                                                            {data?.ipIpk.semesters[idx] || '—'}
                                                        </span>
                                                    )}
                                                </td>
                                            ))}
                                            <td className="px-2 py-4 border-l border-gray-200 dark:border-slate-600">
                                                <span className={`text-lg font-black ${computedIpk
                                                    ? 'text-[#00529C] dark:text-[#60b5ff]'
                                                    : 'text-gray-300 dark:text-slate-600'
                                                    }`}>
                                                    {computedIpk || '—'}
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <p className="mt-3 text-[10px] text-gray-400 dark:text-slate-500 text-center">
                                Gunakan titik (.) atau koma (,) sebagai pemisah desimal — otomatis dikonversi ke titik.
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
