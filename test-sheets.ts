import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
let clientEmail = '';
let privateKey = '';

envContent.split('\n').forEach(line => {
    if (line.startsWith('GOOGLE_CLIENT_EMAIL=')) clientEmail = line.split('=')[1].replace(/"/g, '').trim();
    if (line.startsWith('GOOGLE_PRIVATE_KEY=')) privateKey = line.split('=')[1].replace(/"/g, '').replace(/\\n/g, '\n').trim();
});

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: clientEmail,
        private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function run() {
    try {
        const spreadsheetId = '1l9yPTyIBXOTWgbtSPaDPiPE1cILvjnbZkchQMUV-d1U';
        console.log(`Fetching metadata for ${spreadsheetId}...`);

        const res = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetNames = res.data.sheets?.map(s => s.properties?.title) || [];
        console.log("Sheet names in doc:", sheetNames);

        // Let's try to fetch Tahun ke-4!G63:AK70
        try {
            console.log("\nFetching Tahun ke-4!G63:AK70...");
            const data = await sheets.spreadsheets.values.get({ spreadsheetId, range: "'Tahun ke-4'!G63:AK70" });
            console.log("Data length:", data.data.values?.length || 0);
            if (data.data.values) console.log("First row preview:", data.data.values[0].join(', '));
        } catch (err: any) {
            console.log("Fetch Tahun ke-4 ERROR:", err.message);
        }

    } catch (err: any) {
        console.error("Crash:", err.message);
    }
}
run();
