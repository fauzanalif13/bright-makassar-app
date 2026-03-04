'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Storage consent banner — asks the user for permission before
 * using localStorage to cache dashboard data for faster loads.
 *
 * Only renders once. Once the user makes a choice, it's stored
 * in localStorage itself (meta-consent) and never shown again.
 */
export default function CookieConsent() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        try {
            const consent = localStorage.getItem('storage_consent')
            // Show banner only if user hasn't made a choice yet
            if (consent === null) {
                setVisible(true)
            }
        } catch {
            // localStorage not available — don't show banner
        }
    }, [])

    function handleAccept() {
        try { localStorage.setItem('storage_consent', 'true') } catch {}
        setVisible(false)
    }

    function handleDecline() {
        try { localStorage.setItem('storage_consent', 'false') } catch {}
        setVisible(false)
    }

    if (!visible) return null

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] animate-slide-down">
            <div className="bg-gradient-to-r from-[#00529C] to-[#15A4FA] text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs sm:text-sm font-medium flex-1 min-w-[200px]">
                        🍪 Situs ini menggunakan penyimpanan lokal untuk meningkatkan performa dan kecepatan akses dashboard.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleAccept}
                            className="px-4 py-1.5 bg-white text-[#00529C] text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            Izinkan
                        </button>
                        <button
                            onClick={handleDecline}
                            className="px-4 py-1.5 bg-white/10 text-white text-xs font-bold rounded-lg hover:bg-white/20 transition-colors border border-white/20"
                        >
                            Tolak
                        </button>
                        <button
                            onClick={handleDecline}
                            className="ml-1 p-1 hover:bg-white/10 rounded-md transition-colors"
                            title="Tutup"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
