import { NextResponse } from 'next/server'
import { createClient } from '@/src/utils/supabase/server'
import { getSheetData } from '@/src/lib/googleSheets'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const monthFilter = searchParams.get('month') // numeric 1-12 or "all"
        const yearFilter = searchParams.get('year')

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch all awardees with active spreadsheet configurations
        const { data: awardees, error: dbError } = await supabase
            .from('roles_pengguna')
            .select('email, name, angkatan, spreadsheet_id, sheet_config')
            .eq('role', 'awardee')
            .not('spreadsheet_id', 'is', null)

        if (dbError || !awardees) {
            return NextResponse.json({ error: 'Failed to fetch awardees' }, { status: 500 })
        }

        const BULAN_MAP: Record<string, string> = {
            '1': 'Januari', '2': 'Februari', '3': 'Maret', '4': 'April',
            '5': 'Mei', '6': 'Juni', '7': 'Juli', '8': 'Agustus',
            '9': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
        }

        const targetMonthName = monthFilter ? BULAN_MAP[monthFilter] : null;

        let allAchievements: any[] = []
        const isRefreshRequested = searchParams.get('refresh') === 'true';

        // Iterate through all awardees to fetch their achievements
        // Use Promise.all to fetch concurrently for better performance
        await Promise.all(awardees.map(async (aw) => {
            if (!aw.spreadsheet_id) return;
            
            const config = aw.sheet_config as any || {};
            const resumeSheet = config.resume_sheet || 'Resume';
            
            try {
                // Fetching the whole sheet to find the anchor is too slow for many users.
                // We'll fetch columns A-K (which gets cached)
                // Intelligently bypass cache ONLY for the active user if refresh requested
                const forceFresh = isRefreshRequested && aw.email === user.email;
                const rows = await getSheetData(aw.spreadsheet_id, `'${resumeSheet}'!A:K`, forceFresh)
                
                const norm = 'riwayat prestasi'
                let ai = -1
                for (let i = 0; i < rows.length && ai === -1; i++) { if ((rows[i][1] || '').trim().toLowerCase() === norm) ai = i }
                for (let i = 0; i < rows.length && ai === -1; i++) { if ((rows[i][0] || '').trim().toLowerCase() === norm) ai = i }
                for (let i = 0; i < rows.length && ai === -1; i++) { if ((rows[i][2] || '').trim().toLowerCase() === norm) ai = i }
                
                if (ai !== -1) {
                    const ROWS_TO_SKIP = 2
                    const start = ai + 1 + ROWS_TO_SKIP
                    
                    for (let i = start; i < rows.length; i++) {
                        const tanggal = (rows[i][1] || '').trim()
                        const prestasi = (rows[i][2] || '').trim()
                        
                        if (!tanggal && !prestasi) break // End of table
                        if (!prestasi) continue // Skip empty rows
                        
                        // tanggal format expected: "15 Agustus 2024"
                        let matchesDate = true;
                        
                        if (targetMonthName || yearFilter) {
                            const dateParts = tanggal.split(' ');
                            if (dateParts.length >= 3) {
                                const rowMonth = dateParts[1];
                                const rowYear = dateParts[dateParts.length - 1];
                                
                                if (targetMonthName && rowMonth.toLowerCase() !== targetMonthName.toLowerCase()) {
                                    matchesDate = false;
                                }
                                if (yearFilter && rowYear !== yearFilter) {
                                    matchesDate = false;
                                }
                            } else {
                                // Unrecognized string formats might not match the filter
                                matchesDate = false; 
                            }
                        }

                        if (matchesDate) {
                            allAchievements.push({
                                awardeeName: aw.name || 'Awardee',
                                angkatan: aw.angkatan || '',
                                tanggal: tanggal,
                                judulPrestasi: prestasi,
                                penyelenggara: (rows[i][6] || '').trim(),
                                level: (rows[i][9] || '').trim(),
                                // Create a basic timestamp for sorting
                                _timestamp: parseIndonesianDateToTimestamp(tanggal)
                            })
                        }
                    }
                }
            } catch (err) {
                // Silently ignore errors for individual spreadsheets
                console.error(`Error fetching for awardee ${aw.name}:`, err)
            }
        }))

        // Sort by timestamp descending (newest first)
        allAchievements.sort((a, b) => b._timestamp - a._timestamp)

        return NextResponse.json({ data: allAchievements })
    } catch (error: any) {
        console.error('[api/dashboard/achievements] Error:', error.message)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

function parseIndonesianDateToTimestamp(dateStr: string): number {
    if (!dateStr) return 0;
    const parts = dateStr.split(' ');
    if (parts.length < 3) return 0;
    
    const day = parseInt(parts[0]);
    const monthStr = parts[1].toLowerCase();
    const year = parseInt(parts[2]);
    
    const monthMap: Record<string, number> = {
        'januari': 0, 'februari': 1, 'maret': 2, 'april': 3,
        'mei': 4, 'juni': 5, 'juli': 6, 'agustus': 7,
        'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
    };
    
    const month = monthMap[monthStr] !== undefined ? monthMap[monthStr] : 0;
    return new Date(year, month, day).getTime();
}
