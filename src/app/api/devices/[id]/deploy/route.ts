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

        // 3. Create the Shell Script in Intune
        console.log('[API] Creating Intune PowerShell Script (Multi-step Deployment)...');
        
        const shellScript = {
            "@odata.type": "#microsoft.graph.deviceManagementScript",
            displayName: `EQN Pro Agent Deployment - ${new Date().toISOString()}`,
            description: `Automated deployment of EQN Pro Agent to device ${deviceId}`,
            scriptContent: Buffer.from(scriptContent).toString('base64'),
            runAsAccount: 'system',
            fileName: 'EQN-Pro-Agent-v2.ps1',
            roleScopeTagIds: ['0'],
            runAs64Bit: true,
            enforceSignatureCheck: false
        };

        // Create script object
        const createdScript = await client.api('/deviceManagement/deviceManagementScripts')
            .version('beta')
            .post(shellScript);
            
        const scriptId = createdScript.id;
        console.log(`[API] Script created successfully with ID: ${scriptId}. Waiting for propagation...`);
        
        // 4. Wait for propagation (Intune indexing buffer)
        await new Promise(resolve => setTimeout(resolve, 10000));

        // 5. Assign the script directly to the managed device
        const assignment = {
            deviceManagementScriptAssignments: [
                {
                    target: {
                        "@odata.type": "#microsoft.graph.configurationManagerExternalDeviceTarget",
                        "managedDeviceId": deviceId
                    }
                }
            ]
        };

        let assigned = false;
        let lastError = '';

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`[API] Deployment assignment attempt ${attempt} for ${deviceId}...`);
                await client.api(`/deviceManagement/deviceManagementScripts/${scriptId}/assign`)
                    .version('beta')
                    .post(assignment);
                assigned = true;
                break;
            } catch (err: any) {
                lastError = err.body ? JSON.stringify(err.body) : err.message;
                console.warn(`[API] Assignment attempt ${attempt} failed:`, lastError);
                if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        if (!assigned) {
            throw new Error(`Cloud assignment failed after retries: ${lastError}`);
        }
        
        console.log(`[API] Deployment assignment confirmed for device ${deviceId}`);

        return NextResponse.json({ 
            success: true, 
            message: 'Deployment queued in Intune.',
            scriptId: scriptId
        });

    } catch (error: any) {
        const errorDetails = error.body ? JSON.stringify(error.body) : error.message;
        console.error('[API] Intune Deployment Error:', errorDetails);
        return NextResponse.json(
            { error: "Failed to queue deployment in Intune", details: errorDetails },
            { status: 500 }
        );
    }
}
