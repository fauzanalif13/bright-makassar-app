import { NextResponse } from 'next/server'
import { createClient } from '@/src/utils/supabase/server'
import { getSheetData, countMultipleTableRows } from '@/src/lib/googleSheets'

// ─── Types ───────────────────────────────────────────────────────────

interface SheetConfig {
    ip_ipk_range?: string
    pembinaan_range?: string
    prestasi_range?: string
    organisasi_range?: string
    workshop_range?: string
    resume_sheet?: string
    [key: string]: any
}

// ─── Route Handler ───────────────────────────────────────────────────

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: userData, error: dbError } = await supabase
            .from('roles_pengguna')
            .select('spreadsheet_id, sheet_config')
            .eq('email', user.email)
            .single()

        if (dbError || !userData?.spreadsheet_id) {
            return NextResponse.json({ error: 'Spreadsheet not configured' }, { status: 400 })
        }

        const config = (userData.sheet_config as SheetConfig) || {}
        const spreadsheetId = userData.spreadsheet_id

        // ─── Data Fetching (Optimized Single Fetch) ────────────────────────
        let ipIpkData: { semester: string; IP: number; IPK: number }[] = []
        let achievementData: { name: string; count: number }[] = []

        try {
            const resumeSheet = config.resume_sheet || 'Resume'
            // Single fetch of columns A through K
            const rows = await getSheetData(spreadsheetId, `'${resumeSheet}'!A:K`)

            if (rows.length > 0) {
                // --- 1. Process IP/IPK ---
                const ipNorm = 'indeks prestasi'
                let ipIdx = -1
                for (let i = 0; i < rows.length; i++) {
                    const cellA = (rows[i][0] || '').trim().toLowerCase()
                    const cellB = (rows[i][1] || '').trim().toLowerCase()
                    const cellC = (rows[i][2] || '').trim().toLowerCase()
                    if (cellA === ipNorm || cellB === ipNorm || cellC === ipNorm) {
                        ipIdx = i
                        break
                    }
                }

                if (ipIdx !== -1) {
                    const dataRow = rows[ipIdx + 3] || []
                    let cumulativeIp = 0
                    let ipCount = 0
                    for (let s = 0; s < 8; s++) {
                        const rawIp = dataRow[s + 1] || ''
                        const ip = parseFloat(String(rawIp).replace(',', '.')) || 0
                        let ipk = 0
                        if (ip > 0) {
                            cumulativeIp += ip
                            ipCount++
                            ipk = Number((cumulativeIp / ipCount).toFixed(2))
                        }
                        ipIpkData.push({ semester: `Sem ${s + 1}`, IP: ip, IPK: ipk })
                    }
                } else if (config.ip_ipk_range) {
                    // Fallback to configured range
                    try {
                        const fallbackRows = await getSheetData(spreadsheetId, config.ip_ipk_range)
                        if (fallbackRows.length > 0) {
                            const ipRow = fallbackRows[0] || []
                            let cumulativeIp = 0
                            let ipCount = 0
                            for (let s = 0; s < 8; s++) {
                                const rawIp = ipRow[s] || ''
                                const ip = parseFloat(String(rawIp).replace(',', '.')) || 0
                                let ipk = 0
                                if (ip > 0) {
                                    cumulativeIp += ip
                                    ipCount++
                                    ipk = Number((cumulativeIp / ipCount).toFixed(2))
                                }
                                ipIpkData.push({ semester: `Sem ${s + 1}`, IP: ip, IPK: ipk })
                            }
                        }
                    } catch (e: any) {
                        console.error('[api/dashboard/pendidikan] IP/IPK fallback error:', e.message)
                    }
                }

                // --- 2. Process Achievements ---
                const anchorsToCount = [
                    { name: 'Pembinaan', anchor: 'pembinaan s/h skills', skipRows: 2 },
                    { name: 'Prestasi', anchor: 'riwayat prestasi', skipRows: 2 },
                    { name: 'Organisasi', anchor: 'riwayat organisasi', skipRows: 2 },
                    { name: 'Workshop', anchor: 'riwayat workshop / seminar', skipRows: 2 },
                ]

                const parsedCounts = anchorsToCount.map(({ name, anchor, skipRows }) => {
                    let anchorIdx = -1
                    for (let i = 0; i < rows.length; i++) {
                        const cellA = (rows[i][0] || '').trim().toLowerCase()
                        const cellB = (rows[i][1] || '').trim().toLowerCase()
                        if (cellA === anchor || cellB === anchor) {
                            anchorIdx = i
                            break
                        }
                    }
                    
                    if (anchorIdx === -1) return { name, count: 0 }
                    
                    let count = 0
                    for (let i = anchorIdx + 1 + skipRows; i < rows.length; i++) {
                        const cellA = (rows[i][0] || '').trim()
                        const cellB = (rows[i][1] || '').trim()
                        if (!cellA && !cellB) break
                        count++
                    }
                    return { name, count }
                })

                async function countRowsFallback(range: string | undefined): Promise<number> {
                    if (!range) return 0
                    try {
                        const fallbackRows = await getSheetData(spreadsheetId, range)
                        return fallbackRows.filter(r => r[0]?.trim()).length
                    } catch { return 0 }
                }

                // Apply fallbacks if anchor count is 0
                const finalCounts = await Promise.all(parsedCounts.map(async (item) => {
                    if (item.count > 0) return item.count
                    switch (item.name) {
                        case 'Pembinaan': return await countRowsFallback(config.pembinaan_range)
                        case 'Prestasi': return await countRowsFallback(config.prestasi_range)
                        case 'Organisasi': return await countRowsFallback(config.organisasi_range)
                        case 'Workshop': return await countRowsFallback(config.workshop_range)
                        default: return 0
                    }
                }))

                if (finalCounts.some(c => c > 0)) {
                    achievementData = [
                        { name: 'Pembinaan', count: finalCounts[0] },
                        { name: 'Prestasi', count: finalCounts[1] },
                        { name: 'Organisasi', count: finalCounts[2] },
                        { name: 'Workshop', count: finalCounts[3] },
                    ]
                }
            }
        } catch (e: any) {
            console.error('[api/dashboard/pendidikan] Fetch error:', e.message)
        }

        return NextResponse.json({ ipIpkData, achievementData })
    } catch (error: any) {
        console.error('[api/dashboard/pendidikan] Error:', error.message)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
