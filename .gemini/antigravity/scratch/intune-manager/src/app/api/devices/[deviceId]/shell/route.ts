import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graphClient';

// This API handles queuing a background command and retrieving the last output.
// In a real Intune environment, this maps to 'runSummary' and 'deviceRunStates'
// for PowerShell scripts.
export async function POST(request: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  try {
    const { deviceId } = await params;
    const { command } = await request.json();
    const client = getGraphClient();

    // 1. Create a "Run Once" script for this specific command
    // Note: In Graph API, we use 'deviceManagementScripts' but for background interactive shell
    // we use the 'runScript' action if available, or create a temporary script assignment.
    
    // For this POC, we trigger a Remote Desktop session request or a Management Script
    // We'll simulate the response for now or use the 'runScript' endpoint if tenant follows newer beta APIs.
    
    // Simulating the start of a background execution session
    return NextResponse.json({ 
      sessionId: `shell_${Date.now()}`,
      status: 'queued',
      message: `Command '${command}' sent to background agent on device ${deviceId}`
    });
  } catch (error: any) {
    console.error('Shell Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  // Poll for script results
  return NextResponse.json({ 
    output: "SYSTEM INFO:\nOS Name: Microsoft Windows 11 Pro\nVersion: 10.0.22631\nStatus: Online\nBackground Agent: Active\n\nWaiting for new input...",
    status: 'idle'
  });
}
