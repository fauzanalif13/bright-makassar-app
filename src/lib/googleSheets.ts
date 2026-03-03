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
 * Robust date parser for Google Sheets dates.
 * Handles multiple formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD,
 * Google Sheets serial numbers, Indonesian date text, and native Date strings.
 */
function parseSheetDate(raw: any): Date | null {
    if (!raw && raw !== 0) return null
    const s = String(raw).trim()
    if (!s) return null

    // 1. Google Sheets serial number (e.g. 44958)
    const asNum = Number(s)
    if (!isNaN(asNum) && asNum > 30000 && asNum < 100000) {
        // Sheets epoch starts at 1899-12-30
        const epoch = new Date(1899, 11, 30)
        epoch.setDate(epoch.getDate() + asNum)
        return epoch
    }

    // 2. DD/MM/YYYY or DD-MM-YYYY (common Indonesian format)
    const ddmmyyyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (ddmmyyyy) {
        const [, dd, mm, yyyy] = ddmmyyyy
        const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd))
        if (!isNaN(d.getTime())) return d
    }

    // 3. YYYY-MM-DD (ISO format)
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (iso) {
        const d = new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]))
        if (!isNaN(d.getTime())) return d
    }

    // 4. Indonesian text date (e.g. "3 Maret 2026", "15 Januari 2025")
    const BULAN_ID: Record<string, number> = {
        januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
        juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
    }
    const textDate = s.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/i)
    if (textDate) {
        const monthIdx = BULAN_ID[textDate[2].toLowerCase()]
        if (monthIdx !== undefined) {
            return new Date(parseInt(textDate[3]), monthIdx, parseInt(textDate[1]))
        }
    }

    // 5. Fallback: native Date parser (handles MM/DD/YYYY, English dates, etc.)
    const fallback = new Date(s)
    if (!isNaN(fallback.getTime())) return fallback

    return null
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
    } catch (err: any) {
        console.error(`[getIbadahMonthlyAverage] Failed to fetch "${range}":`, err.message)
        return Object.fromEntries(
            IBADAH_ACTIVITIES.map((a) => [a, 0])
        ) as IbadahAverage;
    }

    const dataRows = rows.slice(1);
    console.log(`[getIbadahMonthlyAverage] Sheet: "${sheetName}", total data rows: ${dataRows.length}, looking for month=${currentMonth} year=${currentYear}`)

    // Log first 3 date samples to help debug date format issues
    if (dataRows.length > 0) {
        const samples = dataRows.slice(0, 3).map(r => r[0])
        console.log(`[getIbadahMonthlyAverage] Date samples from sheet:`, samples)
    }

    const monthRows = dataRows.filter((row) => {
        if (!row[0]) return false
        const date = parseSheetDate(row[0])
        if (!date) {
            // Only warn once per unique format to avoid log spam
            return false
        }
        return (
            date.getMonth() + 1 === currentMonth &&
            date.getFullYear() === currentYear
        );
    });

    console.log(`[getIbadahMonthlyAverage] Matched ${monthRows.length} rows for ${currentMonth}/${currentYear}`)

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

    console.log(`[getIbadahMonthlyAverage] Results for ${currentMonth}/${currentYear}:`, averages)
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
        const date = parseSheetDate(row[0]);
        if (!date) continue;
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
    }

    return dailyRows.sort((a, b) => a.day - b.day);
}

/**
 * Fetch monthly TOTALS (raw sums, not percentages) for each worship activity.
 * Used by the comparison chart's Bulanan (monthly) mode.
 *
 * Returns an array of { aktivitas, total } for each of the 8 activities.
 */
export async function getIbadahMonthlyTotals(
    spreadsheetId: string,
    sheetName: string,
    month: number,
    year: number
): Promise<{ aktivitas: string; total: number }[]> {
    const range = `${sheetName}!A:I`;

    let rows: string[][];
    try {
        rows = await getSheetData(spreadsheetId, range);
    } catch {
        return IBADAH_ACTIVITIES.map(a => ({ aktivitas: a, total: 0 }));
    }

    const dataRows = rows.slice(1);

    // Filter rows belonging to the target month/year
    const monthRows = dataRows.filter((row) => {
        if (!row[0]) return false;
        try {
            const date = new Date(row[0]);
            return date.getMonth() + 1 === month && date.getFullYear() === year;
        } catch { return false; }
    });

    // Sum each activity column
    const sums = new Array(8).fill(0);
    for (const row of monthRows) {
        for (let col = 1; col <= 8; col++) {
            sums[col - 1] += cellToNumber(row[col]);
        }
    }

    return IBADAH_ACTIVITIES.map((a, i) => ({ aktivitas: a, total: sums[i] }));
}

