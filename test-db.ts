import { createClient } from './src/utils/supabase/server';

async function run() {
    const supabase = await createClient();
    const { data } = await supabase.from('roles_pengguna').select('email, angkatan, sheet_config', { count: 'exact' });
    console.log("DB DATA:", JSON.stringify(data, null, 2));
}
run().catch(console.error);
