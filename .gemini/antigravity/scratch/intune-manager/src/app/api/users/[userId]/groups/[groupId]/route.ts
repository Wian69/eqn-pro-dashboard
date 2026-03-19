import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graphClient';

// DELETE: Remove user from a group
export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string; groupId: string }> }) {
  try {
    const { userId, groupId } = await params;
    const client = getGraphClient();

    await client.api(`/groups/${groupId}/members/${userId}/$ref`).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing user from group:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
