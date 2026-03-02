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
function cellToNumber(val: string | undefined): number {
    if (!val) return 0;
    const v = val.trim().toLowerCase();
    if (v === 'ya' || v === 'true') return 1;
    if (v === 'tidak' || v === 'false') return 0;
    const n = parseFloat(v);
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
 * Used for reading the "Rerata" column from sheet_config.
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
