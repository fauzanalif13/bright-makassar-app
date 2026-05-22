'use server'

import { getIbadahMonthlyAverage, getIbadahDailyData, IBADAH_ACTIVITIES, getSheetData, countMultipleTableRows, getIbadahRerataPerActivity, getIbadahMonthEntriesFromGrid } from '@/src/lib/googleSheets'
import type { IbadahActivity } from '@/src/lib/googleSheets'
import { createClient } from '@/src/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCellRef, getCategoryCellRefs, CALENDAR_TO_ACADEMIC, calendarToAcademicYear } from '@/src/lib/ibadahDefaults'

export type AwardeeChartResult = {
    monthly: { aktivitas: string; skor: number }[]
    daily: { day: number;  [key: string]: number }[]
}

export async function getAwardeeChartData(
    spreadsheetId: string,
    sheetConfig: any,
    angkatanStr: string | null | undefined
): Promise<AwardeeChartResult> {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    // 1. Fetch proper monthly averages directly from the sheet
    const sheetAverages = await getMonthlyAveragesFromSheet(spreadsheetId, sheetConfig, angkatanStr, month, year)

    // 2. We can try to fetch daily rows if we still want the line chart to work.
    let dailyRows: any[] = []
    try {
        const sheetName = sheetConfig?.ibadah?.harian?.sheet_name || sheetConfig?.ibadah_sheet || 'LaporanIbadah'
        dailyRows = await getIbadahDailyData(spreadsheetId, sheetName, month, year)
    } catch {}

    // Transform monthly averages for UI
    const monthly = IBADAH_ACTIVITIES.map((activity) => ({
        aktivitas: activity
            .replace("Shalat Berjama'ah", "Jama'ah")
            .replace("Membaca Al-Quran", "Tilawah"),
        skor: sheetAverages[activity] ?? 0,
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
    const uniqueBatches = Array.from(new Set(data.filter(d => d.angkatan).map(d => String(d.angkatan))))
    uniqueBatches.sort((a, b) => b.localeCompare(a)) // Sort descending
    
    return uniqueBatches.map(angkatan => {
        const year = parseInt(angkatan)
        const label = !isNaN(year) ? `BS ${year - 2014} (${angkatan})` : angkatan
        return { label, value: angkatan }
    })
}

// ─── Missing types from Tab Refactor ───

export type AwardeeFullInfo = {
    name: string
    spreadsheet_id: string | null
    sheet_config: any
    angkatan: string | null
    gender: string | null
}

export type KabarBaruItem = {
    id: string
    type: 'pengumuman' | 'pembinaan' | 'prestasi'
    title: string
    date: string
    content?: string
    author?: string
    batch?: string
    role?: string
    gender?: string
    tipe?: string
    status?: string
}

export type RekapLaporanAwardee = {
    name: string
    ibadahScore: number
    ipk: number
    prestasiCount: number
    organisasiCount: number
    semesterIps: number[]
}

export type RekapLaporanResult = {
    awardees: RekapLaporanAwardee[]
    summary: {
        totalAwardees: number
        avgIbadah: number
        avgIpk: number
        totalPrestasi: number
        totalOrganisasi: number
    }
}

export type IndividualFullResult = {
    ibadah: {
        monthly: { aktivitas: string; skor: number }[]
        daily: { day: number; [key: string]: number }[]
    }
    ipIpk: { semester: number; IP: number; IPK: number }[]
    achievements: { type: string; count: number }[]
}

export async function getRekapLaporanData(filters: { angkatan: string, month: number, year: number }): Promise<RekapLaporanResult> {
    const supabase = await createClient()
    
    let query = supabase.from('roles_pengguna').select('name, spreadsheet_id, sheet_config, angkatan').eq('role', 'awardee').eq('status', 'aktif')
    if (filters.angkatan && filters.angkatan !== 'Semua Angkatan') query = query.eq('angkatan', filters.angkatan)

    const { data: awardees, error } = await query
    if (error || !awardees || awardees.length === 0) return { awardees: [], summary: { totalAwardees: 0, avgIbadah: 0, avgIpk: 0, totalPrestasi: 0, totalOrganisasi: 0 } }

    const results = await Promise.allSettled(
        awardees.filter(a => a.spreadsheet_id).map(async (awardee) => {
            const config = (awardee.sheet_config as any) || {}
            
            // 1. Fetch Ibadah (using Hotfix 7 manual daily array accumulation)
            let ibadahScore = 0
            try {
                const gridRes = await getIbadahMonthEntriesFromGrid(awardee.spreadsheet_id!, config, awardee.angkatan, filters.month, filters.year)
                let sum = 0
                let count = 0
                if (gridRes.data && gridRes.data.length > 0) {
                    const actSums: Record<string, number> = Object.fromEntries(IBADAH_ACTIVITIES.map(a => [a, 0]))
                    let totalValidDays = 0

                    for (const row of gridRes.data) {
                        const dScore = (parseInt(row.shalatBerjamaah) || 0) + (parseInt(row.qiyamulLail) || 0) +
                                       (parseInt(row.dzikirPagi) || 0) + (parseInt(row.mendoakan) || 0) +
                                       (parseInt(row.shalatDhuha) || 0) + (parseInt(row.membacaQuran) || 0) +
                                       (parseInt(row.shaumSunnah) || 0) + (parseInt(row.berinfak) || 0)
                        
                        if (dScore > 0) totalValidDays++

                        actSums["Shalat Berjama'ah"] += parseInt(row.shalatBerjamaah) || 0
                        actSums["Qiyamul Lail"] += parseInt(row.qiyamulLail) || 0
                        actSums["Dzikir Pagi"] += parseInt(row.dzikirPagi) || 0
                        actSums["Mendo'akan"] += parseInt(row.mendoakan) || 0
                        actSums["Shalat Dhuha"] += parseInt(row.shalatDhuha) || 0
                        actSums["Membaca Al-Quran"] += parseInt(row.membacaQuran) || 0
                        actSums["Shaum Sunnah"] += parseInt(row.shaumSunnah) || 0
                        actSums["Berinfak"] += parseInt(row.berinfak) || 0
                    }

                    const divisor = totalValidDays > 0 ? totalValidDays : (gridRes.data.length > 0 ? gridRes.data.length : 1)
                    
                    for (const activity of IBADAH_ACTIVITIES) {
                        let avg = 0
                        if (gridRes.data.length > 0) {
                            if (activity === "Shalat Berjama'ah") {
                                avg = Math.round((actSums[activity] / (divisor * 5)) * 100)
                            } else {
                                avg = Math.round((actSums[activity] / divisor) * 100)
                            }
                        }
                        sum += Math.min(100, avg)
                        count++
                    }
                }
                ibadahScore = count > 0 ? Math.round(sum / count) : 0
            } catch (e) { console.error(`Failed Ibadah ${awardee.name}`, e) }

            // 2. Fetch IPK
            let ipk = 0
            const semesterIps: number[] = []
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
                            semesterIps.push(ip)
                            if (ip > 0) {
                                cumulativeIp += ip
                                ipCount++
                                ipk = Number((cumulativeIp / ipCount).toFixed(2))
                            }
                        }
                    }
                }
            } catch (e) { console.error(`Failed IPK ${awardee.name}`, e) }

            // 3. Fetch Prestasi & Organisasi
            let prestasiCount = 0
            let organisasiCount = 0
            try {
                const resumeSheet = config.resume_sheet || 'Resume'
                const counts = await countMultipleTableRows(awardee.spreadsheet_id!, resumeSheet, [
                    { anchor: 'Riwayat Prestasi', skipRows: 2 },
                    { anchor: 'Riwayat Organisasi', skipRows: 2 },
                ])
                prestasiCount = counts[0]
                organisasiCount = counts[1]
                
                if (prestasiCount === 0 && organisasiCount === 0) {
                     async function countFallback(range: string | undefined) {
                        if (!range) return 0
                        try {
                            const rows = await getSheetData(awardee.spreadsheet_id!, range)
                            return rows.filter((r: any) => r[0]?.trim()).length
                        } catch { return 0 }
                    }
                    prestasiCount = await countFallback(config.prestasi_range)
                    organisasiCount = await countFallback(config.organisasi_range)
                }
            } catch (e) {}

            return {
                name: awardee.name || 'Tanpa Nama',
                ibadahScore,
                ipk,
                prestasiCount,
                organisasiCount,
                semesterIps
            } as RekapLaporanAwardee
        })
    )

    const successfulAwd: RekapLaporanAwardee[] = []
    results.forEach(res => { if (res.status === 'fulfilled') successfulAwd.push(res.value) })
    successfulAwd.sort((a, b) => a.name.localeCompare(b.name))

    const summary = {
        totalAwardees: successfulAwd.length,
        avgIbadah: successfulAwd.length > 0 ? Math.round(successfulAwd.reduce((sum, a) => sum + a.ibadahScore, 0) / successfulAwd.length) : 0,
        avgIpk: successfulAwd.length > 0 ? Number((successfulAwd.reduce((sum, a) => sum + (a.ipk || 0), 0) / successfulAwd.filter(a => a.ipk > 0).length || 1).toFixed(2)) : 0,
        totalPrestasi: successfulAwd.reduce((sum, a) => sum + a.prestasiCount, 0),
        totalOrganisasi: successfulAwd.reduce((sum, a) => sum + a.organisasiCount, 0)
    }

    return { awardees: successfulAwd, summary }
}

