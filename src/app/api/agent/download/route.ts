import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const agentPath = path.join(process.cwd(), 'src', 'agent', 'EQN-Pro-Agent-v2.ps1');
        if (!fs.existsSync(agentPath)) {
            return NextResponse.json({ error: 'Agent engine not found' }, { status: 404 });
        }

        const content = fs.readFileSync(agentPath, 'utf8');
        
        // Return as plain text for easy PowerShell consumption
        return new Response(content, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
