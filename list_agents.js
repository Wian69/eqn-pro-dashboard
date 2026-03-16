
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://arpmrhvnsvdwcgylsqut.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFycG1yaHZuc3Zkd2NneWxzcXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjk5MDAsImV4cCI6MjA4ODgwNTkwMH0.bOHsGIqGxLQ3yrzLfvk_LKH5s3LmWbuvzqU8zCrIcpk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listAllAgents() {
    try {
        const { data, error } = await supabase
            .from('agents')
            .select('device_id, hostname, last_seen, status');
        
        if (error) throw error;
        
        console.log("Total Agents in Database:", data.length);
        console.table(data);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

listAllAgents();
