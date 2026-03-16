
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://arpmrhvnsvdwcgylsqut.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFycG1yaHZuc3Zkd2NneWxzcXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjk5MDAsImV4cCI6MjA4ODgwNTkwMH0.bOHsGIqGxLQ3yrzLfvk_LKH5s3LmWbuvzqU8zCrIcpk';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check16() {
    const { data } = await supabase.from('agents').select('hostname, last_seen').eq('hostname', 'EQNCSLT016').single();
    console.log("EQNCSLT016 STATUS:");
    console.table(data);
}
check16();
