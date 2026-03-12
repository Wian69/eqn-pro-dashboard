import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function GET() {
    try {
        const client = getGraphClient();

        // Fetch all users with department, officeLocation and signInActivity
        // Note: signInActivity requires AuditLog.Read.All permission
        const usersResponse = await client.api('/users')
            .version('beta') // signInActivity is available in beta or v1.0 depending on the tenant, but beta is safer for detailed sign in
            .select('displayName,mail,userPrincipalName,userType,id,assignedLicenses,department,officeLocation,signInActivity')
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
