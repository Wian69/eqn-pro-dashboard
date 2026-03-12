import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function GET() {
    try {
        const client = getGraphClient();

        let usersResponse;
        
        try {
            // Fetch all users with department, officeLocation and signInActivity
            // Note: signInActivity requires AuditLog.Read.All permission
            usersResponse = await client.api('/users')
                .version('beta') // signInActivity is available in beta or v1.0 depending on the tenant, but beta is safer for detailed sign in
                .select('displayName,mail,userPrincipalName,userType,id,assignedLicenses,department,officeLocation,signInActivity')
                .get();
        } catch (initialError: any) {
            // Check if the error is related to privileges (e.g. 403 Forbidden or missing AuditLog.Read.All)
            if (initialError.statusCode === 403 || (initialError.message && initialError.message.includes('AuditLog.Read.All'))) {
                console.warn('AuditLog.Read.All permission missing. Falling back to query without sign-in activity.');
                // Fallback query without signInActivity
                usersResponse = await client.api('/users')
                    .select('displayName,mail,userPrincipalName,userType,id,assignedLicenses,department,officeLocation')
                    .get();
            } else {
                // Throw any other unexpected errors
                throw initialError;
            }
        }

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
