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

        // ─── 1. IP/IPK Data ─────────────────────────────────────────
        let ipIpkData: { semester: string; IP: number; IPK: number }[] = []
        if (config.ip_ipk_range) {
            try {
                const rows = await getSheetData(spreadsheetId, config.ip_ipk_range)
                if (rows.length > 0) {
                    const ipRow = rows[0] || []
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
                console.error('[api/dashboard/pendidikan] IP/IPK fetch error:', e.message)
            }
        }

        // ─── 2. Achievement Counts (single fetch for all anchors) ────
        let achievementData: { name: string; count: number }[] = []
        try {
            const resumeSheet = config.resume_sheet || 'Resume'

            // Count all anchors from a single data fetch
            const counts = await countMultipleTableRows(spreadsheetId, resumeSheet, [
                { anchor: 'Pembinaan S/H Skills', skipRows: 2 },
                { anchor: 'Riwayat Prestasi', skipRows: 2 },
                { anchor: 'Riwayat Organisasi', skipRows: 2 },
                { anchor: 'Riwayat Workshop / Seminar', skipRows: 2 },
            ])

            const [pembinaan, prestasi, organisasi, workshop] = counts

            // Fallback to static range counting if anchor returned 0
            async function countRowsFallback(range: string | undefined): Promise<number> {
                if (!range) return 0
                try {
                    const rows = await getSheetData(spreadsheetId, range)
                    return rows.filter(r => r[0]?.trim()).length
                } catch { return 0 }
            }

            const finalCounts = await Promise.all([
                pembinaan > 0 ? pembinaan : countRowsFallback(config.pembinaan_range),
                prestasi > 0 ? prestasi : countRowsFallback(config.prestasi_range),
                organisasi > 0 ? organisasi : countRowsFallback(config.organisasi_range),
                workshop > 0 ? workshop : countRowsFallback(config.workshop_range),
            ])

            if (finalCounts.some(c => c > 0)) {
                achievementData = [
                    { name: 'Pembinaan', count: finalCounts[0] },
                    { name: 'Prestasi', count: finalCounts[1] },
                    { name: 'Organisasi', count: finalCounts[2] },
                    { name: 'Workshop', count: finalCounts[3] },
                ]
            }
        } catch (e: any) {
            console.error('[api/dashboard/pendidikan] Achievement fetch error:', e.message)
        }

        return NextResponse.json({ ipIpkData, achievementData })
    } catch (error: any) {
        console.error('[api/dashboard/pendidikan] Error:', error.message)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
