import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graphClient';

export async function GET() {
  try {
    const client = getGraphClient();
    
    // 1. Fetch all Device Configurations (Intune Profiles)
    let profilePolicies: any[] = [];
    try {
      const res = await client.api('/deviceManagement/deviceConfigurations').select('id,displayName,description').get();
      profilePolicies = res.value.map((p: any) => ({ ...p, type: 'Profile', odataType: p['@odata.type'] }));
    } catch (e) {
      console.error('Profiles not found or unauthorized');
    }
      
    // 2. Fetch all Compliance Policies
    let compliancePolicies: any[] = [];
    try {
      const res = await client.api('/deviceManagement/deviceCompliancePolicies').select('id,displayName,description').get();
      compliancePolicies = res.value.map((p: any) => ({ ...p, type: 'Compliance', odataType: p['@odata.type'] }));
    } catch (e) {
      console.error('Compliance not found or unauthorized');
    }

    // 3. Fetch Settings Catalog Policies (Configuration Policies)
    let settingsPolicies: any[] = [];
    try {
      const res = await client.api('/deviceManagement/configurationPolicies').select('id,name,description').get();
      settingsPolicies = res.value.map((p: any) => ({ ...p, displayName: p.name, type: 'Settings', odataType: 'configurationPolicy' }));
    } catch (e) {
      console.error('Settings Catalog policies not found or unauthorized');
    }

    // 4. Fetch Scripts
    let scriptPolicies: any[] = [];
    try {
      const win = await client.api('/deviceManagement/deviceManagementScripts').select('id,displayName,description').get();
      scriptPolicies.push(...win.value.map((p: any) => ({ ...p, type: 'Script (Win)', odataType: 'windowsScript' })));
    } catch (e) { console.error('Win scripts not found'); }
      
    try {
      const mac = await client.api('/deviceManagement/deviceShellScripts').select('id,displayName,description').get();
      scriptPolicies.push(...mac.value.map((p: any) => ({ ...p, type: 'Script (Mac)', odataType: 'macScript' })));
    } catch (e) { console.error('Mac scripts not found'); }
    
    const allPolicies = [
      ...profilePolicies,
      ...compliancePolicies,
      ...settingsPolicies,
      ...scriptPolicies
    ];

    // Fetch assignments for each policy to know WHICH groups they point to
    const policiesWithGroups = await Promise.all(allPolicies.map(async (policy) => {
      try {
        let endpoint = `/deviceManagement/deviceConfigurations/${policy.id}/assignments`;
        if (policy.type === 'Compliance') endpoint = `/deviceManagement/deviceCompliancePolicies/${policy.id}/assignments`;
        if (policy.type === 'Settings') endpoint = `/deviceManagement/configurationPolicies/${policy.id}/assignments`;
        if (policy.type === 'Script (Win)') endpoint = `/deviceManagement/deviceManagementScripts/${policy.id}/assignments`;
        if (policy.type === 'Script (Mac)') endpoint = `/deviceManagement/deviceShellScripts/${policy.id}/assignments`;
          
        const assignments = await client.api(endpoint).get();
        // Extract group IDs from assignments
        const groupIds = assignments.value
          .filter((a: any) => a.target && (a.target.groupId || a.target['@odata.type']?.includes('AllLicensedUsers') || a.target['@odata.type']?.includes('AllDevices')))
          .map((a: any) => a.target.groupId || 'all-users');
          
        return { ...policy, assignedGroupIds: groupIds };
      } catch (e) {
        return { ...policy, assignedGroupIds: [] };
      }
    }));

    return NextResponse.json(policiesWithGroups);
  } catch (error: any) {
    console.error('Error mapping Intune policies:', JSON.stringify(error, null, 2));
    const status = error.statusCode || 500;
    let message = error.message || 'Failed to fetch Intune policies';
    try {
      if (error.body) {
        const body = JSON.parse(error.body);
        if (body.error?.message) message = body.error.message;
      }
    } catch (e) {}
    return NextResponse.json({ error: message }, { status });
  }
}
