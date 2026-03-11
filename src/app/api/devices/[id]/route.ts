import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: deviceIdOrId } = await params;
    console.log(`[API] GET /api/devices/${deviceIdOrId} initiated...`);
    try {
        const client = getGraphClient();

        // 1. Try direct ID lookup (Optimistic)
        try {
            console.log(`[API] Attempting direct ID lookup for ${deviceIdOrId}...`);
            const device = await client.api(`/deviceManagement/managedDevices/${deviceIdOrId}`).get();
            return NextResponse.json(device);
        } catch (e) {
            // 2. Try Serial Number Lookup (Fallback)
            console.log(`[API] ID lookup failed, attempting serial number lookup for ${deviceIdOrId}...`);
            const searchRes = await client.api('/deviceManagement/managedDevices')
                .filter(`serialNumber eq '${deviceIdOrId}'`)
                .get();

            if (searchRes.value && searchRes.value.length > 0) {
                console.log(`[API] Found device by serial number.`);
                return NextResponse.json(searchRes.value[0]);
            }
            throw new Error(`Device not found with ID or Serial: ${deviceIdOrId}`);
        }
    } catch (error: any) {
        console.error(`[API] Graph API Error (Device ${deviceIdOrId}):`, error.message);
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const client = getGraphClient();
        const { id: deviceId } = await params;
        const { action, newName } = await request.json();

        let endpoint = `/deviceManagement/managedDevices/${deviceId}`;

        switch (action) {
            case 'rebootNow':
                await client.api(`${endpoint}/rebootNow`).post({});
                break;
            case 'syncDevice':
                await client.api(`${endpoint}/syncDevice`).post({});
                break;
            case 'bootstrapAgent':
                console.log(`Searching for 'EQN' apps in Intune for device ${deviceId}...`);
                try {
                    const apps = await client.api('/deviceAppManagement/mobileApps')
                        .filter("contains(displayName, 'EQN')")
                        .get();

                    if (!apps.value || apps.value.length === 0) {
                        console.warn("Intune App Search Failed: No apps found matching 'EQN'. Falling back to manual Sync trigger.");
                    } else {
                        const app = apps.value[0];
                        console.log(`Found app: ${app.displayName} (${app.id}). Triggering deployment...`);
                        // Here is where assignment logic goes.
                    }
                } catch (apiErr: any) {
                    console.error("App Discovery Error:", apiErr.message);
                }

                // ALWAYS trigger a sync as the fallback/final step
                console.log(`Triggering Sync Pulse for ${deviceId}...`);
                await client.api(`${endpoint}/syncDevice`).post({});
                break;
            case 'setDeviceName':
                await client.api(`${endpoint}/setDeviceName`).post({ deviceName: newName });
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Graph API Error (Device Action):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
