import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graphClient';

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const client = getGraphClient();
    
    // Fetch the groups the user is a member of. In typical Intune rollouts,
    // policies are assigned directly to Azure AD Groups.
    // Use transitiveMemberOf to catch nested group memberships
    const response = await client
      .api(`/users/${userId}/transitiveMemberOf`)
      .select('id,displayName,description')
      .get();
      
    return NextResponse.json(response.value);
  } catch (error: any) {
    console.error('Error fetching user policies/groups:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch user policies' }, { status: 500 });
  }
}
