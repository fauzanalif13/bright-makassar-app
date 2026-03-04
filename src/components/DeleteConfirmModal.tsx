'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'

interface DeleteConfirmModalProps {
    /** Whether the modal is visible */
    isOpen: boolean
    /** Number of items to be deleted */
    count: number
    /** Optional label for the data type, e.g. "organisasi", "pembinaan" */
    label?: string
    /** Whether the delete action is currently in progress */
    isDeleting?: boolean
    /** Called when user confirms the deletion */
    onConfirm: () => void
    /** Called when user cancels */
    onCancel: () => void
}

export default function DeleteConfirmModal({
    isOpen,
    count,
    label = 'data',
    isDeleting = false,
    onConfirm,
    onCancel,
}: DeleteConfirmModalProps) {
    const cancelRef = useRef<HTMLButtonElement>(null)

    // Focus the cancel button when modal opens
    useEffect(() => {
        if (isOpen) cancelRef.current?.focus()
    }, [isOpen])

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape' && !isDeleting) onCancel()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [isOpen, isDeleting, onCancel])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={isDeleting ? undefined : onCancel}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-black/20 border border-gray-100 dark:border-slate-700 animate-in zoom-in-95 fade-in duration-200">
                {/* Close button */}
                <button
                    onClick={onCancel}
                    disabled={isDeleting}
                    className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="p-6">
                    {/* Icon */}
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center ring-8 ring-red-50/50 dark:ring-red-900/10">
                            <AlertTriangle className="w-7 h-7 text-red-500 dark:text-red-400" />
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-black text-center text-gray-900 dark:text-white mb-2">
                        Hapus {count} {label}?
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-center text-gray-500 dark:text-slate-400 leading-relaxed mb-6">
                        Data yang dihapus tidak dapat dikembalikan.<br />
                        Pastikan Anda sudah yakin sebelum melanjutkan.
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            ref={cancelRef}
                            onClick={onCancel}
                            disabled={isDeleting}
                            className="flex-1 px-4 py-3 text-sm font-bold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg shadow-red-500/25 hover:shadow-xl hover:from-red-600 hover:to-red-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:shadow-lg disabled:active:scale-100"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Menghapus...
                                </>
                            ) : (
                                'Ya, Hapus'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