export async function getIndividualFullData(spreadsheetId: string, sheetConfig: any, angkatanStr: string | null): Promise<IndividualFullResult> {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    // Ibadah (using AwardeeChartResult logic)
    let ibadahMonthly: any[] = []
    let ibadahDaily: any[] = []
    try {
        const gridRes = await getIbadahMonthEntriesFromGrid(spreadsheetId, sheetConfig, angkatanStr, month, year)
        const dailyRows = gridRes.data || []
        
        const actSums: Record<string, number> = Object.fromEntries(IBADAH_ACTIVITIES.map(a => [a, 0]))
        let totalValidDays = 0

        for (const row of dailyRows) {
            const dScore = (parseInt(row.shalatBerjamaah) || 0) + (parseInt(row.qiyamulLail) || 0) +
                           (parseInt(row.dzikirPagi) || 0) + (parseInt(row.mendoakan) || 0) +
                           (parseInt(row.shalatDhuha) || 0) + (parseInt(row.membacaQuran) || 0) +
                           (parseInt(row.shaumSunnah) || 0) + (parseInt(row.berinfak) || 0)
            
            if (dScore > 0) totalValidDays++

            actSums["Shalat Berjama'ah"] += parseInt(row.shalatBerjamaah) || 0
            actSums["Qiyamul Lail"] += parseInt(row.qiyamulLail) || 0
            actSums["Dzikir Pagi"] += parseInt(row.dzikirPagi) || 0
            actSums["Mendo'akan"] += parseInt(row.mendoakan) || 0
            actSums["Shalat Dhuha"] += parseInt(row.shalatDhuha) || 0
            actSums["Membaca Al-Quran"] += parseInt(row.membacaQuran) || 0
            actSums["Shaum Sunnah"] += parseInt(row.shaumSunnah) || 0
            actSums["Berinfak"] += parseInt(row.berinfak) || 0
        }

        const divisor = totalValidDays > 0 ? totalValidDays : (dailyRows.length > 0 ? dailyRows.length : 1)

        ibadahMonthly = IBADAH_ACTIVITIES.map(activity => {
            let avg = 0
            if (dailyRows.length > 0) {
                if (activity === "Shalat Berjama'ah") {
                    avg = Math.round((actSums[activity] / (divisor * 5)) * 100)
                } else {
                    avg = Math.round((actSums[activity] / divisor) * 100)
                }
            }
            
            return {
                aktivitas: activity
                    .replace("Shalat Berjama'ah", "Jama'ah")
                    .replace("Membaca Al-Quran", "Tilawah"),
                skor: Math.min(100, avg),
            }
        })

        ibadahDaily = dailyRows.map((row) => {
            const entry: any = { day: row.day }
            for (const activity of IBADAH_ACTIVITIES) {
                const displayName = activity
                    .replace("Shalat Berjama'ah", 'Shalat Berjamaah')
                    .replace("Mendo'akan", "Mendo'akan")
                
                // Need to map activity keys correctly
                const keyMap: Record<string, string> = {
                    "Shalat Berjama'ah": "shalatBerjamaah",
                    "Qiyamul Lail": "qiyamulLail",
                    "Dzikir Pagi": "dzikirPagi",
                    "Mendo'akan": "mendoakan",
                    "Shalat Dhuha": "shalatDhuha",
                    "Membaca Al-Quran": "membacaQuran",
                    "Shaum Sunnah": "shaumSunnah",
                    "Berinfak": "berinfak"
                }
                const mappedKey = keyMap[activity] || activity
                entry[displayName] = parseInt((row as any)[mappedKey] as string) || 0
            }
            return entry
        })
    } catch {}

    // IP / IPK
    let ipIpk: any[] = Array.from({ length: 8 }, (_, i) => ({ semester: i + 1, IP: 0, IPK: 0 }))
    try {
        if (sheetConfig.ip_ipk_range) {
            const rows = await getSheetData(spreadsheetId, sheetConfig.ip_ipk_range)
            if (rows.length > 0) {
                const ipRow = rows[0] || []
                let cumulativeIp = 0
                let ipCount = 0
                ipIpk = Array.from({ length: 8 }, (_, i) => {
                    const rawIp = ipRow[i] || ''
                    const ip = parseFloat(String(rawIp).replace(',', '.')) || 0
                    if (ip > 0) {
                        cumulativeIp += ip
                        ipCount++
                    }
                    const ipk = ipCount > 0 ? Number((cumulativeIp / ipCount).toFixed(2)) : 0
                    return { semester: i + 1, IP: ip, IPK: ipk }
                })
            }
        }
    } catch {}

    // Achievements
    let achievements = [
        { type: 'Prestasi', count: 0 },
        { type: 'Organisasi', count: 0 }
    ]
    try {
        const resumeSheet = sheetConfig.resume_sheet || 'Resume'
        const counts = await countMultipleTableRows(spreadsheetId, resumeSheet, [
            { anchor: 'Riwayat Prestasi', skipRows: 2 },
            { anchor: 'Riwayat Organisasi', skipRows: 2 },
        ])
        
        let prestasiCount = counts[0]
        let organisasiCount = counts[1]
        
        if (prestasiCount === 0 && organisasiCount === 0) {
             async function countFallback(range: string | undefined) {
                if (!range) return 0
                try {
                    const rows = await getSheetData(spreadsheetId, range)
                    return rows.filter((r: any) => r[0]?.trim()).length
                } catch { return 0 }
            }
            prestasiCount = await countFallback(sheetConfig.prestasi_range)
            organisasiCount = await countFallback(sheetConfig.organisasi_range)
        }
        
        achievements = [
            { type: 'Prestasi', count: prestasiCount },
            { type: 'Organisasi', count: organisasiCount }
        ]
    } catch {}

    return { ibadah: { monthly: ibadahMonthly, daily: ibadahDaily }, ipIpk, achievements }
}

    export async function getKabarBaruFeed(filters: { sortOrder: string, angkatan: string, gender: string, page: number, pageSize: number }): Promise<{items: KabarBaruItem[], hasMore: boolean}> {
    const supabase = await createClient()
    const { sortOrder, angkatan, gender, page, pageSize } = filters
    
    // 1. Fetch Pengumuman
    let pQuery = supabase.from('pengumuman').select('id, judul, deskripsi, created_at, angkatan, tipe')
    if (angkatan && angkatan !== 'Semua') pQuery = pQuery.eq('angkatan', angkatan)
    const { data: pengumuman } = await pQuery

    // 2. Fetch Pembinaan
    let bQuery = supabase.from('jadwal_pembinaan').select('id, judul_materi, deskripsi:lokasi_atau_link, created_at:tanggal_waktu, angkatan, status')
    if (angkatan && angkatan !== 'Semua') bQuery = bQuery.eq('angkatan', angkatan)
    const { data: pembinaan } = await bQuery
    
    let feed: KabarBaruItem[] = []
    
    // Add pengumuman
    if (pengumuman) {
        feed.push(...pengumuman.map(p => ({
            id: `p_${p.id}`,
            type: 'pengumuman' as const,
            title: String(p.judul),
            content: String(p.deskripsi),
            date: String(p.created_at),
            batch: String(p.angkatan),
            tipe: String(p.tipe),
        })))
    }
    
    // Add pembinaan
    if (pembinaan) {
        feed.push(...pembinaan.map(b => ({
            id: `b_${b.id}`,
            type: 'pembinaan' as const,
            title: String(b.judul_materi),
            content: String(b.deskripsi),
            date: String(b.created_at),
            batch: String(b.angkatan),
            status: String(b.status),
        })))
    }
    
    // 3. Fetch Prestasi from sheets (Hotfix 1)
    if (page === 0) {
        let userQuery = supabase.from('roles_pengguna').select('name, spreadsheet_id, sheet_config, angkatan, gender').eq('role', 'awardee').eq('status', 'aktif')
        if (angkatan && angkatan !== 'Semua') userQuery = userQuery.eq('angkatan', angkatan)
        if (gender && gender !== 'Semua') userQuery = userQuery.eq('gender', gender)
        const { data: awardees } = await userQuery
        
        if (awardees) {
            await Promise.allSettled(awardees.filter(a => a.spreadsheet_id).slice(0, 10).map(async a => {
                const config = (a.sheet_config as any) || {}
                const titleRange = config.prestasi_range || 'Resume!B10:B20'
                try {
                    const rows = await getSheetData(a.spreadsheet_id!, titleRange)
                    if (rows && rows.length > 0) {
                        rows.forEach((r, i) => {
                            if (r[0] && String(r[0]).trim()) {
                                feed.push({
                                    id: `ach_${a.spreadsheet_id}_${i}`,
                                    type: 'prestasi',
                                    title: `${a.name} meraih prestasi: ${r[0]}`,
                                    date: new Date().toISOString(),
                                    batch: String(a.angkatan),
                                    author: String(a.name),
                                    gender: String(a.gender)
                                })
                            }
                        })
                    }
                } catch (e) {}
            }))
        }
    }
    
    // Sort
    feed.sort((a, b) => {
        const da = new Date(a.date).getTime()
        const db = new Date(b.date).getTime()
        return sortOrder === 'newest' ? db - da : da - db
    })
    
    // Paginate
    const start = page * pageSize
    const end = start + pageSize
    const paginated = feed.slice(start, end)
    const hasMore = end < feed.length
    
    return { items: paginated, hasMore }
}

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

