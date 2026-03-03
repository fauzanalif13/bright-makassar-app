'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark'

type ThemeContextType = {
    theme: Theme
    toggleTheme: () => void
    isDark: boolean
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    toggleTheme: () => { },
    isDark: false,
})

export function useTheme() {
    return useContext(ThemeContext)
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('light')
    const [mounted, setMounted] = useState(false)

    // On mount: read from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('theme') as Theme | null
        let resolved: Theme = 'light'
        if (stored === 'dark' || stored === 'light') {
            resolved = stored
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            resolved = 'dark'
        }
        setTheme(resolved)
        setMounted(true)
    }, [])

    // Sync .dark class on <html> whenever theme changes
    useEffect(() => {
        if (!mounted) return
        const isDark = theme === 'dark'
        document.documentElement.classList.toggle('dark', isDark)
        localStorage.setItem('theme', theme)
    }, [theme, mounted])

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light')
    }, [])

    // Prevent flash during SSR → hydration
    if (!mounted) {
        return <>{children}</>
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    )
}
