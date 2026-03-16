import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const tool = searchParams.get('tool');
        
        let targetPath: string;
        if (tool) {
            // Serve specific tool from the tools directory
            targetPath = path.join(process.cwd(), 'src', 'agent', 'tools', `${tool}.ps1`);
        } else {
            // Fallback to main agent engine
            targetPath = path.join(process.cwd(), 'src', 'agent', 'EQN-Pro-Agent-v2.ps1');
        }

        if (!fs.existsSync(targetPath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const content = fs.readFileSync(targetPath, 'utf8');
        
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
