import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graphClient';

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const client = getGraphClient();
    
    // Method 1: Direct relationship (Best for Intune)
    let devicesResponse = await client
      .api(`/users/${userId}/managedDevices`)
      .select('id,deviceName,model,manufacturer,operatingSystem,complianceState,lastSyncDateTime,userPrincipalName')
      .get();
    
    let devices = devicesResponse.value || [];

    // Method 2: Fallback to filter if direct relationship didn't find anything
    if (devices.length === 0) {
      const filterResponse = await client
        .api('/deviceManagement/managedDevices')
        .filter(`userId eq '${userId}'`)
        .select('id,deviceName,model,manufacturer,operatingSystem,osVersion,complianceState,lastSyncDateTime,userPrincipalName,serialNumber')
        .get();
      devices = filterResponse.value || [];
    }
      
    return NextResponse.json(devices);
  } catch (error: any) {
    console.error('Error fetching user devices:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch user devices' }, { status: 500 });
  }
}
