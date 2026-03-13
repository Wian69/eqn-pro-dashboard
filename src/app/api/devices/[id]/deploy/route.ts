import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';
import fs from 'fs';
import path from 'path';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const deviceId = params.id;
    console.log(`[API] Initiating Intune Agent Deployment for Device: ${deviceId}`);

    try {
        const client = getGraphClient();
        
        // 1. Prepare the deployment script
        // We use the unified version of the script
        const scriptPath = path.join(process.cwd(), 'src/agent/EQN-Pro-Deploy.ps1');
        if (!fs.existsSync(scriptPath)) {
            throw new Error('Deployment script template not found.');
        }

        let scriptContent = fs.readFileSync(scriptPath, 'utf8');

        // 2. Inject dynamic server URL if needed
        const host = request.headers.get('host');
        const protocol = host?.includes('localhost') ? 'http' : 'https';
        const serverUrl = `${protocol}://${host}/api/agent`;
        
        // Replace the serverUrl in the script with a robust regex
        // Matches $serverUrl = "..." with optional trailing spaces and comments
        scriptContent = scriptContent.replace(
            /\$serverUrl = "https:\/\/.*?"\s*(#.*)?/g, 
            `$serverUrl = "${serverUrl}" # Dynamically injected by EQN Pro API`
        );

        // 3. Execute the script directly on the device
        // This is a direct action that doesn't require creating a script object or assignment
        console.log(`[API] Executing direct cloud script on device ${deviceId}...`);
        
        const payload = {
            scriptContent: Buffer.from(scriptContent).toString('base64'),
            runAs64: true,
            enforceSignatureCheck: false,
            runAsAccount: 'system'
        };

        try {
            await client.api(`/deviceManagement/managedDevices/${deviceId}/microsoft.graph.executeCloudScript`)
                .version('beta')
                .post(payload);
            
            console.log(`[API] Cloud script execution triggered successfully for device ${deviceId}`);
        } catch (err: any) {
            console.error('[API] Action Error:', err.message, err.body);
            throw err;
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Deployment queued in Intune.',
            scriptId: scriptId
        });

    } catch (error: any) {
        console.error('[API] Intune Deployment Error:', error.message);
        return NextResponse.json(
            { error: "Failed to queue deployment in Intune", details: error.message },
            { status: 500 }
        );
    }
}
