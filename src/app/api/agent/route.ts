import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        // Fetch all agents
        const { data: agentsData, error: agentsError } = await supabase
            .from('agents')
            .select('*');

        if (agentsError) throw agentsError;

        // Fetch all commands to populate the history in the UI
        const { data: commandsData, error: commandsError } = await supabase
            .from('commands')
            .select('*')
            .order('timestamp', { ascending: false });

        if (commandsError) throw commandsError;

        // Group commands by device_id
        const commandsByDevice: any = {};
        commandsData?.forEach(cmd => {
            if (!commandsByDevice[cmd.device_id]) {
                commandsByDevice[cmd.device_id] = [];
            }
            commandsByDevice[cmd.device_id].push({
                id: cmd.id,
                command: cmd.command,
                params: cmd.params,
                status: cmd.status,
                timestamp: cmd.timestamp,
                output: cmd.output,
                error: cmd.error,
                completedAt: cmd.completed_at
            });
        });

        // Map the agents to the format the UI expects
        const agentsMap: any = {};
        agentsData?.forEach(agent => {
            agentsMap[agent.device_id] = {
                deviceId: agent.device_id,
                hostname: agent.hostname,
                agentVersion: agent.agent_version,
                cpuUsage: agent.cpu_usage,
                ramUsage: agent.ram_usage,
                hddTotal: agent.hdd_total,
                hddFree: agent.hdd_free,
                publicIp: agent.public_ip,
                localIp: agent.local_ip,
                isp: agent.isp,
                vpnStatus: agent.vpn_status,
                location: agent.location,
                coords: agent.coords,
                lastSeen: agent.last_seen,
                status: agent.status,
                software: agent.software || [],
                commands: commandsByDevice[agent.device_id] || []
            };
        });

        return NextResponse.json(agentsMap);
    } catch (error: any) {
        console.error("GET /api/agent supabase error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    console.log('[API] POST /api/agent check-in received');
    try {
        const data = await request.json();
        const { 
            deviceId, hostname, agentVersion, cpuUsage, ramUsage, 
            hddTotal, hddFree, publicIp, localIp, isp, 
            vpnStatus, location, coords, lastSeen 
        } = data;

        if (!deviceId) return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });

        // Check for existing software array to prevent wiping it out on normal heartbeats
        let finalSoftware = data.software;
        if (!finalSoftware || finalSoftware.length === 0) {
            const { data: existingAgent } = await supabase
                .from('agents')
                .select('software')
                .eq('device_id', deviceId)
                .single();
            if (existingAgent && existingAgent.software) {
                finalSoftware = existingAgent.software;
            } else {
                finalSoftware = [];
            }
        }

        // Upsert Agent Data
        const { error: upsertError } = await supabase
            .from('agents')
            .upsert({
                device_id: deviceId,
                hostname,
                agent_version: agentVersion,
                cpu_usage: cpuUsage,
                ram_usage: ramUsage,
                hdd_total: hddTotal,
                hdd_free: hddFree,
                public_ip: publicIp,
                local_ip: localIp,
                isp,
                vpn_status: vpnStatus,
                location,
                coords,
                last_seen: lastSeen || new Date().toISOString(),
                status: 'online',
                software: finalSoftware,
                updated_at: new Date().toISOString()
            });

        if (upsertError) {
            console.error('[API] Supabase Upsert Error:', upsertError);
            throw upsertError;
        }

        // Fetch Pending Commands
        const { data: pendingCommands, error: cmdError } = await supabase
            .from('commands')
            .select('*')
            .eq('device_id', deviceId)
            .eq('status', 'pending');

        if (cmdError) throw cmdError;

        // Map to format agent expects
        const commands = pendingCommands?.map(c => ({
            id: c.id,
            command: c.command,
            params: c.params
        })) || [];

        return NextResponse.json({ success: true, commands });
    } catch (error: any) {
        console.error('[API] POST /api/agent error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// API to queue a command
export async function PUT(request: Request) {
    try {
        const { deviceId, command, params } = await request.json();
        if (!deviceId || !command) return NextResponse.json({ error: 'Missing deviceId or command' }, { status: 400 });

        const commandId = Math.random().toString(36).substr(2, 9);
        
        const { error } = await supabase
            .from('commands')
            .insert({
                id: commandId,
                device_id: deviceId,
                command,
                params,
                status: 'pending',
                timestamp: new Date().toISOString()
            });

        if (error) throw error;

        return NextResponse.json({ success: true, commandId });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
