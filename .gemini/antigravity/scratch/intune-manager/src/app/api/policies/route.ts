import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graphClient';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const deviceId = searchParams.get('deviceId');

        if (!deviceId) {
            return NextResponse.json({ error: "Missing deviceId parameter" }, { status: 400 });
        }

        const client = getGraphClient();

        // Fetch Device Configuration States
        const configStatesResponse = await client
            .api(`/deviceManagement/managedDevices/${deviceId}/deviceConfigurationStates`)
            .get();

        // Fetch Device Compliance Policy States
        const complianceStatesResponse = await client
            .api(`/deviceManagement/managedDevices/${deviceId}/deviceCompliancePolicyStates`)
            .get();

        return NextResponse.json({
            configurations: configStatesResponse.value || [],
            compliance: complianceStatesResponse.value || []
        });
    } catch (error: any) {
        console.error('Error fetching policies:', JSON.stringify(error, null, 2));
        return NextResponse.json({ error: error.message || 'Failed to fetch policies' }, { status: error.statusCode || 500 });
    }
}
