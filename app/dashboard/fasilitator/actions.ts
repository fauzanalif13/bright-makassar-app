'use server'

import { getIbadahMonthlyAverage, getIbadahDailyData, IBADAH_ACTIVITIES } from '@/src/lib/googleSheets'
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
