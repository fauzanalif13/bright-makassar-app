'use server'

import { getIbadahMonthlyAverage, getIbadahDailyData, IBADAH_ACTIVITIES, getSheetData, countMultipleTableRows } from '@/src/lib/googleSheets'
import type { IbadahActivity } from '@/src/lib/googleSheets'
import { createClient } from '@/src/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type AwardeeChartResult = {
    monthly: { aktivitas: string; skor: number }[]
    daily: { day: number;  [key: string]: number }[]
}

export async function getAwardeeChartData(
    spreadsheetId: string,
    sheetName: string
): Promise<AwardeeChartResult> {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    // Fetch monthly and daily in parallel
    const [averages, dailyRows] = await Promise.all([
        getIbadahMonthlyAverage(spreadsheetId, sheetName, month, year),
        getIbadahDailyData(spreadsheetId, sheetName, month, year),
    ])

    // Transform monthly averages
    const monthly = IBADAH_ACTIVITIES.map((activity: IbadahActivity) => ({
        aktivitas: activity
            .replace("Shalat Berjama'ah", "Jama'ah")
            .replace("Membaca Al-Quran", "Tilawah"),
        skor: averages[activity] ?? 0,
    }))

    // Transform daily data for line chart
    const daily: { day: number; [key: string]: number }[] = dailyRows.map((row) => {
        const entry: { day: number; [key: string]: number } = { day: row.day }
        for (const activity of IBADAH_ACTIVITIES) {
            // Use display names matching AwardeeCharts keys
            const displayName = activity
                .replace("Shalat Berjama'ah", 'Shalat Berjamaah')
                .replace("Mendo'akan", "Mendo'akan")
            entry[displayName] = row.values[activity] ?? 0
        }
        return entry
    })

    return { monthly, daily }
}

// ─── Rekapan Angkatan Actions ─────────────────────────────────────────────

export type RekapanAngkatanResult = {
    name: string
    ibadahScore: number
    ipk: number
    prestasiOrganisasiCount: number
}

export async function getActiveBatches() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('roles_pengguna')
        .select('angkatan')
        .eq('role', 'awardee')
        .not('angkatan', 'is', null)

    if (error) {
        console.error('Failed to get active batches:', error)
        return []
    }

    // Get unique non-null angkatan
    const uniqueBatches = Array.from(new Set(data.filter(d => d.angkatan).map(d => d.angkatan as string)))
    uniqueBatches.sort((a, b) => b.localeCompare(a)) // Sort descending
    
    return uniqueBatches.map(angkatan => {
        // Assume format is like "2022" -> BS 8 (2014 was BS 0? No, 2014 is BS 1 -> Wait, in pengumuman it says `BS ${parseInt(entry.angkatan) - 2014}`)
        const year = parseInt(angkatan)
        const label = !isNaN(year) ? `BS ${year - 2014} (${angkatan})` : angkatan
        return { label, value: angkatan }
    })
}

export async function getRekapanAngkatanData(filters: { angkatan: string, month: number, year: number }): Promise<RekapanAngkatanResult[]> {
    const supabase = await createClient()
    
    let query = supabase
        .from('roles_pengguna')
        .select('name, spreadsheet_id, sheet_config')
        .eq('role', 'awardee')
        .eq('status', 'aktif')

    if (filters.angkatan && filters.angkatan !== 'Semua Angkatan') {
        query = query.eq('angkatan', filters.angkatan)
    }

    const { data: awardees, error } = await query
    
    if (error) {
        console.error('Failed to get awardees for Rekapan Angkatan:', error)
        return []
    }

    if (!awardees || awardees.length === 0) return []

    // Fetch data for each awardee concurrently using Promise.allSettled
    const results = await Promise.allSettled(
        awardees.filter(a => a.spreadsheet_id).map(async (awardee) => {
            const config = (awardee.sheet_config as any) || {}
            
            // 1. Fetch Ibadah
            let ibadahScore = 0
            try {
                const sheetName = config.ibadah_sheet || config.ibadah_sheet_name || 'LaporanIbadah'
                const avg = await getIbadahMonthlyAverage(awardee.spreadsheet_id!, sheetName, filters.month, filters.year)
                
                let sum = 0
                let count = 0
                for (const activity of IBADAH_ACTIVITIES) {
                    sum += avg[activity] || 0
                    count++
                }
                ibadahScore = count > 0 ? Math.round(sum / count) : 0
            } catch (e) {
                console.error(`Failed to fetch Ibadah for ${awardee.name}:`, e)
            }

            // 2. Fetch IPK
            let ipk = 0
            try {
                if (config.ip_ipk_range) {
                    const rows = await getSheetData(awardee.spreadsheet_id!, config.ip_ipk_range)
                    if (rows.length > 0) {
                        const ipRow = rows[0] || []
                        let cumulativeIp = 0
                        let ipCount = 0
                        for (let s = 0; s < 8; s++) {
                            const rawIp = ipRow[s] || ''
                            const ip = parseFloat(String(rawIp).replace(',', '.')) || 0
                            if (ip > 0) {
                                cumulativeIp += ip
                                ipCount++
                                ipk = Number((cumulativeIp / ipCount).toFixed(2))
                            }
                        }
                    }
                }
            } catch (e) {
                console.error(`Failed to fetch IPK for ${awardee.name}:`, e)
            }

            // 3. Fetch Prestasi & Organisasi Count
            let prestasiOrganisasiCount = 0
            try {
                const resumeSheet = config.resume_sheet || 'Resume'
                const counts = await countMultipleTableRows(awardee.spreadsheet_id!, resumeSheet, [
                    { anchor: 'Riwayat Prestasi', skipRows: 2 },
                    { anchor: 'Riwayat Organisasi', skipRows: 2 },
                ])
                prestasiOrganisasiCount = counts[0] + counts[1]
                
                // Fallback if anchor finds 0
                if (prestasiOrganisasiCount === 0) {
                     async function countRowsFallback(range: string | undefined): Promise<number> {
                        if (!range) return 0
                        try {
                            const rows = await getSheetData(awardee.spreadsheet_id!, range)
                            return rows.filter((r: any) => r[0]?.trim()).length
                        } catch { return 0 }
                    }
                    const [prestasiFallback, organisasiFallback] = await Promise.all([
                        countRowsFallback(config.prestasi_range),
                        countRowsFallback(config.organisasi_range)
                    ])
                    prestasiOrganisasiCount = prestasiFallback + organisasiFallback
                }
            } catch (e) {
                console.error(`Failed to fetch Achievements for ${awardee.name}:`, e)
            }

            return {
                name: awardee.name || 'Tanpa Nama',
                ibadahScore,
                ipk,
                prestasiOrganisasiCount
            }
        })
    )

    // Filter successful results
    const successfulResults: RekapanAngkatanResult[] = []
    results.forEach(result => {
        if (result.status === 'fulfilled') {
            successfulResults.push(result.value)
        }
    })

    // Sort alphabetically by name
    return successfulResults.sort((a, b) => a.name.localeCompare(b.name))
}

