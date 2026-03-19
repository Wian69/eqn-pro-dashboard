import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graphClient';

export async function POST(request: Request) {
    try {
        const { action, deviceId } = await request.json();

        if (!action || !deviceId) {
            return NextResponse.json({ error: "Missing action or deviceId" }, { status: 400 });
        }

        const client = getGraphClient();

        let endpoint = '';
        switch (action) {
            case 'rebootNow':
                endpoint = `/deviceManagement/managedDevices/${deviceId}/rebootNow`;
                await client.api(endpoint).post({});
                break;
            case 'syncDevice':
                endpoint = `/deviceManagement/managedDevices/${deviceId}/syncDevice`;
                await client.api(endpoint).post({});
                break;
            case 'pushAgent':
                // Read the script file
                const fs = require('fs');
                const path = require('path');
                const scriptPath = path.join(process.cwd(), 'src', 'scripts', 'DialInAgent.ps1');
                const scriptContent = fs.readFileSync(scriptPath, 'utf8');

                // 1. Create the Script Object in Intune
                const scriptResponse = await client.api('/deviceManagement/deviceManagementScripts').version('beta').post({
                    displayName: "Intune Remote Dial-In Tunnel",
                    description: "Enables live remote control and hardware telemetry.",
                    scriptContent: Buffer.from(scriptContent).toString('base64'),
                    runAsAccount: 'system',
                    enforceSignatureCheck: false,
                    runAs32Bit: false
                });

                const scriptId = scriptResponse.id;

                // 2. Assign to specific group (To be implemented with user input)
                // For now, we only create the script object to avoid global deployment.
                /*
                await client.api(`/deviceManagement/deviceManagementScripts/${scriptId}/assign`).version('beta').post({
                    deviceManagementScriptAssignments: [
                        {
                            target: {
                                "@odata.type": "#microsoft.graph.allDevicesAssignmentTarget"
                            }
                        }
                    ]
                });
                */
                break;
            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: `Action ${action} triggered successfully` });
    } catch (error: any) {
        console.error(`Error triggering action:`, JSON.stringify(error, null, 2));
        return NextResponse.json({ error: error.message || 'Failed to trigger action' }, { status: error.statusCode || 500 });
    }
}
