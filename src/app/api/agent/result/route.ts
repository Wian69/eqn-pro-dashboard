import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { deviceId, commandId, status, output, error } = await request.json();
        if (!deviceId || !commandId) return NextResponse.json({ error: 'Missing deviceId or commandId' }, { status: 400 });

        const { error: updateError } = await supabase
            .from('commands')
            .update({
                status,
                output,
                error,
                completed_at: new Date().toISOString()
            })
            .eq('id', commandId)
            .eq('device_id', deviceId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API] POST /api/agent/result error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
