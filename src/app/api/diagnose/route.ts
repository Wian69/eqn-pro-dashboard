
import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function GET() {
    try {
        const client = getGraphClient();
        console.log("[DIAG] Fetching managed devices...");
        const devices = await client.api('/deviceManagement/managedDevices').top(1).get();
        
        if (!devices.value || devices.value.length === 0) {
            return NextResponse.json({ error: "No managed devices found in Intune." });
        }

        const deviceId = devices.value[0].id;
        console.log(`[DIAG] Investigating device: ${deviceId}`);

        // Fetch Beta metadata
        const fullDevice = await client.api(`/deviceManagement/managedDevices/${deviceId}`)
            .version('beta')
            .get();

        return NextResponse.json({
            deviceId,
            model: fullDevice.model,
            os: fullDevice.osVersion,
            keys: Object.keys(fullDevice),
            actions: Object.keys(fullDevice).filter(k => 
                k.toLowerCase().includes('action') || 
                k.toLowerCase().includes('script') ||
                k.startsWith('microsoft.graph.')
            )
        });

    } catch (error: any) {
        return NextResponse.json({ 
            error: error.message, 
            details: error.body ? JSON.stringify(error.body) : null 
        }, { status: 500 });
    }
}
