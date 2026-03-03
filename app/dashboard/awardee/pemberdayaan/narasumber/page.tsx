'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { getNarasumberEntries, addNarasumberEntry, updateNarasumberEntry } from './actions'
import type { NarasumberEntry } from './actions'
import toast from 'react-hot-toast'
import { Mic2, Plus, Loader2, CheckCircle2, Send, X, CalendarDays, FileText, Monitor, Users, Hash, Link2, RefreshCw, Pencil, Save, ChevronDown } from 'lucide-react'

const LIMIT_OPTIONS = [
    { value: 10, label: '10 terbaru' },
    { value: 30, label: '30 terbaru' },
    { value: 50, label: '50 terbaru' },
    { value: -1, label: 'Semua data' },
] as const

export default function NarasumberPage() {
    const [entries, setEntries] = useState<NarasumberEntry[]>([])
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [isFetching, startFetch] = useTransition()
    const [editingRow, setEditingRow] = useState<number | null>(null)
    const [editValues, setEditValues] = useState<Record<string, string>>({})
    const [isSavingEdit, setIsSavingEdit] = useState(false)
    const [displayLimit, setDisplayLimit] = useState<number>(10)

    const fetchEntries = useCallback(() => {
        startFetch(async () => {
            const r = await getNarasumberEntries()
            if (r.error) toast.error(r.error)
            else if (r.data) setEntries(r.data)
        })
    }, [])

    useEffect(() => { fetchEntries() }, [fetchEntries])

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true); setSubmitted(false)
        const r = await addNarasumberEntry(formData)
        setIsSubmitting(false)
        if (r.error) toast.error(r.error)
        else { toast.success(r.success!); setSubmitted(true); setIsFormOpen(false); fetchEntries(); setTimeout(() => setSubmitted(false), 3000) }
    }

    function startEdit(e: NarasumberEntry) {
        setEditingRow(e.rowIndex)
        setEditValues({ tanggal: e.tanggal, judulMateri: e.judulMateri, teknis: e.teknis, peserta: e.peserta, jumlah: e.jumlah, linkDokumentasi: e.linkDokumentasi })
    }

    async function saveEdit(rowIndex: number) {
        setIsSavingEdit(true)
        const fd = new FormData()
        fd.set('rowIndex', String(rowIndex)); fd.set('tanggal', editValues.tanggal || ''); fd.set('judulMateri', editValues.judulMateri || ''); fd.set('teknis', editValues.teknis || ''); fd.set('peserta', editValues.peserta || ''); fd.set('jumlah', editValues.jumlah || ''); fd.set('linkDokumentasi', editValues.linkDokumentasi || '')
        const r = await updateNarasumberEntry(fd)
        setIsSavingEdit(false)
        if (r.error) toast.error(r.error)
        else { toast.success(r.success!); setEditingRow(null); setEditValues({}); fetchEntries() }
    }

    const vis = displayLimit === -1 ? entries : entries.slice(-displayLimit)
    const inp = "w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-xs focus:ring-2 focus:ring-cyan-400/40 outline-none"

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-linear-to-br from-cyan-500 to-sky-400 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20"><Mic2 className="w-5 h-5" /></div>
                    <div><h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Narasumber Pemberdayaan</h1><p className="text-gray-500 dark:text-slate-400 text-xs">Kegiatan sebagai narasumber pembinaan</p></div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchEntries} disabled={isFetching} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50"><RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh</button>
                    <button onClick={() => setIsFormOpen(!isFormOpen)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-cyan-500 to-sky-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">{isFormOpen ? <><X className="w-4 h-4" />Tutup Form</> : <><Plus className="w-4 h-4" />Tambah Data</>}</button>
                </div>
            </div>

            {isFormOpen && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/80 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700"><h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2"><Plus className="w-4 h-4 text-cyan-500" /> Tambah Kegiatan Narasumber</h2></div>
                    <form action={handleSubmit} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div><label htmlFor="tanggal" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5"><CalendarDays className="w-3.5 h-3.5 text-cyan-500" /> Tanggal <span className="text-red-400">*</span></label><input type="text" id="tanggal" name="tanggal" placeholder="DD/MM/YYYY" required className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-400/40 outline-none" /></div>
                            <div><label htmlFor="judulMateri" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5"><FileText className="w-3.5 h-3.5 text-cyan-500" /> Judul Materi <span className="text-red-400">*</span></label><input type="text" id="judulMateri" name="judulMateri" placeholder="Contoh: Tips Menulis Esai" required className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-400/40 outline-none" /></div>
                            <div><label htmlFor="teknis" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5"><Monitor className="w-3.5 h-3.5 text-cyan-500" /> Teknis</label><input type="text" id="teknis" name="teknis" placeholder="Online / Offline" className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-400/40 outline-none" /></div>
                            <div><label htmlFor="peserta" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5"><Users className="w-3.5 h-3.5 text-cyan-500" /> Peserta</label><input type="text" id="peserta" name="peserta" placeholder="Target peserta" className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-400/40 outline-none" /></div>
                            <div><label htmlFor="jumlah" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5"><Hash className="w-3.5 h-3.5 text-cyan-500" /> Jumlah</label><input type="text" id="jumlah" name="jumlah" placeholder="Jumlah peserta" className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-400/40 outline-none" /></div>
                            <div><label htmlFor="linkDokumentasi" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5"><Link2 className="w-3.5 h-3.5 text-cyan-500" /> Link Dokumentasi</label><input type="text" id="linkDokumentasi" name="linkDokumentasi" placeholder="https://drive.google.com/..." className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-400/40 outline-none" /></div>
                        </div>
                        <div className="pt-5 mt-5 border-t border-gray-100 dark:border-slate-700 flex items-center gap-3">
                            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-cyan-500 to-sky-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">{isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</> : submitted ? <><CheckCircle2 className="w-4 h-4" />Tersimpan!</> : <><Send className="w-4 h-4" />Kirim Data</>}</button>
                            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-gray-700 transition-colors">Batal</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/80 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
                    <h2 className="text-sm font-bold text-gray-800 dark:text-white">Riwayat Narasumber</h2>
                    <div className="flex items-center gap-3">
                        <div className="relative"><select value={displayLimit} onChange={(e) => setDisplayLimit(parseInt(e.target.value))} className="appearance-none pl-3 pr-7 py-1.5 text-[11px] font-bold bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200 cursor-pointer">{LIMIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" /></div>
                        <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">{isFetching ? '...' : `${vis.length} / ${entries.length} entri`}</span>
                    </div>
                </div>
                {isFetching && entries.length === 0 ? <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-cyan-500 animate-spin" /><span className="ml-2 text-sm text-gray-500 dark:text-slate-400">Memuat data...</span></div> : entries.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center px-6"><div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-3"><Mic2 className="w-5 h-5 text-gray-400" /></div><p className="text-sm font-semibold text-gray-500 dark:text-slate-400">Belum ada data</p></div> : (
                    <div className="overflow-x-auto"><table className="w-full text-left table-fixed">
                        <colgroup><col className="w-[35px]" /><col className="w-[85px]" /><col /><col className="w-[80px]" /><col className="w-[80px]" /><col className="w-[60px]" /><col className="w-[90px]" /><col className="w-[45px]" /></colgroup>
                        <thead><tr className="border-b border-gray-100 dark:border-slate-700"><th className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">No</th><th className="px-2 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Tanggal</th><th className="px-2 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Judul Materi</th><th className="px-2 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Teknis</th><th className="px-2 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Peserta</th><th className="px-2 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Jml</th><th className="px-2 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Link</th><th className="px-2 py-3"></th></tr></thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">{vis.map((entry, idx) => {
                            const isE = editingRow === entry.rowIndex; const di = displayLimit === -1 ? idx + 1 : entries.length - vis.length + idx + 1; return (
                                <tr key={entry.rowIndex} className={`transition-colors ${isE ? 'bg-cyan-50/50 dark:bg-cyan-900/10' : 'hover:bg-gray-50/50 dark:hover:bg-slate-700/30'}`}>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-400 dark:text-slate-500">{di}</td>
                                    <td className="px-2 py-2.5 text-xs">{isE ? <input type="text" value={editValues.tanggal} onChange={ev => setEditValues({ ...editValues, tanggal: ev.target.value })} className={inp} /> : <span className="font-medium text-gray-700 dark:text-slate-300">{entry.tanggal}</span>}</td>
                                    <td className="px-2 py-2.5 text-xs">{isE ? <input type="text" value={editValues.judulMateri} onChange={ev => setEditValues({ ...editValues, judulMateri: ev.target.value })} className={inp} /> : <span className="font-semibold text-gray-800 dark:text-slate-200 truncate block">{entry.judulMateri}</span>}</td>
                                    <td className="px-2 py-2.5 text-xs">{isE ? <input type="text" value={editValues.teknis} onChange={ev => setEditValues({ ...editValues, teknis: ev.target.value })} className={inp} /> : <span className="text-gray-600 dark:text-slate-400">{entry.teknis}</span>}</td>
                                    <td className="px-2 py-2.5 text-xs">{isE ? <input type="text" value={editValues.peserta} onChange={ev => setEditValues({ ...editValues, peserta: ev.target.value })} className={inp} /> : <span className="text-gray-600 dark:text-slate-400">{entry.peserta}</span>}</td>
                                    <td className="px-2 py-2.5 text-xs">{isE ? <input type="text" value={editValues.jumlah} onChange={ev => setEditValues({ ...editValues, jumlah: ev.target.value })} className={inp} /> : <span className="text-gray-600 dark:text-slate-400">{entry.jumlah}</span>}</td>
                                    <td className="px-2 py-2.5 text-xs">{isE ? <input type="text" value={editValues.linkDokumentasi} onChange={ev => setEditValues({ ...editValues, linkDokumentasi: ev.target.value })} className={inp} /> : entry.linkDokumentasi ? <a href={entry.linkDokumentasi} target="_blank" rel="noopener noreferrer" className="text-[#15A4FA] hover:underline truncate block">Lihat</a> : <span className="text-gray-300 dark:text-slate-600">—</span>}</td>
                                    <td className="px-2 py-2.5 text-xs">{isE ? <div className="flex items-center gap-1"><button onClick={() => saveEdit(entry.rowIndex)} disabled={isSavingEdit} className="p-1.5 rounded-lg text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50" title="Simpan">{isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}</button><button onClick={() => { setEditingRow(null); setEditValues({}) }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700" title="Batal"><X className="w-3.5 h-3.5" /></button></div> : <button onClick={() => startEdit(entry)} className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>}</td>
                                </tr>)
                        })}</tbody>
                    </table></div>
                )}
            </div>
        </div>
    )
}
