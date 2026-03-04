import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data } = await supabase.from('roles_pengguna').select('email, angkatan, spreadsheet_id, sheet_config').eq('role', 'awardee').limit(1);
    console.log("Found Awardee:", JSON.stringify({
        email: data?.[0]?.email,
        angkatan: data?.[0]?.angkatan,
        spreadsheet_id: data?.[0]?.spreadsheet_id
    }));

    // We can't easily run the backend google sheets code here because of next.js aliases,
    // so let's log the details so we can understand the data.
}
run();
