import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const AGENTS_FILE = path.join(process.cwd(), 'agents.json');

function readAgents() {
    if (!fs.existsSync(AGENTS_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf-8'));
    } catch {
        return {};
    }
}

function writeAgents(agents: any) {
    fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
}

export async function POST(request: Request) {
    try {
        const { deviceId, commandId, status, output, error } = await request.json();
        if (!deviceId || !commandId) return NextResponse.json({ error: 'Missing deviceId or commandId' }, { status: 400 });

        const agents = readAgents();
        if (!agents[deviceId]) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

        const commandIndex = agents[deviceId].commands.findIndex((c: any) => c.id === commandId);
        if (commandIndex !== -1) {
            agents[deviceId].commands[commandIndex].status = status;
            agents[deviceId].commands[commandIndex].output = output;
            agents[deviceId].commands[commandIndex].error = error;
            agents[deviceId].commands[commandIndex].completedAt = new Date().toISOString();
        }

        writeAgents(agents);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
