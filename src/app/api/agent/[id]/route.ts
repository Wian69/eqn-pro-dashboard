import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const deviceId = params.id;
    console.log(`[API] Manual Reset requested for Agent: ${deviceId}`);

    try {
        // 1. Delete the agent record
        const { error: agentError } = await supabase
            .from('agents')
            .delete()
            .eq('device_id', deviceId);

        if (agentError) throw agentError;

        // 2. Delete all related commands to clean up the history
        const { error: cmdError } = await supabase
            .from('commands')
            .delete()
            .eq('device_id', deviceId);

        if (cmdError) throw cmdError;

        console.log(`[API] Agent ${deviceId} and its command history have been purged.`);

        return NextResponse.json({ 
            success: true, 
            message: 'Agent data cleared successfully. Device is ready for redeployment.' 
        });

    } catch (error: any) {
        console.error('[API] Agent Reset Error:', error.message);
        return NextResponse.json(
            { error: "Failed to reset agent", details: error.message },
            { status: 500 }
        );
    }
}
