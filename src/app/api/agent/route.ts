import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const AGENTS_FILE = path.join(process.cwd(), 'agents.json');

function readAgents() {
    if (!fs.existsSync(AGENTS_FILE)) return {};
    try {
        const content = fs.readFileSync(AGENTS_FILE, 'utf-8');
        return content ? JSON.parse(content) : {};
    } catch (err) {
        console.error("Critical: Failed to read or parse agents.json", err);
        return {};
    }
}

function writeAgents(agents: any) {
    const tempPath = AGENTS_FILE + '.tmp';
    try {
        fs.writeFileSync(tempPath, JSON.stringify(agents, null, 2));
        fs.renameSync(tempPath, AGENTS_FILE);
    } catch (err) {
        console.error("Failed to write agents file:", err);
    }
}

export async function GET() {
    try {
        const agents = readAgents();
        return NextResponse.json(agents);
    } catch (error: any) {
        console.error("GET /api/agent execution error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const LATEST_AGENT_FILE = path.join(process.cwd(), 'latest_agent.json');

function readLatestAgent() {
    if (!fs.existsSync(LATEST_AGENT_FILE)) return { version: "1.0.0", engineCode: "" };
    try {
        return JSON.parse(fs.readFileSync(LATEST_AGENT_FILE, 'utf-8'));
    } catch {
        return { version: "1.0.0", engineCode: "" };
    }
}

export async function POST(request: Request) {
    console.log('[API] POST /api/agent check-in received');
    try {
        const data = await request.json();
        console.log(`[API] Agent data: ${data.hostname} (${data.deviceId})`);
        const { deviceId, hostname, agentVersion, cpuUsage, ramUsage, hddTotal, hddFree, publicIp, localIp, isp, vpnStatus, location, coords, lastSeen } = data;

        if (!deviceId) {
            console.warn('[API] POST /api/agent failed: Missing deviceId');
            return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
        }

        const agents = readAgents();
        const existing = agents[deviceId] || {};

        // Sticky Merge Strategy: Only overwrite if new data is valid/truthy
        agents[deviceId] = {
            ...existing,
            deviceId,
            hostname: hostname || existing.hostname,
            agentVersion: agentVersion || existing.agentVersion,
            cpuUsage: cpuUsage !== undefined ? cpuUsage : existing.cpuUsage,
            ramUsage: ramUsage !== undefined ? ramUsage : existing.ramUsage,
            hddTotal: hddTotal || existing.hddTotal,
            hddFree: hddFree || existing.hddFree,
            publicIp: (publicIp && publicIp !== 'Unknown') ? publicIp : existing.publicIp,
            localIp: (localIp && localIp !== 'N/A') ? localIp : existing.localIp,
            isp: (isp && isp !== 'Unknown') ? isp : existing.isp,
            vpnStatus: vpnStatus || existing.vpnStatus, // Allow 'Offline' (truthy string) or specific VPN name
            location: (location && location !== 'Unknown') ? location : existing.location,
            coords: (coords && coords !== '') ? coords : existing.coords,
            lastSeen: lastSeen || new Date().toISOString(),
            status: 'online',
            commands: existing.commands || [],
            software: data.software ? data.software : (existing.software || [])
        };

        writeAgents(agents);

        // Version Check & Auto-Update Logic
        const latest = readLatestAgent();
        const pendingCommands = [...(agents[deviceId].commands.filter((c: any) => c.status === 'pending'))];

        if (latest.version !== agentVersion && latest.code) {
            // Push self-update command to the END
            pendingCommands.push({
                id: 'auto-update-' + Date.now(),
                command: 'selfUpdate',
                params: {
                    version: latest.version,
                    code: latest.code
                },
                status: 'pending',
                timestamp: new Date().toISOString()
            });
        }

        return NextResponse.json({ success: true, commands: pendingCommands });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// API to queue a command for an agent
export async function PUT(request: Request) {
    try {
        const { deviceId, command, params } = await request.json();
        if (!deviceId || !command) return NextResponse.json({ error: 'Missing deviceId or command' }, { status: 400 });

        const agents = readAgents();
        if (!agents[deviceId]) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

        const newCommand = {
            id: Math.random().toString(36).substr(2, 9),
            command,
            params,
            status: 'pending',
            timestamp: new Date().toISOString()
        };

        agents[deviceId].commands.push(newCommand);
        writeAgents(agents);

        return NextResponse.json({ success: true, commandId: newCommand.id });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
