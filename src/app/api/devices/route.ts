import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log('[API] GET /api/devices initiated...');
    try {
        const client = getGraphClient();
        console.log('[API] Graph client obtained, fetching devices...');

        // Fetch managed devices from Intune
        const devicesResponse = await client.api('/deviceManagement/managedDevices')
            .select('id,deviceName,operatingSystem,complianceState,lastSyncDateTime,serialNumber')
            .get();

        console.log(`[API] Successfully fetched ${devicesResponse.value?.length || 0} devices from Graph.`);

        const devices = devicesResponse.value || [];
        return NextResponse.json({
            devices: devices,
            active: devices.filter((d: any) => d.complianceState === 'compliant'),
        });
    } catch (error: any) {
        console.error('[API] Graph API Error (Devices):', error.message, error.stack);
        return NextResponse.json(
            { error: "Failed to fetch devices from Intune", details: error.message },
            { status: 500 }
        );
    }
}
