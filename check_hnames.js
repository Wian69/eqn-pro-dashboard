
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://arpmrhvnsvdwcgylsqut.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFycG1yaHZuc3Zkd2NneWxzcXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjk5MDAsImV4cCI6MjA4ODgwNTkwMH0.bOHsGIqGxLQ3yrzLfvk_LKH5s3LmWbuvzqU8zCrIcpk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSpecificDevices() {
    const targets = ['eqncslt015', 'eqncslt001'];
    console.log("Checking for hostnames:", targets);
    try {
        const { data, error } = await supabase
            .from('agents')
            .select('device_id, hostname, last_seen, status')
            .in('hostname', targets);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            console.log("Found matching agents in database:");
            console.table(data);
        } else {
            console.log("No agents found with those hostnames in the database.");
            
            // Check for partial matches just in case
            const { data: all } = await supabase.from('agents').select('hostname').limit(10);
            console.log("Sample hostnames in DB:", all.map(a => a.hostname));
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkSpecificDevices();
