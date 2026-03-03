import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getAuthClient() {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
        throw new Error('Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY environment variables');
    }

    return new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: SCOPES,
    });
}

/**
 * Append a row of data to a Google Sheet.
 */
export async function appendDataToSheet(
    spreadsheetId: string,
    range: string,
    values: (string | number | boolean)[][]
) {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values,
        },
    });

    return response.data;
}

/**
 * Read data from a Google Sheet range.
 */
export async function getSheetData(
    spreadsheetId: string,
    range: string
): Promise<string[][]> {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
    });

    return (response.data.values as string[][]) || [];
}

/**
 * Read specific individual cells from a Google Sheet using batchGet.
 * Return an array of string values matching the order of the requested ranges.
 */
export async function getBatchCellValues(
    spreadsheetId: string,
    ranges: string[]
): Promise<string[]> {
    if (!ranges.length) return []
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    try {
        const response = await sheets.spreadsheets.values.batchGet({
            spreadsheetId,
            ranges,
        });

        const valueRanges = response.data.valueRanges || []
        return valueRanges.map(vr => {
            const val = vr.values?.[0]?.[0]
            return val !== undefined ? String(val) : ''
        })
    } catch (e: any) {
        console.error('getBatchCellValues error (ensure sheets exist!):', e.message)
        // If a sheet doesn't exist, the whole batchGet fails. Return empty array to default to 0.
        return new Array(ranges.length).fill('')
    }
}

// ─── Types ───────────────────────────────────────────────────────────

export type IbadahActivity =
    | "Shalat Berjama'ah"
    | 'Qiyamul Lail'
    | 'Dzikir Pagi'
    | "Mendo'akan"
    | 'Shalat Dhuha'
    | 'Membaca Al-Quran'
    | 'Shaum Sunnah'
    | 'Berinfak';

export const IBADAH_ACTIVITIES: IbadahActivity[] = [
    "Shalat Berjama'ah",
    'Qiyamul Lail',
    'Dzikir Pagi',
    "Mendo'akan",
    'Shalat Dhuha',
    'Membaca Al-Quran',
    'Shaum Sunnah',
    'Berinfak',
];

export type IbadahAverage = Record<IbadahActivity, number>;

export type IbadahDailyRow = {
    tanggal: string;
    day: number; // day of month (1-31)
    values: Record<IbadahActivity, number>;
};

/**
 * Helper: convert sheet cell to number.
 * "Ya" / "TRUE" / "1" → 1; numeric strings → parsed float; else → 0.
 */
function cellToNumber(val: any): number { // Ubah tipe parameter menjadi any
    if (val === undefined || val === null || val === '') return 0;
    
    // Jika data sudah berupa angka murni dari API
    if (typeof val === 'number') return val; 

    const v = String(val).trim().toLowerCase();
    if (v === 'ya' || v === 'true') return 1;
    if (v === 'tidak' || v === 'false') return 0;
    
    // Ganti koma dengan titik agar terbaca sebagai desimal yang valid
    const n = parseFloat(v.replace(',', '.'));
    return isNaN(n) ? 0 : n;
}

/**
 * Fetch ibadah data for the given month and compute the monthly average
 * for each of the 8 worship activities.
 *
 * Columns: Tanggal | Shalat Berjama'ah | Qiyamul Lail | Dzikir Pagi | Mendo'akan | Shalat Dhuha | Membaca Al-Quran | Shaum Sunnah | Berinfak
 */
