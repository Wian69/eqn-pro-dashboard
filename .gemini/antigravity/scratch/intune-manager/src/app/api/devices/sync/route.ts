import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graphClient';

export async function POST(request: Request) {
  try {
    const { deviceId } = await request.json();
    
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    const client = getGraphClient();
    
    // Execute the immediate sync action for the device
    await client
      .api(`/deviceManagement/managedDevices/${deviceId}/syncDevice`)
      .post({});
      
    return NextResponse.json({ success: true, message: `Sync initiated successfully for device ${deviceId}` });
  } catch (error: any) {
    console.error(`Error initiating sync:`, error);
    return NextResponse.json({ error: error.message || 'Failed to sync device' }, { status: 500 });
  }
}
