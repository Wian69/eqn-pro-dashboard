import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graphClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const client = getGraphClient();

    // Fetch managed devices from Intune
    const response = await client
      .api('/deviceManagement/managedDevices')
      .select('id,deviceName,operatingSystem,osVersion,complianceState,managedDeviceOwnerType,enrolledDateTime,userDisplayName,userPrincipalName,lastSyncDateTime,model,manufacturer,serialNumber,azureADDeviceId')
      .top(100)
      .get();

    let devices = response.value;

    if (id) {
      const device = devices.find((d: any) => d.id === id);
      if (!device) {
        // Try fetching by ID directly if not found in the initial list
        try {
          const directDevice = await client.api(`/deviceManagement/managedDevices/${id}`).get();
          return NextResponse.json(directDevice);
        } catch (e) {
          return NextResponse.json({ error: "Device not found" }, { status: 404 });
        }
      }
      return NextResponse.json(device);
    }

    return NextResponse.json(devices);

  } catch (error: any) {
    console.error('Error fetching devices:', JSON.stringify(error, null, 2));
    const status = error.statusCode || 500;
    let message = error.message || 'Failed to fetch devices';
    try {
      if (error.body) {
        const body = JSON.parse(error.body);
        if (body.error?.message) message = body.error.message;
      }
    } catch (e) { }
    if (status === 403) {
      message = "Access Denied: Please ensure 'DeviceManagementManagedDevices.Read.All' Application Permission is granted and consented in Azure AD.";
    }
    return NextResponse.json({ error: message }, { status });
  }
}
