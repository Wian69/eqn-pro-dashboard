
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data: agents, error } = await supabase
            .from('agents')
            .select('device_id, hostname, last_seen, status, agent_version');

        if (error) throw error;

        return NextResponse.json({
            count: agents.length,
            agents: agents
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
