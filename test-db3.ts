import { createClient } from './src/utils/supabase/server';

async function run() {
    const supabase = await createClient();
    const { data } = await supabase.from('roles_pengguna').select('sheet_config').eq('email', 'elmukminn01@gmail.com').single();
    if (data) console.log("Config:", JSON.stringify(data.sheet_config, null, 2));
}
run().catch(console.error);