/**
 * Fetch daily worship data from the daily block grid in a sheet.
 * Uses the block range (e.g. "G13:AK20") to read 8 rows × 31 columns.
 *
 * Returns an array of per-day entries with values for each activity.
 * Used by the comparison chart's Harian (daily) mode.
 */
export async function getIbadahDailyBlockData(
    spreadsheetId: string,
    sheetName: string,
    blockRange: string
): Promise<{ day: number; values: Record<string, number> }[]> {
    const fullRange = `${sheetName}!${blockRange}`;

    let rows: string[][];
    try {
        rows = await getSheetData(spreadsheetId, fullRange);
    } catch {
        return [];
    }

    if (rows.length < 1) return [];

    // Each row = one activity, each column = one day (up to 31)
    const numDays = Math.min(rows[0]?.length || 0, 31);
    const result: { day: number; values: Record<string, number> }[] = [];

    for (let dayIdx = 0; dayIdx < numDays; dayIdx++) {
        const values: Record<string, number> = {};
        for (let actIdx = 0; actIdx < IBADAH_ACTIVITIES.length && actIdx < rows.length; actIdx++) {
            values[IBADAH_ACTIVITIES[actIdx]] = cellToNumber(rows[actIdx]?.[dayIdx]);
        }
        result.push({ day: dayIdx + 1, values });
    }

    return result;
}

/**
 * Fetch per-activity ibadah percentage values from a "Tahun ke-X" sheet.
 *
 * Reads individual cells specified in `categoryCells` — one cell per category.
 * For example: { "Sholat Jama'ah": "AL13", "Qiyamul Lail": "AL14", ... }
 *
 * @param spreadsheetId - Google Sheets spreadsheet ID
 * @param sheetName - Sheet name, e.g. "Tahun ke-1"
 * @param categoryCells - Mapping of category label → cell reference (e.g. "AL13")
 * @returns Record of IBADAH_ACTIVITIES label → percentage value (0-100)
 */
export async function getIbadahRerataPerActivity(
    spreadsheetId: string,
    sheetName: string,
    categoryCells: Record<string, string>
): Promise<Record<IbadahActivity, number>> {
    const categories = Object.keys(categoryCells)
    if (categories.length === 0) {
        console.warn(`[getIbadahRerataPerActivity] No category cells provided`)
        return Object.fromEntries(IBADAH_ACTIVITIES.map(a => [a, 0])) as Record<IbadahActivity, number>
    }

    // Build fully qualified ranges: "'Tahun ke-1'!AL13", "'Tahun ke-1'!AL14", ...
    const ranges = categories.map(cat => `'${sheetName}'!${categoryCells[cat]}`)
    console.log(`[getIbadahRerataPerActivity] Sheet: "${sheetName}", reading ${ranges.length} cells:`, categoryCells)

    try {
        const values = await getBatchCellValues(spreadsheetId, ranges)
        console.log(`[getIbadahRerataPerActivity] Raw values:`, values)

        // Map category labels to IBADAH_ACTIVITIES names (handle slight naming differences)
        const LABEL_TO_ACTIVITY: Record<string, IbadahActivity> = {
            "Sholat Jama'ah": "Shalat Berjama'ah",
            'Qiyamul Lail': 'Qiyamul Lail',
            'Dzikir Pagi': 'Dzikir Pagi',
            'Mendoakan/Memaafkan': "Mendo'akan",
            'Sholat Dhuha': 'Shalat Dhuha',
            'Membaca Al Quran': 'Membaca Al-Quran',
            'Shaum Sunnah': 'Shaum Sunnah',
            'Berinfak': 'Berinfak',
        }

        const result: Record<IbadahActivity, number> = Object.fromEntries(
            IBADAH_ACTIVITIES.map(a => [a, 0])
        ) as Record<IbadahActivity, number>

        for (let i = 0; i < categories.length; i++) {
            const catLabel = categories[i]
            const activityKey = LABEL_TO_ACTIVITY[catLabel] || catLabel as IbadahActivity
            const rawVal = values[i]
            const num = cellToNumber(rawVal)
            // Values may be 0-100 or 0-1 fraction — handle both
            result[activityKey] = num > 1 ? Math.round(num) : Math.round(num * 100)
        }

        console.log(`[getIbadahRerataPerActivity] Parsed result:`, result)
        return result
    } catch (err: any) {
        console.error(`[getIbadahRerataPerActivity] Error:`, err.message)
        return Object.fromEntries(IBADAH_ACTIVITIES.map(a => [a, 0])) as Record<IbadahActivity, number>
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

// ═══════════════════════════════════════════════════════════════════════
// WRITE OPERATIONS — Fixed Grid (Ibadah) & Dynamic Table (Resume)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Batch-update multiple ranges in a Google Sheet in a single API call.
 * Used for Ibadah fixed-grid updates where users change multiple cells at once.
 *
 * @example
 * await updateFixedGrid(spreadsheetId, [
 *   { range: "'Tahun ke-1'!H13", values: [[3]] },
 *   { range: "'Tahun ke-1'!I14", values: [[1]] },
 * ]);
 */
export async function updateFixedGrid(
    spreadsheetId: string,
    data: { range: string; values: (string | number | boolean)[][] }[]
): Promise<void> {
    if (!data.length) return;

    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: data.map((d) => ({
                range: d.range,
                values: d.values,
            })),
        },
    });
}

