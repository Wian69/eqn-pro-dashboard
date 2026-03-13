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
        // We use the Intune-optimized version of the script
        const scriptPath = path.join(process.cwd(), 'src/agent/intune-package/EQN-Pro-Deploy.ps1');
        if (!fs.existsSync(scriptPath)) {
            throw new Error('Deployment script template not found.');
        }

        let scriptContent = fs.readFileSync(scriptPath, 'utf8');

        // 2. Inject dynamic server URL if needed
        // The script already has a default, but we can override it based on the current host
        const host = request.headers.get('host');
        const protocol = host?.includes('localhost') ? 'http' : 'https';
        const serverUrl = `${protocol}://${host}/api/agent`;
        
        // Replace the default serverUrl in the script
        scriptContent = scriptContent.replace(
            /\$serverUrl = "https:\/\/eqn-pro-dashboard\.vercel\.app\/api\/agent"/g, 
            `$serverUrl = "${serverUrl}"`
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

        // 4. Assign the script to the specific device
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

        console.log(`[API] Assigning script ${scriptId} to device ${deviceId}...`);
        await client.api(`/deviceManagement/deviceManagementScripts/${scriptId}/assign`).version('beta').post(assignment);

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
