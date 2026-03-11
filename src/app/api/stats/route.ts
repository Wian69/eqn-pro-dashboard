import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function GET() {
    try {
        const client = getGraphClient();

        const [users, devices, security] = await Promise.all([
            client.api('/users').count().get(),
            client.api('/deviceManagement/managedDevices').count().get(),
            client.api('/security/secureScores').top(1).get(),
        ]);

        return NextResponse.json({
            userCount: users['@odata.count'] || 0,
            deviceCount: devices['@odata.count'] || 0,
            secureScore: security.value[0]?.currentScore || 0,
        });
    } catch (error: any) {
        console.error('Graph API Error (Stats):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
