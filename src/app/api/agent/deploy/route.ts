import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('id') || 'UNKNOWN';
    const serverUrl = 'http://localhost:3000/api/agent';

    try {
        // Read the master deployment script
        const scriptPath = path.join(process.cwd(), 'src/agent/EQN-Pro-Deploy.ps1');
        let script = fs.readFileSync(scriptPath, 'utf8');

        // Inject the specific device ID and server URL
        script = script.replace('$deviceId = (Get-CimInstance Win32_BIOS).SerialNumber', `$deviceId = "${deviceId}"`);
        script = script.replace('$serverUrl = "http://localhost:3000/api/agent"', `$serverUrl = "${serverUrl}"`);

        return new NextResponse(script, {
            headers: {
                'Content-Type': 'text/plain',
            },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Deployment script not found' }, { status: 404 });
    }
}
