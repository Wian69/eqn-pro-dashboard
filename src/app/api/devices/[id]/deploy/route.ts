import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';
import fs from 'fs';
import path from 'path';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: deviceId } = await params;
    console.log(`[API] Initiating Intune Agent Deployment for Device: ${deviceId}`);

    try {
        const client = getGraphClient();
        
        // 1. Prepare the Deployment Script (v2.0 Global Edition)
        const agentFilePath = path.join(process.cwd(), 'src', 'agent', 'EQN-Pro-Agent-v2.ps1');
        let scriptContent = '';
        
        if (fs.existsSync(agentFilePath)) {
            scriptContent = fs.readFileSync(agentFilePath, 'utf8');
        } else {
            console.warn('[API] v2 Agent not found at path, falling back to v1.3');
            const fallbackPath = path.join(process.cwd(), 'src', 'agent', 'EQN-Pro-Deploy.ps1');
            scriptContent = fs.readFileSync(fallbackPath, 'utf8');
        }

        // 2. Inject dynamic server URL
        // We use the production URL for global reliability
        const serverUrl = 'https://eqn-pro-dashboard.vercel.app/api/agent';
        scriptContent = scriptContent.replace(
            /^\$serverUrl\s*=\s*".*?"(?:\s*#.*)?/m,
            `$serverUrl = "${serverUrl}" # Dynamically injected by EQN Pro API`
        );

        // 3. Execute the script directly on the device via Graph Action
        console.log(`[API] Executing direct v2.0 cloud script on device ${deviceId}...`);
        
        const payload = {
            scriptContent: Buffer.from(scriptContent).toString('base64'),
            runAs64: true,
            enforceSignatureCheck: false,
            runAsAccount: 'system'
        };

        await client.api(`/deviceManagement/managedDevices/${deviceId}/microsoft.graph.runCloudScript`)
            .version('beta')
            .post(payload);
        
        console.log(`[API] Cloud script execution triggered successfully for device ${deviceId}`);

        return NextResponse.json({ 
            success: true, 
            message: 'Deployment triggered successfully via direct cloud action.'
        });

    } catch (error: any) {
        const errorDetails = error.body ? JSON.stringify(error.body) : error.message;
        console.error('[API] Intune Deployment Error:', errorDetails);
        return NextResponse.json(
            { error: "Failed to trigger direct deployment", details: errorDetails },
            { status: 500 }
        );
    }
}
