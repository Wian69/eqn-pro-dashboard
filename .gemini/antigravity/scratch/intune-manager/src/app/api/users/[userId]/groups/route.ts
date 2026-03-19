import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graphClient';

// GET: List groups a user is a member of (Already handled in another route, but putting here for consistency if needed)
export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const client = getGraphClient();
    const response = await client.api(`/users/${userId}/memberOf`).select('id,displayName,description').get();
    return NextResponse.json(response.value);
  } catch (error: any) {
    console.error('Error listing user groups:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add user to a group
export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const { groupId } = await request.json();
    const client = getGraphClient();

    await client.api(`/groups/${groupId}/members/$ref`).post({
      "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error adding user to group:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
