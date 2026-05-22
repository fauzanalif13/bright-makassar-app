import 'dotenv/config'

import { getAwardeeChartData } from './app/dashboard/fasilitator/actions';
import { createClient } from '@supabase/supabase-js';

async function test() {
    // Alwan Aqil ID
    const spreadsheetId = '1rVgQHMFS4cCvC5xM4HneV7PSBxHqbZqazN3eOmPQMKg'; 
    const month = 10;
    const year = 2024;
    const sheetConfig = {}; // default fallback
    const angkatan = '2023';

    try {
        console.log("Fetching Awardee Chart Data for Alwan - Oct 2024...")
        
        // Let's test the direct helper logic without having to bypass Next.js reqs
        // We'll just fetch AM43 logic directly
        const { getBatchCellValues } = require('./src/lib/googleSheets')
        const ranges = ["'Tahun ke-2'!AM43", "'Tahun ke-2'!AL43"]
        const data = await getBatchCellValues(spreadsheetId, ranges)
        
        console.log("Oct 2024 result from getBatchCellValues (AM vs AL):")
        console.log(data)

    } catch(e) {
        console.error(e)
    }
}
test()
