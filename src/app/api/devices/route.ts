import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function GET() {
    try {
        const client = getGraphClient();

        // Fetch managed devices from Intune
        const devicesResponse = await client.api('/deviceManagement/managedDevices')
            .select('id,deviceName,operatingSystem,complianceState,lastSyncDateTime')
            .get();

        return NextResponse.json({
            devices: devicesResponse.value,
            active: devicesResponse.value.filter((d: any) => d.complianceState === 'compliant'),
        });
    } catch (error: any) {
        console.error('Graph API Error (Devices):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
