'use client'

import { useState, useEffect, useTransition } from 'react'
import { getJadwalPembinaan, createJadwal, updateJadwal, deleteJadwal } from '@/app/dashboard/fasilitator/actions'
import DeleteConfirmModal from '@/src/components/DeleteConfirmModal'
import toast from 'react-hot-toast'
import { CalendarDays, Plus, Loader2, Send, X, MapPin, UserCheck, CheckCircle, Clock, RefreshCw, Pencil, Save, Trash2, CalendarCheck } from 'lucide-react'

type JadwalPembinaan = {
    id: string
    judul_materi: string
    tanggal_waktu: string
    lokasi_atau_link: string
    narasumber: string
    status: string
    angkatan: string
    author?: { name: string } | null
}

const STATUS_OPTIONS = ['Akan Datang', 'Selesai'] as const
const ANGKATAN_OPTIONS = ['Semua Angkatan', '2022', '2023', '2024', '2025', '2026'] as const

export default function JadwalPembinaanPage() {
    const [entries, setEntries] = useState<JadwalPembinaan[]>([])
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isFetching, startFetch] = useTransition()
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValues, setEditValues] = useState<Partial<JadwalPembinaan>>({})
    const [isSavingEdit, setIsSavingEdit] = useState(false)
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null })
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchEntries = () => {
        startFetch(async () => {
            try {
                const data = await getJadwalPembinaan()
                setEntries(data as JadwalPembinaan[])
            } catch (err: any) {
                toast.error(err.message || 'Gagal memuat data jadwal')
            }
        })
    }

    useEffect(() => {
        fetchEntries()
    }, [])

    async function handleSubmit(fd: FormData) {
        setIsSubmitting(true)
        try {
            await createJadwal(fd)
            toast.success('Jadwal berhasil ditambahkan!')
            setIsFormOpen(false)
            fetchEntries()
        } catch (err: any) {
            toast.error(err.message || 'Gagal menambahkan jadwal')
        } finally {
            setIsSubmitting(false)
        }
    }

    async function saveEdit(id: string) {
        setIsSavingEdit(true)
        try {
            const fd = new FormData()
            fd.set('judul_materi', editValues.judul_materi || '')
            fd.set('tanggal_waktu', editValues.tanggal_waktu || '')
            fd.set('lokasi_atau_link', editValues.lokasi_atau_link || '')
            fd.set('narasumber', editValues.narasumber || '')
            fd.set('status', editValues.status || '')
            fd.set('angkatan', editValues.angkatan || 'Semua Angkatan')

            await updateJadwal(id, fd)
            toast.success('Jadwal berhasil diperbarui!')
            setEditingId(null)
            setEditValues({})
            fetchEntries()
        } catch (err: any) {
            toast.error(err.message || 'Gagal memperbarui jadwal')
        } finally {
            setIsSavingEdit(false)
        }
    }

    async function handleDelete(id: string) {
        setIsDeleting(true)
        try {
            await deleteJadwal(id)
            toast.success('Jadwal berhasil dihapus!')
            setDeleteModal({ isOpen: false, id: null })
            fetchEntries()
        } catch (err: any) {
            toast.error(err.message || 'Gagal menghapus jadwal')
        } finally {
            setIsDeleting(false)
        }
    }

    function startEdit(e: JadwalPembinaan) {
        setEditingId(e.id)
        setEditValues({
            judul_materi: e.judul_materi,
            tanggal_waktu: new Date(e.tanggal_waktu).toISOString().slice(0, 16),
            lokasi_atau_link: e.lokasi_atau_link,
            narasumber: e.narasumber,
            status: e.status,
            angkatan: e.angkatan
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00529C] to-[#15A4FA] text-white flex items-center justify-center shadow-lg shadow-[#00529C]/20">
                        <CalendarCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Jadwal Pembinaan</h1>
                        <p className="text-gray-500 dark:text-slate-400 text-xs">Kelola jadwal pembinaan bulanan Awardee</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchEntries} disabled={isFetching} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50">
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                    <button onClick={() => setIsFormOpen(!isFormOpen)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#00529C] to-[#15A4FA] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#00529C]/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                        {isFormOpen ? <><X className="w-4 h-4" />Tutup Form</> : <><Plus className="w-4 h-4" />Tambah Jadwal</>}
                    </button>
                </div>
            </div>

            {isFormOpen && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/80 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                        <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Plus className="w-4 h-4 text-[#00529C] dark:text-[#60b5ff]" /> Tambah Jadwal Baru
                        </h2>
                    </div>
                    <form action={handleSubmit} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label htmlFor="judul_materi" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5">
                                    Judul Materi <span className="text-red-400">*</span>
                                </label>
                                <input type="text" id="judul_materi" name="judul_materi" placeholder="Contoh: Pembinaan Menulis Essai" required className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none transition-all" />
                            </div>
                            <div>
                                <label htmlFor="tanggal_waktu" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5">
                                    <Clock className="w-3.5 h-3.5 text-[#00529C] dark:text-[#60b5ff]" /> Waktu Pelaksanaan <span className="text-red-400">*</span>
                                </label>
                                <input type="datetime-local" id="tanggal_waktu" name="tanggal_waktu" required className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none transition-all" />
                            </div>
                            <div>
                                <label htmlFor="narasumber" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5">
                                    <UserCheck className="w-3.5 h-3.5 text-[#00529C] dark:text-[#60b5ff]" /> Narasumber / Pemateri <span className="text-red-400">*</span>
                                </label>
                                <input type="text" id="narasumber" name="narasumber" placeholder="Nama Narasumber" required className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none transition-all" />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="lokasi_atau_link" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-[#00529C] dark:text-[#60b5ff]" /> Lokasi / Link Meeting <span className="text-red-400">*</span>
                                </label>
                                <input type="text" id="lokasi_atau_link" name="lokasi_atau_link" placeholder="Zoom Link atau Alamat Lengkap" required className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none transition-all" />
                            </div>
                            <div>
                                <label htmlFor="angkatan" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5">
                                    <UserCheck className="w-3.5 h-3.5 text-[#00529C] dark:text-[#60b5ff]" /> Target Angkatan <span className="text-red-400">*</span>
                                </label>
                                <select id="angkatan" name="angkatan" required className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none transition-all">
                                    {ANGKATAN_OPTIONS.map(o => <option key={o} value={o}>{o === 'Semua Angkatan' ? o : `BS ${parseInt(o) - 2014} (${o})`}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="status" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-200 mb-1.5">
                                    <CheckCircle className="w-3.5 h-3.5 text-[#00529C] dark:text-[#60b5ff]" /> Status <span className="text-red-400">*</span>
                                </label>
                                <select id="status" name="status" required className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#15A4FA]/40 outline-none transition-all">
                                    {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="pt-5 mt-5 border-t border-gray-100 dark:border-slate-700 flex items-center gap-3">
                            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00529C] to-[#15A4FA] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#00529C]/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</> : <><Send className="w-4 h-4" />Simpan Jadwal</>}
                            </button>
                            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors">Batal</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/80 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                    <h2 className="text-sm font-bold text-gray-800 dark:text-white">Daftar Jadwal Pembinaan</h2>
                </div>
                {isFetching && !entries.length ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 text-[#15A4FA] animate-spin" />
                        <span className="ml-2 text-sm text-gray-500">Memuat data...</span>
                    </div>
                ) : !entries.length ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                            <CalendarDays className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-sm font-semibold text-gray-500">Belum ada jadwal pembinaan</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-slate-700/60 flex flex-col">
                        {entries.map((entry) => {
                            const isEditing = editingId === entry.id;
                            const isPast = entry.status === 'Selesai' || new Date(entry.tanggal_waktu).getTime() < Date.now();
                            const displayStatus = isPast ? 'Selesai' : entry.status;
                            return (
                                <div key={entry.id} className={`p-5 transition-colors ${isEditing ? 'bg-blue-50/50 dark:bg-[#00529C]/10' : 'hover:bg-gray-50/50 dark:hover:bg-slate-700/30'} ${isPast ? 'opacity-70' : ''}`}>
                                    {isEditing ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2">
                                                    <input type="text" value={editValues.judul_materi} onChange={e => setEditValues({ ...editValues, judul_materi: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#15A4FA]/40 outline-none" placeholder="Judul Materi" />
                                                </div>
                                                <div>
                                                    <input type="datetime-local" value={editValues.tanggal_waktu || ''} onChange={e => setEditValues({ ...editValues, tanggal_waktu: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-[#15A4FA]/40 outline-none" />
                                                </div>
                                                <div>
                                                    <input type="text" value={editValues.narasumber} onChange={e => setEditValues({ ...editValues, narasumber: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-[#15A4FA]/40 outline-none" placeholder="Narasumber" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <input type="text" value={editValues.lokasi_atau_link} onChange={e => setEditValues({ ...editValues, lokasi_atau_link: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-[#15A4FA]/40 outline-none" placeholder="Lokasi atau Link" />
                                                </div>
                                                <div>
                                                    <select value={editValues.status} onChange={e => setEditValues({ ...editValues, status: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-[#15A4FA]/40 outline-none">
                                                        {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <select value={editValues.angkatan || 'Semua Angkatan'} onChange={e => setEditValues({ ...editValues, angkatan: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-[#15A4FA]/40 outline-none">
                                                        {ANGKATAN_OPTIONS.map(o => <option key={o} value={o}>{o === 'Semua Angkatan' ? o : `BS ${parseInt(o) - 2014} (${o})`}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 justify-end">
                                                <button onClick={() => { setEditingId(null); setEditValues({}) }} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700 outline-none rounded-lg transition-colors">Batal</button>
                                                <button onClick={() => saveEdit(entry.id)} disabled={isSavingEdit} className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg shadow-sm transition-colors disabled:opacity-50">
                                                    {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Simpan
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                    <h3 className="font-bold text-gray-900 dark:text-white text-base">{entry.judul_materi}</h3>
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${isPast ? 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>{displayStatus}</span>
                                                    {entry.angkatan !== 'Semua Angkatan' && (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                            {`BS ${parseInt(entry.angkatan) - 2014} (${entry.angkatan})`}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-[12px] text-gray-600 dark:text-slate-300 font-medium">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-4 h-4 text-[#15A4FA]" />
                                                        {new Date(entry.tanggal_waktu).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="w-4 h-4 text-emerald-500" />
                                                        <span className="truncate max-w-[200px]" title={entry.lokasi_atau_link}>{entry.lokasi_atau_link}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <UserCheck className="w-4 h-4 text-[#00529C] dark:text-[#60b5ff]" />
                                                        {entry.narasumber}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 md:self-start">
                                                <button onClick={() => startEdit(entry)} className="p-2 text-gray-400 hover:text-[#00529C] dark:hover:text-[#60b5ff] hover:bg-blue-50 dark:hover:bg-[#00529C]/20 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                                                <button onClick={() => setDeleteModal({ isOpen: true, id: entry.id })} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                count={1}
                label="jadwal pembinaan"
                isDeleting={isDeleting}
                onConfirm={() => deleteModal.id && handleDelete(deleteModal.id)}
                onCancel={() => setDeleteModal({ isOpen: false, id: null })}
            />
        </div>
    )
}
