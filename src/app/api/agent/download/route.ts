import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const tool = searchParams.get('tool');

        if (tool) {
            // Try to serve tool from filesystem (local dev), then fall back to 404
            const toolPath = path.join(process.cwd(), 'src', 'agent', 'tools', `${tool}.ps1`);
            if (fs.existsSync(toolPath)) {
                const content = fs.readFileSync(toolPath, 'utf8');
                return new Response(content, {
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Cache-Control': 'no-cache, no-store, must-revalidate'
                    }
                });
            }
            return NextResponse.json({ error: `Tool '${tool}' not found` }, { status: 404 });
        }

        // Serve the main agent engine from latest_agent.json
        // This file is bundled with the Vercel deployment (unlike raw .ps1 files)
        const manifestPath = path.join(process.cwd(), 'latest_agent.json');
        if (!fs.existsSync(manifestPath)) {
            return NextResponse.json({ error: 'Agent manifest not found' }, { status: 404 });
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (!manifest.code || manifest.code.length < 100) {
            return NextResponse.json({ error: 'Agent code missing from manifest' }, { status: 500 });
        }

        return new Response(manifest.code, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'X-Agent-Version': manifest.version || 'unknown'
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
