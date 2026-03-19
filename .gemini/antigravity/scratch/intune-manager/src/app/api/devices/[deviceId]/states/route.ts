import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graphClient';

export async function GET(request: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  try {
    const { deviceId } = await params;
    const client = getGraphClient();
    
    // 1. Fetch Configuration States (Profiles/Compliance)
    const configStates = await client
      .api(`/deviceManagement/managedDevices/${deviceId}/deviceConfigurationStates`)
      .select('id,displayName,state,settingStates')
      .get();
      
    // 2. Fetch Script States (PowerShell/Shell)
    let scripts: any[] = [];
    try {
      const winScripts = await client.api(`/deviceManagement/managedDevices/${deviceId}/deviceManagementScriptStates`).get();
      scripts.push(...winScripts.value);
    } catch (e) {}

    try {
      const macScripts = await client.api(`/deviceManagement/managedDevices/${deviceId}/deviceShellScriptStates`).get();
      scripts.push(...macScripts.value);
    } catch (e) {}
      
    return NextResponse.json({
      configurations: configStates.value,
      scripts: scripts
    });
  } catch (error: any) {
    console.error('Error fetching device states:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch device states' }, { status: 500 });
  }
}