export async function getIbadahMonthlyAverage(
    spreadsheetId: string,
    sheetName: string,
    currentMonth: number,
    currentYear: number
): Promise<IbadahAverage> {
    const range = `${sheetName}!A:I`;

    let rows: string[][];
    try {
        rows = await getSheetData(spreadsheetId, range);
    } catch {
        return Object.fromEntries(
            IBADAH_ACTIVITIES.map((a) => [a, 0])
        ) as IbadahAverage;
    }

    const dataRows = rows.slice(1);

    const monthRows = dataRows.filter((row) => {
        if (!row[0]) return false;
        try {
            const date = new Date(row[0]);
            return (
                date.getMonth() + 1 === currentMonth &&
                date.getFullYear() === currentYear
            );
        } catch {
            return false;
        }
    });

    if (monthRows.length === 0) {
        return Object.fromEntries(
            IBADAH_ACTIVITIES.map((a) => [a, 0])
        ) as IbadahAverage;
    }

    const totalDays = monthRows.length;

    const sums: Record<IbadahActivity, number> = Object.fromEntries(
        IBADAH_ACTIVITIES.map((a) => [a, 0])
    ) as Record<IbadahActivity, number>;

    for (const row of monthRows) {
        sums["Shalat Berjama'ah"] += cellToNumber(row[1]);
        sums['Qiyamul Lail'] += cellToNumber(row[2]);
        sums['Dzikir Pagi'] += cellToNumber(row[3]);
        sums["Mendo'akan"] += cellToNumber(row[4]);
        sums['Shalat Dhuha'] += cellToNumber(row[5]);
        sums['Membaca Al-Quran'] += cellToNumber(row[6]);
        sums['Shaum Sunnah'] += cellToNumber(row[7]);
        sums['Berinfak'] += cellToNumber(row[8]);
    }

    // Calculate averages
    const averages: IbadahAverage = {} as IbadahAverage;
    for (const activity of IBADAH_ACTIVITIES) {
        if (activity === "Shalat Berjama'ah") {
            // Average out of 5 (max 5 per day), express as percentage
            averages[activity] = Math.round((sums[activity] / (totalDays * 5)) * 100);
        } else if (activity === 'Qiyamul Lail') {
            // Average count per day, then express as percentage (assuming 1 = 100%)
            averages[activity] = Math.round((sums[activity] / totalDays) * 100);
        } else {
            // Boolean activities: percentage compliance (0-100)
            averages[activity] = Math.round((sums[activity] / totalDays) * 100);
        }
    }

    return averages;
}

/**
 * Fetch daily ibadah data for the current month.
 * Returns an array of day-by-day entries for line chart.
 */
export async function getIbadahDailyData(
    spreadsheetId: string,
    sheetName: string,
    currentMonth: number,
    currentYear: number
): Promise<IbadahDailyRow[]> {
    const range = `${sheetName}!A:I`;

    let rows: string[][];
    try {
        rows = await getSheetData(spreadsheetId, range);
    } catch {
        return [];
    }

    const dataRows = rows.slice(1);

    const dailyRows: IbadahDailyRow[] = [];

    for (const row of dataRows) {
        if (!row[0]) continue;
        try {
            const date = new Date(row[0]);
            if (
                date.getMonth() + 1 === currentMonth &&
                date.getFullYear() === currentYear
            ) {
                dailyRows.push({
                    tanggal: row[0],
                    day: date.getDate(),
                    values: {
                        "Shalat Berjama'ah": cellToNumber(row[1]),
                        'Qiyamul Lail': cellToNumber(row[2]),
                        'Dzikir Pagi': cellToNumber(row[3]),
                        "Mendo'akan": cellToNumber(row[4]),
                        'Shalat Dhuha': cellToNumber(row[5]),
                        'Membaca Al-Quran': cellToNumber(row[6]),
                        'Shaum Sunnah': cellToNumber(row[7]),
                        'Berinfak': cellToNumber(row[8]),
                    },
                });
            }
        } catch {
            continue;
        }
    }

    return dailyRows.sort((a, b) => a.day - b.day);
}

/**
 * Read arbitrary cells from a spreadsheet range.
 * Returns an array of {name, value} entries.
 */
export async function getIbadahRerataFromCells(
    spreadsheetId: string,
    range: string
): Promise<{ name: string; value: number }[]> {
    try {
        const rows = await getSheetData(spreadsheetId, range);
        return rows.map((row, i) => ({
            name: row[0] || IBADAH_ACTIVITIES[i] || `Aktivitas ${i + 1}`,
            value: parseFloat(row[1] || row[0] || '0') || 0,
        }));
    } catch {
        return [];
    }
}

/**
 * Find a row by date value in column A.
 * Returns { rowIndex (1-based), data } or null if not found.
 */
export async function findRowByDate(
    spreadsheetId: string,
    sheetName: string,
    targetDate: string // YYYY-MM-DD format
): Promise<{ rowIndex: number; data: string[] } | null> {
    const range = `${sheetName}!A:I`;
    let rows: string[][];
    try {
        rows = await getSheetData(spreadsheetId, range);
    } catch {
        return null;
    }

    for (let i = 1; i < rows.length; i++) {
        if (!rows[i][0]) continue;
        try {
            const cellDate = new Date(rows[i][0]);
            const target = new Date(targetDate);
            if (
                cellDate.getFullYear() === target.getFullYear() &&
                cellDate.getMonth() === target.getMonth() &&
                cellDate.getDate() === target.getDate()
            ) {
                return { rowIndex: i + 1, data: rows[i] }; // +1 for 1-based Sheet row
            }
        } catch {
            continue;
        }
    }
    return null;
}

/**
 * Update a specific row in a Google Sheet (in-place update).
 */
export async function updateSheetRow(
    spreadsheetId: string,
    range: string,
    values: (string | number | boolean)[][]
): Promise<void> {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
    });
}
