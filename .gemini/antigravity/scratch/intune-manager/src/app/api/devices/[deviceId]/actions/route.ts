import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graphClient';

export async function POST(request: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  try {
    const { deviceId } = await params;
    const { action } = await request.json();
    const client = getGraphClient();

    // Map of friendly action names to Graph endpoints
    const actionEndpoints: { [key: string]: string } = {
      'reboot': `/deviceManagement/managedDevices/${deviceId}/rebootNow`,
      'sync': `/deviceManagement/managedDevices/${deviceId}/syncDevice`,
      'quickScan': `/deviceManagement/managedDevices/${deviceId}/quickScan`,
      'fullScan': `/deviceManagement/managedDevices/${deviceId}/fullScan`,
      'windowsDefenderUpdate': `/deviceManagement/managedDevices/${deviceId}/windowsDefenderUpdateSignatures`,
      'remoteAssistance': `/deviceManagement/managedDevices/${deviceId}/requestRemoteAssistance`
    };

    const endpoint = actionEndpoints[action];
    if (!endpoint) {
      return NextResponse.json({ error: 'Invalid remote action' }, { status: 400 });
    }

    await client.api(endpoint).post({});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error triggering ${error.action || 'action'}:`, error);
    return NextResponse.json({ error: error.message || 'Failed to trigger remote action' }, { status: 500 });
  }
}
