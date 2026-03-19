import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graphClient';

export async function PATCH(request: Request, { params }: { params: Promise<{ policyId: string }> }) {
  try {
    const { policyId } = await params;
    const { displayName, description, type } = await request.json();
    const client = getGraphClient();

    let endpoint = `/deviceManagement/deviceConfigurations/${policyId}`;
    if (type === 'Compliance') endpoint = `/deviceManagement/deviceCompliancePolicies/${policyId}`;
    if (type === 'Settings') endpoint = `/deviceManagement/configurationPolicies/${policyId}`;

    const updatePayload: any = { description };
    if (type === 'Settings') {
      updatePayload.name = displayName;
    } else {
      updatePayload.displayName = displayName;
    }

    await client.api(endpoint).update(updatePayload);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating Intune policy:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