// ─── Pengumuman Actions ─────────────────────────────────────────────

export async function getPengumuman() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('pengumuman')
        .select(`*`)
        .order('created_at', { ascending: false })
    
    if (error) throw new Error(error.message)
    return data
}

export async function createPengumuman(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const judul = formData.get('judul') as string
    const deskripsi = formData.get('deskripsi') as string
    const tipe = formData.get('tipe') as string
    const tenggat_waktu = formData.get('tenggat_waktu') as string || null
    const angkatan = formData.get('angkatan') as string || 'Semua Angkatan'

    const { error } = await supabase.from('pengumuman').insert({
        judul,
        deskripsi,
        tipe,
        tenggat_waktu: tenggat_waktu ? new Date(tenggat_waktu).toISOString() : null,
        angkatan,
        author_id: user.id
    })

    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/awardee')
    revalidatePath('/dashboard/fasilitator/pengumuman')
}

export async function updatePengumuman(id: string, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const judul = formData.get('judul') as string
    const deskripsi = formData.get('deskripsi') as string
    const tipe = formData.get('tipe') as string
    const tenggat_waktu = formData.get('tenggat_waktu') as string || null
    const angkatan = formData.get('angkatan') as string || 'Semua Angkatan'

    const { error } = await supabase.from('pengumuman').update({
        judul,
        deskripsi,
        tipe,
        tenggat_waktu: tenggat_waktu ? new Date(tenggat_waktu).toISOString() : null,
        angkatan,
    }).eq('id', id)

    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/awardee')
    revalidatePath('/dashboard/fasilitator/pengumuman')
}

export async function deletePengumuman(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('pengumuman').delete().eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/awardee')
    revalidatePath('/dashboard/fasilitator/pengumuman')
}

// ─── Jadwal Pembinaan Actions ───────────────────────────────────────

export async function getJadwalPembinaan() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('jadwal_pembinaan')
        .select(`*`)
        .order('tanggal_waktu', { ascending: true })
    
    if (error) throw new Error(error.message)
    return data
}

export async function createJadwal(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const judul_materi = formData.get('judul_materi') as string
    const tanggal_waktu = formData.get('tanggal_waktu') as string
    const lokasi_atau_link = formData.get('lokasi_atau_link') as string
    const narasumber = formData.get('narasumber') as string
    const status = formData.get('status') as string
    const angkatan = formData.get('angkatan') as string || 'Semua Angkatan'

    const { error } = await supabase.from('jadwal_pembinaan').insert({
        judul_materi,
        tanggal_waktu: new Date(tanggal_waktu).toISOString(),
        lokasi_atau_link,
        narasumber,
        status,
        angkatan,
        author_id: user.id
    })

    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/awardee')
    revalidatePath('/dashboard/fasilitator/pembinaan')
}

export async function updateJadwal(id: string, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const judul_materi = formData.get('judul_materi') as string
    const tanggal_waktu = formData.get('tanggal_waktu') as string
    const lokasi_atau_link = formData.get('lokasi_atau_link') as string
    const narasumber = formData.get('narasumber') as string
    const status = formData.get('status') as string
    const angkatan = formData.get('angkatan') as string || 'Semua Angkatan'

    const { error } = await supabase.from('jadwal_pembinaan').update({
        judul_materi,
        tanggal_waktu: new Date(tanggal_waktu).toISOString(),
        lokasi_atau_link,
        narasumber,
        status,
        angkatan,
    }).eq('id', id)

    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/awardee')
    revalidatePath('/dashboard/fasilitator/pembinaan')
}

export async function deleteJadwal(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('jadwal_pembinaan').delete().eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/awardee')
    revalidatePath('/dashboard/fasilitator/pembinaan')
}