// ─── Helpers ─────────────────────────────────────────────────────────

async function getMonthlyAveragesFromSheet(
    spreadsheetId: string,
    sheetConfig: any,
    angkatanStr: string | null | undefined,
    month: number,
    year: number
): Promise<Record<string, number>> {
    const angkatan = angkatanStr ? parseInt(angkatanStr) : new Date().getFullYear()
    const tahunKe = calendarToAcademicYear(month, year, angkatan)
    if (!tahunKe) return Object.fromEntries(IBADAH_ACTIVITIES.map(a => [a, 0]))

    const monthId = CALENDAR_TO_ACADEMIC[month]
    if (!monthId) return Object.fromEntries(IBADAH_ACTIVITIES.map(a => [a, 0]))
    
    const harianConfig = sheetConfig?.ibadah?.harian
    const bulananConfig = sheetConfig?.ibadah?.bulanan || sheetConfig?.ibadah || {}
    const yk = `tahun_${tahunKe}`
    let sheetName = harianConfig?.[yk]?.sheet_name || bulananConfig?.[yk]?.sheet_name || `Tahun ke-${tahunKe}`

    const savedRef = bulananConfig?.[yk]?.months?.[monthId]
    let rerataCell = ''

    if (savedRef && savedRef.trim()) {
        if (savedRef.includes('!')) {
            const parts = savedRef.split('!')
            sheetName = parts[0].replace(/'/g, '')
            rerataCell = parts[1]
        } else {
            rerataCell = savedRef.trim()
        }
    } else {
        rerataCell = getCellRef(tahunKe, monthId)
    }

    if (!rerataCell) return Object.fromEntries(IBADAH_ACTIVITIES.map(a => [a, 0]))

    const categoryCells = getCategoryCellRefs(rerataCell)
    
    try {
        const result = await getIbadahRerataPerActivity(spreadsheetId, sheetName, categoryCells)
        return result
    } catch {
        return Object.fromEntries(IBADAH_ACTIVITIES.map(a => [a, 0]))
    }
}
