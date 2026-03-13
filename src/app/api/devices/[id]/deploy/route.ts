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

        // 3. Create the Shell Script in Intune
        // Note: Graph API for Shell Scripts is /deviceManagement/deviceShellScripts
        const shellScript = {
            displayName: `EQN Pro Agent Deployment - ${new Date().toISOString()}`,
            description: `Automated deployment of EQN Pro Agent to device ${deviceId}`,
            scriptContent: Buffer.from(scriptContent).toString('base64'),
            runAsAccount: 'system',
            fileName: 'EQN-Pro-Deploy.ps1',
            roleScopeTagIds: ['0']
        };

        console.log('[API] Creating Intune PowerShell Script...');
        // We use the beta endpoint because direct device assignment (configurationManagerExternalDeviceTarget) is a beta feature
        const createdScript = await client.api('/deviceManagement/deviceManagementScripts').version('beta').post(shellScript);
        const scriptId = createdScript.id;
        console.log(`[API] Script created successfully with ID: ${scriptId}`);
        
        // 4. Wait for propagation (Graph indexing takes a few seconds)
        console.log('[API] Waiting 3 seconds for script propagation...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 5. Assign the script to the specific device
        const assignment = {
            assignments: [
                {
                    target: {
                        "@odata.type": "#microsoft.graph.configurationManagerExternalDeviceTarget",
                        "managedDeviceId": deviceId
                    }
                }
            ]
        };

        let assigned = false;
        let lastErr = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`[API] Assignment attempt ${attempt} for script ${scriptId} to device ${deviceId}...`);
                await client.api(`/deviceManagement/deviceManagementScripts/${scriptId}/assign`).version('beta').post(assignment);
                assigned = true;
                break;
            } catch (err: any) {
                lastErr = err;
                console.warn(`[API] Assignment attempt ${attempt} failed:`, err.message);
                if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        if (!assigned) throw lastErr || new Error('All assignment attempts failed');

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
