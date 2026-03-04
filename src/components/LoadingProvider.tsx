'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingContextType {
    isLoading: boolean
    setGlobalLoading: (isLoading: boolean) => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(false)

    return (
        <LoadingContext.Provider value={{ isLoading, setGlobalLoading: setIsLoading }}>
            {children}
            {isLoading && (
                <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                </div>
            )}
        </LoadingContext.Provider>
    )
}

export function useLoading() {
    const context = useContext(LoadingContext)
    if (context === undefined) {
        throw new Error('useLoading must be used within a LoadingProvider')
    }
    return context
}
