'use client'

import { useState, useMemo, useTransition } from 'react'
import {
    Search, Plus, Users, Edit3, Trash2, ToggleLeft, ToggleRight,
    X, Loader2, UserPlus, ChevronDown, Filter, AlertTriangle,
    KeyRound, Link as LinkIcon, Eye, EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import DeleteConfirmModal from '@/src/components/DeleteConfirmModal'
import type { PenggunaRow } from '@/app/dashboard/admin/pengguna/actions'
import {
    createSingleUser,
    createBatchUsers,
    updateUser,
    deleteUser,
    toggleUserStatus,
    toggleBatchStatus,
    resetUserPassword,
    fetchAwardeeUsers,
} from '@/app/dashboard/admin/pengguna/actions'

// ─── Batch ↔ Angkatan mapping ─────────────────────────────────────────
// Batch 8 = 2022, Batch 9 = 2023, Batch 10 = 2024, etc.
const BATCH_BASE = 2014 // Batch 1 = angkatan 2015, so base offset = 2014

function batchToAngkatan(batch: string): string {
    const num = parseInt(batch)
    if (isNaN(num)) return ''
    return String(num + BATCH_BASE)
}

function angkatanToBatch(angkatan: string): string {
    const num = parseInt(angkatan)
    if (isNaN(num)) return ''
    return String(num - BATCH_BASE)
}

function formatBatchAngkatan(batch: string | null, angkatan: string | null): string {
    if (batch && angkatan) return `BS ${batch} / ${angkatan}`
    if (batch) return `BS ${batch}`
    if (angkatan) return angkatan
    return '—'
}

type Props = {
    initialUsers: PenggunaRow[]
    batchOptions: string[]
    univOptions: string[]
}

type BatchUserRow = {
    name: string
    email: string
    password: string
    spreadsheet_url: string
    asal_univ: string
    is_custom_univ?: boolean
}

// ─── Main Component ────────────────────────────────────────────────────

export default function AdminAwardeeClient({ initialUsers, batchOptions, univOptions }: Props) {
    const [users, setUsers] = useState<PenggunaRow[]>(initialUsers)
    const [search, setSearch] = useState('')
    const [filterBatch, setFilterBatch] = useState('')
    const [filterStatus, setFilterStatus] = useState('')

    // Modals
    const [showAddModal, setShowAddModal] = useState(false)
    const [showBatchModal, setShowBatchModal] = useState(false)
    const [editingUser, setEditingUser] = useState<PenggunaRow | null>(null)
    const [deletingUser, setDeletingUser] = useState<PenggunaRow | null>(null)
    const [resetPwUser, setResetPwUser] = useState<PenggunaRow | null>(null)
    const [batchToggle, setBatchToggle] = useState<{ angkatan: string; newStatus: string } | null>(null)

    const [isPending, startTransition] = useTransition()

    // ─── Derived ───────────────────────────────────────────────────────

    const filteredUsers = useMemo(() => {
        let result = users
        if (search) {
            const q = search.toLowerCase()
            result = result.filter(u =>
                u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
            )
        }
        if (filterBatch) result = result.filter(u => u.angkatan === filterBatch)
        if (filterStatus) result = result.filter(u => u.status === filterStatus)
        return result
    }, [users, search, filterBatch, filterStatus])

    const batchSummary = useMemo(() => {
        const map = new Map<string, { total: number; aktif: number; nonaktif: number; batch: string }>()
        users.forEach(u => {
            const key = u.angkatan || 'N/A'
            const cur = map.get(key) || { total: 0, aktif: 0, nonaktif: 0, batch: u.batch || '' }
            cur.total++
            if (u.status === 'aktif') cur.aktif++; else cur.nonaktif++
            if (!cur.batch && u.batch) cur.batch = u.batch
            map.set(key, cur)
        })
        return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
    }, [users])

    // ─── Handlers ──────────────────────────────────────────────────────

    async function handleToggleUser(user: PenggunaRow) {
        const newStatus = user.status === 'aktif' ? 'nonaktif' : 'aktif'
        startTransition(async () => {
            const res = await toggleUserStatus(user.id, newStatus)
            if (res.error) toast.error(res.error)
            else {
                toast.success(res.success!)
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u))
            }
        })
    }

    async function handleBatchToggleConfirm() {
        if (!batchToggle) return
        startTransition(async () => {
            const res = await toggleBatchStatus(batchToggle.angkatan, batchToggle.newStatus)
            if (res.error) toast.error(res.error)
            else {
                toast.success(res.success!)
                setUsers(prev => prev.map(u =>
                    u.angkatan === batchToggle.angkatan ? { ...u, status: batchToggle.newStatus } : u
                ))
            }
            setBatchToggle(null)
        })
    }

    async function handleDeleteConfirm() {
        if (!deletingUser) return
        startTransition(async () => {
            const res = await deleteUser(deletingUser.id)
            if (res.error) toast.error(res.error)
            else {
                toast.success(res.success!)
                setUsers(prev => prev.filter(u => u.id !== deletingUser.id))
            }
            setDeletingUser(null)
        })
    }

    // ─── Render ────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        Kelola Awardee
                    </h1>
                    <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
                        Tambah, edit, dan kelola akun awardee BRIGHT Makassar.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowBatchModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-[#00529C] dark:text-[#60b5ff] bg-blue-50 dark:bg-[#00529C]/20 border border-blue-200 dark:border-[#00529C]/40 rounded-xl hover:bg-blue-100 dark:hover:bg-[#00529C]/30 transition-all"
                    >
                        <Users className="w-4 h-4" />
                        Tambah Batch
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#00529C] to-[#15A4FA] rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:from-[#003f7a] hover:to-[#1290e0] active:scale-[0.98] transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Pengguna
                    </button>
                </div>
            </div>

            {/* Batch Summary Cards */}
            {batchSummary.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {batchSummary.map(([angkatan, stats]) => {
                        const allAktif = stats.nonaktif === 0
                        return (
                            <div key={angkatan} className="bg-white dark:bg-slate-800/70 rounded-2xl border border-gray-100 dark:border-slate-700/60 p-5 hover:shadow-md transition-all group">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="text-sm font-black text-gray-700 dark:text-slate-200 tracking-wide">
                                            {stats.batch ? `BS ${stats.batch}` : `Angkatan`}
                                        </h3>
                                        <p className="text-xs text-gray-400 dark:text-slate-500 font-medium">{angkatan}</p>
                                    </div>
                                    <button
                                        onClick={() => setBatchToggle({
                                            angkatan,
                                            newStatus: allAktif ? 'nonaktif' : 'aktif'
                                        })}
                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${allAktif ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                                        title={allAktif ? 'Nonaktifkan semua' : 'Aktifkan semua'}
                                    >
                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${allAktif ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-gray-500 dark:text-slate-400">
                                        <strong className="text-gray-800 dark:text-white">{stats.total}</strong> total
                                    </span>
                                    <span className="text-green-600 dark:text-green-400">
                                        <strong>{stats.aktif}</strong> aktif
                                    </span>
                                    {stats.nonaktif > 0 && (
                                        <span className="text-red-500 dark:text-red-400">
                                            <strong>{stats.nonaktif}</strong> nonaktif
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                    <input
                        type="text"
                        placeholder="Cari nama atau email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700/60 rounded-xl text-sm focus:ring-2 focus:ring-[#15A4FA]/30 focus:border-[#15A4FA] dark:focus:border-[#60b5ff] outline-none transition-all text-gray-800 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500 pointer-events-none" />
                    <select
                        value={filterBatch}
                        onChange={e => setFilterBatch(e.target.value)}
                        className="appearance-none pl-9 pr-10 py-3 bg-white dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700/60 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#15A4FA]/30 focus:border-[#15A4FA] dark:focus:border-[#60b5ff] outline-none cursor-pointer min-w-[160px] text-gray-700 dark:text-slate-300"
                    >
                        <option value="">Semua Angkatan</option>
                        {batchOptions.map(b => (
                            <option key={b} value={b}>BS {angkatanToBatch(b)} / {b}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500 pointer-events-none" />
                </div>
                <div className="relative">
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="appearance-none px-4 pr-10 py-3 bg-white dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700/60 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#15A4FA]/30 focus:border-[#15A4FA] dark:focus:border-[#60b5ff] outline-none cursor-pointer min-w-[140px] text-gray-700 dark:text-slate-300"
                    >
                        <option value="">Semua Status</option>
                        <option value="aktif">Aktif</option>
                        <option value="nonaktif">Nonaktif</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500 pointer-events-none" />
                </div>
            </div>

            {/* Count */}
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                Menampilkan {filteredUsers.length} dari {users.length} pengguna
            </p>

            {/* User Table */}
            <div className="bg-white dark:bg-slate-800/70 rounded-2xl border border-gray-100 dark:border-slate-700/60 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-700/60">
                                <th className="text-left px-5 py-4 font-bold text-gray-500 dark:text-slate-400 uppercase text-xs tracking-wider">Nama</th>
                                <th className="text-left px-5 py-4 font-bold text-gray-500 dark:text-slate-400 uppercase text-xs tracking-wider">Email</th>
                                <th className="text-left px-5 py-4 font-bold text-gray-500 dark:text-slate-400 uppercase text-xs tracking-wider">Batch / Angkatan</th>
                                <th className="text-left px-5 py-4 font-bold text-gray-500 dark:text-slate-400 uppercase text-xs tracking-wider">Gender</th>
                                <th className="text-left px-5 py-4 font-bold text-gray-500 dark:text-slate-400 uppercase text-xs tracking-wider">Spreadsheet</th>
                                <th className="text-left px-5 py-4 font-bold text-gray-500 dark:text-slate-400 uppercase text-xs tracking-wider">Status</th>
                                <th className="text-center px-5 py-4 font-bold text-gray-500 dark:text-slate-400 uppercase text-xs tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400 dark:text-slate-500">
                                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="font-semibold">Tidak ada pengguna ditemukan</p>
                                        <p className="text-xs mt-1">Coba ubah filter atau tambahkan pengguna baru.</p>
                                    </td>
                                </tr>
                            ) : filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-700/20 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-gradient-to-br from-[#00529C] to-[#15A4FA] rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                                                {u.name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <span className="font-semibold text-gray-800 dark:text-slate-200 truncate max-w-[160px]">{u.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-gray-600 dark:text-slate-400 text-xs">{u.email}</td>
                                    <td className="px-5 py-4">
                                        <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 dark:bg-[#00529C]/15 text-[#00529C] dark:text-[#60b5ff] text-xs font-bold rounded-lg">
                                            {formatBatchAngkatan(u.batch, u.angkatan)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-gray-600 dark:text-slate-400 capitalize text-xs">{u.gender || '—'}</td>
                                    <td className="px-5 py-4">
                                        {u.spreadsheet_id ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-lg" title={u.spreadsheet_id}>
                                                <LinkIcon className="w-3 h-3" />
                                                Terhubung
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 dark:text-slate-600 text-xs">Belum</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <button
                                            onClick={() => handleToggleUser(u)}
                                            disabled={isPending}
                                            className="group flex items-center gap-2"
                                        >
                                            {u.status === 'aktif' ? (
                                                <>
                                                    <ToggleRight className="w-6 h-6 text-green-500 group-hover:text-green-600 transition-colors" />
                                                    <span className="inline-flex items-center px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                                                        Aktif
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <ToggleLeft className="w-6 h-6 text-gray-400 group-hover:text-gray-500 transition-colors" />
                                                    <span className="inline-flex items-center px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-full">
                                                        Nonaktif
                                                    </span>
                                                </>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => setEditingUser(u)}
                                                className="p-2 rounded-lg text-gray-400 dark:text-slate-500 hover:text-[#00529C] dark:hover:text-[#60b5ff] hover:bg-blue-50 dark:hover:bg-[#00529C]/15 transition-all"
                                                title="Edit"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setResetPwUser(u)}
                                                className="p-2 rounded-lg text-gray-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/15 transition-all"
                                                title="Reset Password"
                                            >
                                                <KeyRound className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeletingUser(u)}
                                                className="p-2 rounded-lg text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/15 transition-all"
                                                title="Hapus"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {showAddModal && (
                <AddUserModal
                    onClose={() => setShowAddModal(false)}
                    onCreated={() => {
                        setShowAddModal(false)
                        refreshAll()
                    }}
                    univOptions={univOptions}
                />
            )}

            {showBatchModal && (
                <BatchUserModal
                    onClose={() => setShowBatchModal(false)}
                    onCreated={() => {
                        setShowBatchModal(false)
                        refreshAll()
                    }}
                    univOptions={univOptions}
                />
            )}

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onUpdated={(updated) => {
                        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
                        setEditingUser(null)
                    }}
                    univOptions={univOptions}
                />
            )}

            {resetPwUser && (
                <ResetPasswordModal
                    user={resetPwUser}
                    onClose={() => setResetPwUser(null)}
                />
            )}

            <DeleteConfirmModal
                isOpen={!!deletingUser}
                count={1}
                label={`pengguna "${deletingUser?.name || ''}"`}
                isDeleting={isPending}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeletingUser(null)}
            />

            {/* Batch Toggle Confirm */}
            {batchToggle && (
                <ConfirmModal
                    title={`${batchToggle.newStatus === 'nonaktif' ? 'Nonaktifkan' : 'Aktifkan'} Angkatan ${batchToggle.angkatan}?`}
                    description={`Semua awardee angkatan ${batchToggle.angkatan} akan diubah menjadi ${batchToggle.newStatus}.`}
                    confirmLabel={`Ya, ${batchToggle.newStatus === 'nonaktif' ? 'Nonaktifkan' : 'Aktifkan'}`}
                    variant={batchToggle.newStatus === 'nonaktif' ? 'danger' : 'success'}
                    isPending={isPending}
                    onConfirm={handleBatchToggleConfirm}
                    onCancel={() => setBatchToggle(null)}
                />
            )}
        </div>
    )

    async function refreshAll() {
        try {
            const freshUsers = await fetchAwardeeUsers()
            setUsers(freshUsers)
        } catch { /* swallow */ }
    }
}


// ═══════════════════════════════════════════════════════════════════════
// Shared Input Classes
// ═══════════════════════════════════════════════════════════════════════
const inputCls = "w-full px-4 py-3 bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700/60 rounded-xl text-sm focus:ring-2 focus:ring-[#15A4FA]/30 focus:border-[#15A4FA] dark:focus:border-[#60b5ff] outline-none text-gray-800 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-all"
const labelCls = "block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1.5"

function UniversitasSelect({ options, defaultValue = '' }: { options: string[], defaultValue?: string }) {
    const [isCustom, setIsCustom] = useState(false)
    const [val, setVal] = useState(defaultValue)

    return (
        <div className="flex flex-col gap-2">
            {!isCustom ? (
                <select
                    name={!isCustom ? "asal_univ" : ""}
                    value={val}
                    onChange={(e) => {
                        if (e.target.value === 'ADD_NEW') {
                            setIsCustom(true)
                            setVal('')
                        } else {
                            setVal(e.target.value)
                        }
                    }}
                    className={inputCls + ' cursor-pointer'}
                >
                    <option value="">Pilih Universitas</option>
                    {options.map(o => (
                        <option key={o} value={o}>{o}</option>
                    ))}
                    <option value="ADD_NEW" className="font-bold text-[#00529C]">+ Univ baru</option>
                </select>
            ) : (
                <div className="flex items-center gap-2">
                    <input
                        autoFocus
                        name="asal_univ"
                        value={val}
                        onChange={e => setVal(e.target.value)}
                        placeholder="Ketik nama universitas baru..."
                        className={inputCls}
                    />
                    <button
                        type="button"
                        onClick={() => { setIsCustom(false); setVal('') }}
                        className="p-3 bg-gray-100 dark:bg-slate-800/60 hover:bg-gray-200 dark:hover:bg-slate-700/60 border border-gray-200 dark:border-slate-700/60 rounded-xl transition-colors shrink-0"
                        title="Batal"
                    >
                        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>
            )}
        </div>
    )
}


// ═══════════════════════════════════════════════════════════════════════
// MODAL: Add Single User
// ═══════════════════════════════════════════════════════════════════════

function AddUserModal({ onClose, onCreated, univOptions }: { onClose: () => void; onCreated: () => void; univOptions: string[] }) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState('')
    const [batchVal, setBatchVal] = useState('')
    const [angkatanVal, setAngkatanVal] = useState('')
    const [showPw, setShowPw] = useState(false)

    function handleBatchChange(val: string) {
        setBatchVal(val)
        const auto = batchToAngkatan(val)
        if (auto) setAngkatanVal(auto)
    }

    function handleAngkatanChange(val: string) {
        setAngkatanVal(val)
        const auto = angkatanToBatch(val)
        if (auto) setBatchVal(auto)
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError('')
        const formData = new FormData(e.currentTarget)
        startTransition(async () => {
            const res = await createSingleUser(formData)
            if (res.error) setError(res.error)
            else { toast.success(res.success!); onCreated() }
        })
    }

    return (
        <ModalShell onClose={onClose}>
            <ModalHeader icon={<UserPlus className="w-5 h-5 text-white" />} gradient="from-[#00529C] to-[#15A4FA]" title="Tambah Pengguna Baru" onClose={onClose} />
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {error && <ErrorBanner message={error} />}

                <div>
                    <label className={labelCls}>Nama Lengkap *</label>
                    <input name="name" required className={inputCls} placeholder="Masukkan nama lengkap" />
                </div>
                <div>
                    <label className={labelCls}>Email *</label>
                    <input name="email" type="email" required className={inputCls} placeholder="email@contoh.com" />
                </div>
                <div className="relative">
                    <label className={labelCls}>Password *</label>
                    <input name="password" type={showPw ? 'text' : 'password'} required minLength={6} className={inputCls + ' pr-12'} placeholder="Minimal 6 karakter" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-[38px] text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Batch</label>
                        <input name="batch" value={batchVal} onChange={e => handleBatchChange(e.target.value)} className={inputCls} placeholder="e.g. 10" />
                    </div>
                    <div>
                        <label className={labelCls}>Angkatan</label>
                        <input name="angkatan" value={angkatanVal} onChange={e => handleAngkatanChange(e.target.value)} className={inputCls} placeholder="e.g. 2024" />
                    </div>
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500 -mt-2">
                    💡 Batch dan Angkatan saling terhubung otomatis. Anda tetap bisa mengubah secara manual.
                </p>
                <div>
                    <label className={labelCls}>Gender</label>
                    <select name="gender" className={inputCls + ' cursor-pointer'}>
                        <option value="">Pilih gender</option>
                        <option value="Putra">Putra</option>
                        <option value="Putri">Putri</option>
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Universitas</label>
                    <UniversitasSelect options={univOptions} />
                </div>
                <div>
                    <label className={labelCls}>Spreadsheet URL</label>
                    <input name="spreadsheet_url" className={inputCls} placeholder="https://docs.google.com/spreadsheets/d/..." />
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Opsional. Bisa ditambahkan nanti oleh awardee di profil.</p>
                </div>

                <SubmitButton isPending={isPending} icon={<Plus className="w-4 h-4" />} label="Tambah Pengguna" pendingLabel="Menyimpan..." gradient="from-[#00529C] to-[#15A4FA]" shadowColor="shadow-blue-500/25" />
            </form>
        </ModalShell>
    )
}


// ═══════════════════════════════════════════════════════════════════════
// MODAL: Add Batch Users
// ═══════════════════════════════════════════════════════════════════════

function BatchUserModal({ onClose, onCreated, univOptions }: { onClose: () => void; onCreated: () => void; univOptions: string[] }) {
    const [rows, setRows] = useState<BatchUserRow[]>([
        { name: '', email: '', password: '', spreadsheet_url: '', asal_univ: '' },
        { name: '', email: '', password: '', spreadsheet_url: '', asal_univ: '' },
        { name: '', email: '', password: '', spreadsheet_url: '', asal_univ: '' },
    ])
    const [sharedBatch, setSharedBatch] = useState('')
    const [sharedAngkatan, setSharedAngkatan] = useState('')
    const [sharedGender, setSharedGender] = useState('')
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState('')
    const [result, setResult] = useState<{ created: number; failed: number; errors: string[] } | null>(null)

    function handleSharedBatchChange(val: string) {
        setSharedBatch(val)
        const auto = batchToAngkatan(val)
        if (auto) setSharedAngkatan(auto)
    }

    function handleSharedAngkatanChange(val: string) {
        setSharedAngkatan(val)
        const auto = angkatanToBatch(val)
        if (auto) setSharedBatch(auto)
    }

    function updateRow(i: number, field: keyof BatchUserRow, value: string) {
        setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
    }
    function addRow() { setRows(prev => [...prev, { name: '', email: '', password: '', spreadsheet_url: '', asal_univ: '' }]) }
    function removeRow(i: number) { if (rows.length > 1) setRows(prev => prev.filter((_, idx) => idx !== i)) }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setResult(null)
        const validRows = rows.filter(r => r.name.trim() && r.email.trim() && r.password.trim())
        if (validRows.length === 0) { setError('Isi minimal satu baris pengguna.'); return }

        startTransition(async () => {
            const res = await createBatchUsers(validRows, {
                angkatan: sharedAngkatan,
                gender: sharedGender,
                batch: sharedBatch,
            })
            if (res.created > 0) toast.success(`${res.created} pengguna berhasil ditambahkan!`)
            if (res.failed > 0) setResult(res)
            if (res.failed === 0) onCreated()
            else if (res.created > 0) onCreated()
        })
    }

    return (
        <ModalShell onClose={onClose} wide>
            <ModalHeader icon={<Users className="w-5 h-5 text-white" />} gradient="from-purple-500 to-indigo-600" title="Tambah Batch Awardee" subtitle="Tambahkan beberapa pengguna sekaligus" onClose={onClose} />
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {error && <ErrorBanner message={error} />}
                {result && result.failed > 0 && (
                    <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm space-y-1">
                        <p className="font-bold text-amber-700 dark:text-amber-400">{result.created} berhasil, {result.failed} gagal:</p>
                        {result.errors.map((err, i) => <p key={i} className="text-amber-600 dark:text-amber-400 text-xs">• {err}</p>)}
                    </div>
                )}

                {/* Shared fields */}
                <div className="bg-gray-50 dark:bg-slate-900/40 rounded-xl p-4 border border-gray-100 dark:border-slate-700/60">
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Data Bersama (berlaku untuk semua)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">Batch</label>
                            <input value={sharedBatch} onChange={e => handleSharedBatchChange(e.target.value)} className={inputCls} placeholder="10" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">Angkatan</label>
                            <input value={sharedAngkatan} onChange={e => handleSharedAngkatanChange(e.target.value)} className={inputCls} placeholder="2024" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">Gender</label>
                            <select value={sharedGender} onChange={e => setSharedGender(e.target.value)} className={inputCls + ' cursor-pointer'}>
                                <option value="">Pilih</option>
                                <option value="Putra">Putra</option>
                                <option value="Putri">Putri</option>
                            </select>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">💡 Batch ↔ Angkatan otomatis terhubung</p>
                </div>

                {/* Rows */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Data Pengguna ({rows.length} baris)</p>
                        <button type="button" onClick={addRow} className="inline-flex items-center gap-1 text-xs font-bold text-[#00529C] dark:text-[#60b5ff] hover:underline">
                            <Plus className="w-3 h-3" /> Tambah Baris
                        </button>
                    </div>
                    {rows.map((row, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <span className="mt-2.5 text-xs font-bold text-gray-400 dark:text-slate-600 w-5 shrink-0 text-right">{i + 1}</span>
                            <div className="flex-1 grid grid-cols-5 gap-2">
                                <input value={row.name} onChange={e => updateRow(i, 'name', e.target.value)} className={inputCls} placeholder="Nama" />
                                <input value={row.email} onChange={e => updateRow(i, 'email', e.target.value)} type="email" className={inputCls} placeholder="Email" />
                                <input value={row.password} onChange={e => updateRow(i, 'password', e.target.value)} type="password" className={inputCls} placeholder="Password" />
                                
                                {row.is_custom_univ ? (
                                    <div className="relative flex items-center">
                                        <input value={row.asal_univ} onChange={e => updateRow(i, 'asal_univ', e.target.value)} className={inputCls} placeholder="Ketik univ baru..." autoFocus />
                                        <button type="button" onClick={() => { updateRow(i, 'is_custom_univ', false as any); updateRow(i, 'asal_univ', ''); }} className="absolute right-2 p-1 text-gray-400 hover:text-red-500 bg-white dark:bg-slate-800 rounded-md">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <select 
                                        value={row.asal_univ} 
                                        onChange={e => {
                                            if (e.target.value === 'ADD_NEW') {
                                                updateRow(i, 'is_custom_univ', true as any)
                                                updateRow(i, 'asal_univ', '')
                                            } else {
                                                updateRow(i, 'asal_univ', e.target.value)
                                            }
                                        }} 
                                        className={inputCls + ' px-2 text-xs font-medium cursor-pointer'}
                                    >
                                        <option value="">Pilih Univ</option>
                                        {univOptions.map(o => <option key={o} value={o} className="truncate max-w-[150px]">{o}</option>)}
                                        <option value="ADD_NEW" className="font-bold text-[#00529C]">+ Univ Baru</option>
                                    </select>
                                )}

                                <input value={row.spreadsheet_url} onChange={e => updateRow(i, 'spreadsheet_url', e.target.value)} type="text" className={inputCls} placeholder="Spreadsheet URL" />
                            </div>
                            <button type="button" onClick={() => removeRow(i)} disabled={rows.length <= 1} className="mt-2 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                <SubmitButton isPending={isPending} icon={<Users className="w-4 h-4" />} label={`Tambah ${rows.filter(r => r.name && r.email && r.password).length} Pengguna`} pendingLabel="Memproses..." gradient="from-purple-500 to-indigo-600" shadowColor="shadow-purple-500/25" />
            </form>
        </ModalShell>
    )
}


// ═══════════════════════════════════════════════════════════════════════
// MODAL: Edit User
// ═══════════════════════════════════════════════════════════════════════

function EditUserModal({ user, onClose, onUpdated, univOptions }: { user: PenggunaRow; onClose: () => void; onUpdated: (u: PenggunaRow) => void; univOptions: string[] }) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState('')
    const [batchVal, setBatchVal] = useState(user.batch || '')
    const [angkatanVal, setAngkatanVal] = useState(user.angkatan || '')
    const [emailVal, setEmailVal] = useState(user.email)

    function handleBatchChange(val: string) {
        setBatchVal(val)
        const auto = batchToAngkatan(val)
        if (auto) setAngkatanVal(auto)
    }
    function handleAngkatanChange(val: string) {
        setAngkatanVal(val)
        const auto = angkatanToBatch(val)
        if (auto) setBatchVal(auto)
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError('')
        const formData = new FormData(e.currentTarget)
        startTransition(async () => {
            const res = await updateUser(user.id, formData)
            if (res.error) setError(res.error)
            else {
                toast.success(res.success!)
                onUpdated({
                    ...user,
                    name: formData.get('name') as string,
                    email: formData.get('email') as string || user.email,
                    angkatan: formData.get('angkatan') as string || null,
                    gender: formData.get('gender') as string || null,
                    batch: formData.get('batch') as string || null,
                    asal_univ: formData.get('asal_univ') as string || null,
                    spreadsheet_id: (formData.get('spreadsheet_url') as string)?.trim() ? 'linked' : user.spreadsheet_id,
                })
            }
        })
    }

    // Build the spreadsheet URL from ID for display
    const spreadsheetUrl = user.spreadsheet_id
        ? `https://docs.google.com/spreadsheets/d/${user.spreadsheet_id}/edit`
        : ''

    return (
        <ModalShell onClose={onClose}>
            <ModalHeader icon={<Edit3 className="w-5 h-5 text-white" />} gradient="from-amber-400 to-orange-500" title="Edit Pengguna" onClose={onClose} />
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {error && <ErrorBanner message={error} />}

                <div>
                    <label className={labelCls}>Nama Lengkap *</label>
                    <input name="name" defaultValue={user.name} required className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>Email</label>
                    <input name="email" type="email" value={emailVal} onChange={e => setEmailVal(e.target.value)} className={inputCls} />
                    {emailVal !== user.email && (
                        <p className="text-xs text-amber-500 dark:text-amber-400 mt-1 font-medium">⚠ Email akan diubah di Auth juga.</p>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Batch</label>
                        <input name="batch" value={batchVal} onChange={e => handleBatchChange(e.target.value)} className={inputCls} placeholder="e.g. 10" />
                    </div>
                    <div>
                        <label className={labelCls}>Angkatan</label>
                        <input name="angkatan" value={angkatanVal} onChange={e => handleAngkatanChange(e.target.value)} className={inputCls} placeholder="e.g. 2024" />
                    </div>
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500 -mt-2">💡 Batch ↔ Angkatan otomatis terhubung</p>
                <div>
                    <label className={labelCls}>Gender</label>
                    <select name="gender" defaultValue={user.gender || ''} className={inputCls + ' cursor-pointer'}>
                        <option value="">Pilih gender</option>
                        <option value="Putra">Putra</option>
                        <option value="Putri">Putri</option>
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Universitas</label>
                    <UniversitasSelect options={univOptions} defaultValue={user.asal_univ || ''} />
                </div>
                <div>
                    <label className={labelCls}>Spreadsheet URL</label>
                    <input name="spreadsheet_url" defaultValue={spreadsheetUrl} className={inputCls} placeholder="https://docs.google.com/spreadsheets/d/..." />
                </div>

                <SubmitButton isPending={isPending} icon={<Edit3 className="w-4 h-4" />} label="Simpan Perubahan" pendingLabel="Menyimpan..." gradient="from-amber-500 to-orange-500" shadowColor="shadow-orange-500/25" />
            </form>
        </ModalShell>
    )
}


// ═══════════════════════════════════════════════════════════════════════
// MODAL: Reset Password
// ═══════════════════════════════════════════════════════════════════════

function ResetPasswordModal({ user, onClose }: { user: PenggunaRow; onClose: () => void }) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState('')
    const [pw, setPw] = useState('')
    const [showPw, setShowPw] = useState(false)

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        if (pw.length < 6) { setError('Password minimal 6 karakter.'); return }
        startTransition(async () => {
            const res = await resetUserPassword(user.id, pw)
            if (res.error) setError(res.error)
            else { toast.success(res.success!); onClose() }
        })
    }

    return (
        <ModalShell onClose={onClose}>
            <ModalHeader icon={<KeyRound className="w-5 h-5 text-white" />} gradient="from-violet-500 to-purple-600" title="Reset Password" onClose={onClose} />
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {error && <ErrorBanner message={error} />}

                <div className="bg-gray-50 dark:bg-slate-900/40 rounded-xl p-4 border border-gray-100 dark:border-slate-700/60">
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                        Reset password untuk <strong className="text-gray-800 dark:text-white">{user.name}</strong>
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{user.email}</p>
                </div>

                <div className="relative">
                    <label className={labelCls}>Password Baru *</label>
                    <input value={pw} onChange={e => setPw(e.target.value)} type={showPw ? 'text' : 'password'} required minLength={6} className={inputCls + ' pr-12'} placeholder="Minimal 6 karakter" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-[38px] text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>

                <SubmitButton isPending={isPending} icon={<KeyRound className="w-4 h-4" />} label="Reset Password" pendingLabel="Mereset..." gradient="from-violet-500 to-purple-600" shadowColor="shadow-purple-500/25" />
            </form>
        </ModalShell>
    )
}


// ═══════════════════════════════════════════════════════════════════════
// Shared UI Primitives
// ═══════════════════════════════════════════════════════════════════════

function ModalShell({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-black/20 border border-gray-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto`}>
                {children}
            </div>
        </div>
    )
}

function ModalHeader({ icon, gradient, title, subtitle, onClose }: { icon: React.ReactNode; gradient: string; title: string; subtitle?: string; onClose: () => void }) {
    return (
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg`}>{icon}</div>
                <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">{title}</h2>
                    {subtitle && <p className="text-xs text-gray-500 dark:text-slate-400">{subtitle}</p>}
                </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5" />
            </button>
        </div>
    )
}

function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 font-medium">
            {message}
        </div>
    )
}

function SubmitButton({ isPending, icon, label, pendingLabel, gradient, shadowColor }: {
    isPending: boolean; icon: React.ReactNode; label: string; pendingLabel: string; gradient: string; shadowColor: string
}) {
    return (
        <button
            type="submit" disabled={isPending}
            className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-bold text-white bg-gradient-to-r ${gradient} rounded-xl shadow-lg ${shadowColor} hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-70`}
        >
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />{pendingLabel}</> : <>{icon}{label}</>}
        </button>
    )
}

function ConfirmModal({ title, description, confirmLabel, variant, isPending, onConfirm, onCancel }: {
    title: string; description: string; confirmLabel: string
    variant: 'danger' | 'success'; isPending: boolean
    onConfirm: () => void; onCancel: () => void
}) {
    const btnCls = variant === 'danger'
        ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/25 hover:from-red-600 hover:to-red-700'
        : 'bg-gradient-to-r from-green-500 to-green-600 shadow-green-500/25 hover:from-green-600 hover:to-green-700'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 p-6">
                <div className="flex items-center justify-center mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center ring-8 ring-amber-50/50 dark:ring-amber-900/10">
                        <AlertTriangle className="w-7 h-7 text-amber-500 dark:text-amber-400" />
                    </div>
                </div>
                <h3 className="text-lg font-black text-center text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-center text-gray-500 dark:text-slate-400 leading-relaxed mb-6">{description}</p>
                <div className="flex items-center gap-3">
                    <button onClick={onCancel} disabled={isPending} className="flex-1 px-4 py-3 text-sm font-bold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50">
                        Batal
                    </button>
                    <button onClick={onConfirm} disabled={isPending} className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white rounded-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-70 ${btnCls}`}>
                        {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Memproses...</> : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
