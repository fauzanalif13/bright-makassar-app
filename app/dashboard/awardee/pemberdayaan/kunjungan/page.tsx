'use client'
import { useState, useEffect, useTransition, useCallback, useMemo } from 'react'
import { getKunjunganEntries, addKunjunganEntry, updateKunjunganEntry, deleteKunjunganEntries } from './actions'
import type { KunjunganEntry } from './actions'
import DeleteConfirmModal from '@/src/components/DeleteConfirmModal'
import toast from 'react-hot-toast'
import { MapPin, Plus, Loader2, CheckCircle2, Send, X, CalendarDays, Building2, FileText, Link2, ExternalLink, RefreshCw, Pencil, Save, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown, Trash2, CheckSquare, Square, Hash } from 'lucide-react'

type SortKey = 'no' | 'semester' | 'tanggal' | 'lokasi' | 'daftarKunjungan' | 'linkLaporan'
type SortDir = 'asc' | 'desc'
type SortState = { key: SortKey; dir: SortDir } | null
const LIMIT_OPTIONS = [{ value: 10, label: '10 terbaru' }, { value: 30, label: '30 terbaru' }, { value: -1, label: 'Semua data' }] as const

export default function KunjunganPage() {
    const [entries, setEntries] = useState<KunjunganEntry[]>([])
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

    const fetchEntries = useCallback((forceRefresh?: boolean) => { startFetch(async () => { const r = await getKunjunganEntries(forceRefresh === true); if (r.error) toast.error(r.error); else if (r.data) setEntries(r.data) }) }, [])
    useEffect(() => { fetchEntries() }, [fetchEntries])

    function toggleSort(key: SortKey) { setSort(prev => { if (prev?.key === key) { if (prev.dir === 'asc') return { key, dir: 'desc' }; return null } return { key, dir: 'asc' } }) }
    function getSortIcon(key: SortKey) { if (sort?.key !== key) return <ArrowUpDown className="w-3 h-3 opacity-40" />; if (sort.dir === 'asc') return <ArrowUp className="w-3 h-3 text-teal-500" />; return <ArrowDown className="w-3 h-3 text-teal-500" /> }
    const sortedEntries = useMemo(() => {
        if (!sort) return entries
        return [...entries].sort((a, b) => {
            let av: string | number, bv: string | number
            if (sort.key === 'no') { av = a.rowIndex; bv = b.rowIndex } else { av = a[sort.key].toLowerCase(); bv = b[sort.key].toLowerCase() }
            if (av < bv) return sort.dir === 'asc' ? -1 : 1; if (av > bv) return sort.dir === 'asc' ? 1 : -1; return 0
        })
    }, [entries, sort])
    const visibleEntries = displayLimit === -1 ? sortedEntries : sortedEntries.slice(-displayLimit)

    async function handleSubmit(fd: FormData) { setIsSubmitting(true); setSubmitted(false); const r = await addKunjunganEntry(fd); if (r.error) { setIsSubmitting(false); toast.error(r.error) } else { if (r.newEntry) setEntries(prev => [...prev, r.newEntry!]); else fetchEntries(); setIsSubmitting(false); setSubmitted(true); setIsFormOpen(false); toast.success(r.success!); setTimeout(() => setSubmitted(false), 3000) } }
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; rowIndices: number[] }>({ isOpen: false, rowIndices: [] })
    function requestDelete(rowIndices: number[]) { setDeleteModal({ isOpen: true, rowIndices }) }
    async function handleDelete(ri: number[]) { setDeleteModal({ isOpen: false, rowIndices: [] }); setIsDeleting(true); setEntries(prev => prev.filter(e => !ri.includes(e.rowIndex))); setSelectedRows(new Set()); const r = await deleteKunjunganEntries(ri); setIsDeleting(false); if (r.error) { toast.error(r.error); fetchEntries(true) } else toast.success(r.success!) }
    function toggleSelectAll() { if (selectedRows.size === visibleEntries.length) setSelectedRows(new Set()); else setSelectedRows(new Set(visibleEntries.map(e => e.rowIndex))) }
    function toggleSelect(ri: number) { const s = new Set(selectedRows); if (s.has(ri)) s.delete(ri); else s.add(ri); setSelectedRows(s) }
    function startEdit(e: KunjunganEntry) { setEditingRow(e.rowIndex); setEditValues({ semester: e.semester, tanggal: e.tanggal, lokasi: e.lokasi, daftarKunjungan: e.daftarKunjungan, linkLaporan: e.linkLaporan }) }
    async function saveEdit(ri: number) { setIsSavingEdit(true); setEntries(prev => prev.map(e => e.rowIndex === ri ? { ...e, ...editValues } as KunjunganEntry : e)); setEditingRow(null); const fd = new FormData(); fd.set('rowIndex', String(ri)); Object.entries(editValues).forEach(([k, v]) => fd.set(k, v)); const r = await updateKunjunganEntry(fd); setIsSavingEdit(false); setEditValues({}); if (r.error) { toast.error(r.error); fetchEntries(true) } else toast.success(r.success!) }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-linear-to-br from-teal-500 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-teal-500/20"><MapPin className="w-5 h-5" /></div>
                    <div><h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Kunjungan Program</h1><p className="text-gray-500 dark:text-slate-400 text-xs">Kunjungan ke titik program YBM BRILiaN</p></div>
                </div>
                <div className="flex items-center gap-2">
                    {selectedRows.size > 0 && <button onClick={() => requestDelete(Array.from(selectedRows))} disabled={isDeleting} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-red-500 rounded-lg shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-50">{isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Hapus ({selectedRows.size})</button>}
                    <button onClick={() => fetchEntries(true)} disabled={isFetching} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50"><RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh</button>
                    <button onClick={() => setIsFormOpen(!isFormOpen)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-teal-500 to-cyan-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">{isFormOpen ? <><X className="w-4 h-4" />Tutup Form</> : <><Plus className="w-4 h-4" />Tambah Data</>}</button>
                </div>
            </div>
            {isFormOpen && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/80 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700"><h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2"><Plus className="w-4 h-4 text-teal-500" /> Tambah Kunjungan Baru</h2></div>
                    <form action={handleSubmit} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <div><label htmlFor="semester" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5"><Hash className="w-3.5 h-3.5 text-teal-500" /> Semester</label><input type="text" id="semester" name="semester" placeholder="1-8" className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 focus:ring-2 focus:ring-teal-400/40 outline-none transition-all" /></div>
                            <div><label htmlFor="tanggal" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5"><CalendarDays className="w-3.5 h-3.5 text-teal-500" /> Tanggal <span className="text-red-400">*</span></label><input type="date" id="tanggal" name="tanggal" required className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-400/40 outline-none transition-all" /></div>
                            <div><label htmlFor="lokasi" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5"><Building2 className="w-3.5 h-3.5 text-teal-500" /> Lokasi</label><input type="text" id="lokasi" name="lokasi" placeholder="Kota/Desa" className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 focus:ring-2 focus:ring-teal-400/40 outline-none transition-all" /></div>
                            <div className="md:col-span-2"><label htmlFor="daftarKunjungan" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5"><FileText className="w-3.5 h-3.5 text-teal-500" /> Daftar Kunjungan <span className="text-red-400">*</span></label><input type="text" id="daftarKunjungan" name="daftarKunjungan" placeholder="Kunjungan ke UMKM Binaan" required className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 focus:ring-2 focus:ring-teal-400/40 outline-none transition-all" /></div>
                            <div><label htmlFor="linkLaporan" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5"><Link2 className="w-3.5 h-3.5 text-teal-500" /> Link Laporan</label><input type="url" id="linkLaporan" name="linkLaporan" placeholder="https://drive.google.com/..." className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 focus:ring-2 focus:ring-teal-400/40 outline-none transition-all" /></div>
                        </div>
                        <div className="pt-5 mt-5 border-t border-gray-100 dark:border-slate-700 flex items-center gap-3">
                            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-teal-500 to-cyan-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed">{isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</> : submitted ? <><CheckCircle2 className="w-4 h-4" />Tersimpan!</> : <><Send className="w-4 h-4" />Kirim Data</>}</button>
                            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors">Batal</button>
                        </div>
                    </form>
                </div>
            )}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/80 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
                    <h2 className="text-sm font-bold text-gray-800 dark:text-white">Riwayat Kunjungan</h2>
                    <div className="flex items-center gap-3"><div className="relative"><select value={displayLimit} onChange={e => setDisplayLimit(parseInt(e.target.value))} className="appearance-none pl-3 pr-7 py-1.5 text-[11px] font-bold bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200 cursor-pointer">{LIMIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" /></div><span className="text-[11px] font-bold text-gray-400 bg-gray-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">{isFetching ? '...' : `${visibleEntries.length} / ${entries.length} entri`}</span></div>
                </div>
                {isFetching && !entries.length ? <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-teal-500 animate-spin" /><span className="ml-2 text-sm text-gray-500">Memuat data...</span></div> : !entries.length ? <div className="flex flex-col items-center justify-center py-16 text-center px-6"><div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-3"><MapPin className="w-5 h-5 text-gray-400" /></div><p className="text-sm font-semibold text-gray-500">Belum ada data kunjungan</p></div> : (
                    <div className="overflow-x-auto"><table className="w-full text-left table-fixed">
                        <colgroup><col className="w-[36px]" /><col className="w-[40px]" /><col className="w-[50px]" /><col className="w-[90px]" /><col className="w-[100px]" /><col /><col className="w-[70px]" /><col className="w-[80px]" /></colgroup>
                        <thead><tr className="border-b border-gray-100 dark:border-slate-700">
                            <th className="px-3 py-3 text-center"><button onClick={toggleSelectAll} className="text-gray-400 hover:text-teal-500 transition-colors">{visibleEntries.length > 0 && selectedRows.size === visibleEntries.length ? <CheckSquare className="w-4 h-4 text-teal-500" /> : <Square className="w-4 h-4" />}</button></th>
                            <SH label="No" k="no" sort={sort} toggle={toggleSort} icon={getSortIcon} narrow />
                            <SH label="Sem" k="semester" sort={sort} toggle={toggleSort} icon={getSortIcon} />
                            <SH label="Tanggal" k="tanggal" sort={sort} toggle={toggleSort} icon={getSortIcon} />
                            <SH label="Lokasi" k="lokasi" sort={sort} toggle={toggleSort} icon={getSortIcon} />
                            <SH label="Daftar Kunjungan" k="daftarKunjungan" sort={sort} toggle={toggleSort} icon={getSortIcon} />
                            <SH label="Link" k="linkLaporan" sort={sort} toggle={toggleSort} icon={getSortIcon} />
                            <th className="px-3 py-3"></th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">{visibleEntries.map(entry => { const ed = editingRow === entry.rowIndex; const sel = selectedRows.has(entry.rowIndex); const pos = entries.indexOf(entry)+1; return (
                            <tr key={entry.rowIndex} className={`transition-colors ${ed||sel ? 'bg-teal-50/50 dark:bg-teal-900/10' : 'hover:bg-gray-50/50 dark:hover:bg-slate-700/30'}`}>
                                <td className="px-3 py-2.5 text-center"><button onClick={() => toggleSelect(entry.rowIndex)} className="text-gray-400 hover:text-teal-500 transition-colors">{sel ? <CheckSquare className="w-4 h-4 text-teal-500" /> : <Square className="w-4 h-4" />}</button></td>
                                <td className="px-4 py-2.5 text-xs font-bold text-gray-400">{pos}</td>
                                <td className="px-3 py-2.5 text-xs">{ed ? <input type="text" value={editValues.semester} onChange={e => setEditValues({...editValues, semester: e.target.value})} className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-xs focus:ring-2 focus:ring-teal-400/40 outline-none" /> : <span className="font-bold text-teal-600 dark:text-teal-400">{entry.semester}</span>}</td>
                                <td className="px-3 py-2.5 text-xs">{ed ? <input type="text" value={editValues.tanggal} onChange={e => setEditValues({...editValues, tanggal: e.target.value})} className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-xs focus:ring-2 focus:ring-teal-400/40 outline-none" /> : <span className="font-medium text-gray-700 dark:text-slate-300">{entry.tanggal}</span>}</td>
                                <td className="px-3 py-2.5 text-xs">{ed ? <input type="text" value={editValues.lokasi} onChange={e => setEditValues({...editValues, lokasi: e.target.value})} className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-xs focus:ring-2 focus:ring-teal-400/40 outline-none" /> : <span className="text-gray-600 dark:text-slate-300">{entry.lokasi}</span>}</td>
                                <td className="px-3 py-2.5 text-xs">{ed ? <input type="text" value={editValues.daftarKunjungan} onChange={e => setEditValues({...editValues, daftarKunjungan: e.target.value})} className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-xs focus:ring-2 focus:ring-teal-400/40 outline-none" /> : <span className="font-semibold text-gray-800 dark:text-slate-200 truncate block">{entry.daftarKunjungan}</span>}</td>
                                <td className="px-3 py-2.5 text-xs">{ed ? <input type="text" value={editValues.linkLaporan} onChange={e => setEditValues({...editValues, linkLaporan: e.target.value})} className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-xs focus:ring-2 focus:ring-teal-400/40 outline-none" /> : entry.linkLaporan ? <a href={entry.linkLaporan} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-teal-500 hover:text-teal-700 font-semibold transition-colors"><ExternalLink className="w-3 h-3" />Lihat</a> : <span className="text-gray-300 dark:text-slate-600">—</span>}</td>
                                <td className="px-3 py-2.5 text-xs">{ed ? <div className="flex items-center gap-1"><button onClick={() => saveEdit(entry.rowIndex)} disabled={isSavingEdit} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50">{isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}</button><button onClick={() => { setEditingRow(null); setEditValues({}) }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"><X className="w-3.5 h-3.5" /></button></div> : <div className="flex items-center gap-1"><button onClick={() => startEdit(entry)} className="p-1.5 rounded-lg text-gray-400 hover:text-teal-500 hover:bg-teal-50 transition-colors"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => requestDelete([entry.rowIndex])} disabled={isDeleting} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button></div>}</td>
                            </tr>
                        ) })}</tbody>
                    </table></div>
                )}
            </div>
            <DeleteConfirmModal isOpen={deleteModal.isOpen} count={deleteModal.rowIndices.length} label="data kunjungan" isDeleting={isDeleting} onConfirm={() => handleDelete(deleteModal.rowIndices)} onCancel={() => setDeleteModal({ isOpen: false, rowIndices: [] })} />
        </div>
    )
}
function SH({ label, k, sort, toggle, icon, narrow }: { label: string; k: SortKey; sort: SortState; toggle: (k: SortKey) => void; icon: (k: SortKey) => React.ReactNode; narrow?: boolean }) { const a = sort?.key === k; return <th className={narrow ? 'px-4 py-3' : 'px-3 py-3'}><button onClick={() => toggle(k)} className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${a ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}>{label}{icon(k)}</button></th> }
