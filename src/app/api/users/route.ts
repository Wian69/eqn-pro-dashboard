import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function GET() {
    try {
        const client = getGraphClient();

        // Fetch all users
        const usersResponse = await client.api('/users')
            .select('displayName,mail,userPrincipalName,userType,id,assignedLicenses')
            .get();

        const users = usersResponse.value;

        return NextResponse.json({
            all: users,
            active: users.filter((u: any) => u.userType === 'Member'),
            guests: users.filter((u: any) => u.userType === 'Guest'),
            unlicensed: users.filter((u: any) => !u.assignedLicenses || u.assignedLicenses.length === 0),
        });
    } catch (error: any) {
        console.error('Graph API Error (Users):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
