require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

async function test() {
    // Alwan Aqil ID
    const spreadsheetId = '1rVgQHMFS4cCvC5xM4HneV7PSBxHqbZqazN3eOmPQMKg'; 
    const sheetName = 'Tahun ke-2'; // From screenshot, Okt 24 is in Tahun ke-2!AN6 
    // Wait, the screenshot shows "Okt 24" as column AN.
    // In our ibadahDefaults, Okt is AM43 (which is AM, 1 column before AN).
    // Let's just fetch the whole grid of AL-AN for row 6 to 50
    const range = `${sheetName}!AL1:AN50`;

    try {
        console.log(`Fetching ${range}...`)
        
        // This won't work perfectly without the auth setup, let's just make a script that uses the next.js environment
    } catch(e) {
        console.error(e)
    }
}
test()