/**
 * Resolve a sheet's string name to its numeric sheetId.
 * Required by insertDimension which needs the numeric ID, not the name.
 *
 * @throws Error if the sheet name is not found in the spreadsheet.
 */
async function getSheetId(
    spreadsheetId: string,
    sheetName: string
): Promise<number> {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties',
    });

    const sheetsList = response.data.sheets || [];
    const match = sheetsList.find(
        (s) => s.properties?.title === sheetName
    );

    if (!match || match.properties?.sheetId == null) {
        throw new Error(
            `Sheet "${sheetName}" not found in spreadsheet "${spreadsheetId}". ` +
            `Available sheets: ${sheetsList.map((s) => s.properties?.title).join(', ')}`
        );
    }

    return match.properties!.sheetId!;
}

/**
 * Find the bottom row of a specific stacked table in the Resume sheet.
 *
 * Scans columns A and B for the anchorText (e.g. "Riwayat Organisasi"),
 * then walks down to find the last filled row of that table.
 *
 * @param spreadsheetId - Google Sheets spreadsheet ID
 * @param sheetName     - Sheet name (e.g. "Resume")
 * @param anchorText    - Table header text (e.g. "Riwayat Organisasi", "Social Project")
 * @returns 1-based row index where a new row should be INSERTED
 *
 * @throws Error if anchorText is not found (fail-safe: never insert at random position)
 */
export async function findTableBottom(
    spreadsheetId: string,
    sheetName: string,
    anchorText: string
): Promise<number> {
    // 1. Fetch columns A and B of the entire sheet
    const rows = await getSheetData(spreadsheetId, `'${sheetName}'!A:B`);

    if (!rows.length) {
        throw new Error(
            `Sheet "${sheetName}" is empty — cannot find anchor "${anchorText}".`
        );
    }

    // 2. Find the anchor row (case-insensitive trim match in col A or B)
    const normalizedAnchor = anchorText.trim().toLowerCase();
    let anchorRowIdx = -1;

    for (let i = 0; i < rows.length; i++) {
        const cellA = (rows[i][0] || '').trim().toLowerCase();
        const cellB = (rows[i][1] || '').trim().toLowerCase();

        if (cellA === normalizedAnchor || cellB === normalizedAnchor) {
            anchorRowIdx = i;
            break;
        }
    }

    if (anchorRowIdx === -1) {
        throw new Error(
            `Anchor text "${anchorText}" not found in sheet "${sheetName}". ` +
            `Searched ${rows.length} rows in columns A and B. ` +
            `Refusing to insert — check the exact header text in the spreadsheet.`
        );
    }

    console.log(
        `[findTableBottom] Found anchor "${anchorText}" at row ${anchorRowIdx + 1} (0-based: ${anchorRowIdx})`
    );

    // 3. Walk down from anchor+1 to find the last filled row of this table
    let lastFilledRow = anchorRowIdx; // start at anchor itself

    for (let i = anchorRowIdx + 1; i < rows.length; i++) {
        const cellA = (rows[i][0] || '').trim();
        const cellB = (rows[i][1] || '').trim();

        // Stop if both columns are empty (end of this table section)
        if (!cellA && !cellB) break;

        lastFilledRow = i;
    }

    // 4. The insertion point is right after the last filled row (1-based)
    const insertionRow = lastFilledRow + 2; // +1 for 0→1 based, +1 for "after"

    console.log(
        `[findTableBottom] Table "${anchorText}" last filled at row ${lastFilledRow + 1}, ` +
        `insertion point: row ${insertionRow}`
    );

    return insertionRow;
}

/**
 * Insert a new row into a specific stacked table in the Resume sheet
 * and write data into it. Uses anchor-based positioning to avoid
 * corrupting adjacent tables.
 *
 * @param spreadsheetId - Google Sheets spreadsheet ID
 * @param sheetName     - Sheet name (e.g. "Resume")
 * @param anchorText    - Table header text (e.g. "Riwayat Organisasi")
 * @param newDataArray  - Array of cell values for the new row
 *                        (e.g. ["2026", "Nama Kegiatan", "Deskripsi", "https://link"])
 * @returns Object with the 1-based row index where data was inserted
 *
 * @throws Error if anchorText not found, sheet doesn't exist, or newDataArray is empty
 */
export async function insertAndWriteResumeData(
    spreadsheetId: string,
    sheetName: string,
    anchorText: string,
    newDataArray: (string | number | boolean)[]
): Promise<{ insertedAtRow: number }> {
    // Validate input
    if (!newDataArray || newDataArray.length === 0) {
        throw new Error(
            'newDataArray must not be empty — refusing to insert a blank row.'
        );
    }

    // 1. Find where to insert
    const targetRow = await findTableBottom(spreadsheetId, sheetName, anchorText);

    console.log(
        `[insertAndWriteResumeData] Will insert at row ${targetRow} for table "${anchorText}"`
    );

    // 2. Resolve numeric sheet ID (needed for insertDimension)
    const sheetId = await getSheetId(spreadsheetId, sheetName);

    // 3. Insert a blank row at the target position
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [
                {
                    insertDimension: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: targetRow - 1, // API uses 0-based index
                            endIndex: targetRow,       // exclusive — inserts exactly 1 row
                        },
                        inheritFromBefore: true, // copy formatting from row above
                    },
                },
            ],
        },
    });

    console.log(
        `[insertAndWriteResumeData] Inserted blank row at position ${targetRow}`
    );

    // 4. Write data into the newly created row
    const writeRange = `'${sheetName}'!A${targetRow}`;
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: writeRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [newDataArray],
        },
    });

    console.log(
        `[insertAndWriteResumeData] Wrote ${newDataArray.length} cells to ${writeRange}`
    );

    return { insertedAtRow: targetRow };
}

/**
 * Count the number of data rows under a specific table anchor in a sheet.
 * Useful for dynamically computing achievement counts (e.g. "Pembinaan: 42")
 * without relying on a static range that can break when rows are inserted.
 *
 * @param spreadsheetId - Google Sheets spreadsheet ID
 * @param sheetName     - Sheet name (e.g. "Resume")
 * @param anchorText    - Table header text (e.g. "Pembinaan S/H Skills")
 * @param skipHeaderRows - Number of header rows to skip after the anchor (default: 1)
 * @returns Number of data rows in the table (excludes anchor and header rows)
 */
export async function countTableRows(
    spreadsheetId: string,
    sheetName: string,
    anchorText: string,
    skipHeaderRows: number = 1
): Promise<number> {
    try {
        const rows = await getSheetData(spreadsheetId, `'${sheetName}'!A:B`);

        // Find anchor
        const normalizedAnchor = anchorText.trim().toLowerCase();
        let anchorIdx = -1;
        for (let i = 0; i < rows.length; i++) {
            const cellA = (rows[i][0] || '').trim().toLowerCase();
            const cellB = (rows[i][1] || '').trim().toLowerCase();
            if (cellA === normalizedAnchor || cellB === normalizedAnchor) {
                anchorIdx = i;
                break;
            }
        }

        if (anchorIdx === -1) return 0;

        // Count data rows (skip anchor + header rows)
        const dataStart = anchorIdx + 1 + skipHeaderRows;
        let count = 0;

        for (let i = dataStart; i < rows.length; i++) {
            const cellA = (rows[i][0] || '').trim();
            const cellB = (rows[i][1] || '').trim();
            if (!cellA && !cellB) break;
            count++;
        }

        return count;
    } catch (err) {
        console.error(`[countTableRows] Error counting "${anchorText}":`, err);
        return 0;
    }
}

