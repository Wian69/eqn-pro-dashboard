import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function GET() {
    try {
        const client = getGraphClient();

        let users: any[] = [];
        let nextLink: string | null = '/users';
        let permissionFallback = false;
        
        // Use a loop to handle Microsoft Graph pagination
        while (nextLink) {
            try {
                const apiCall = client.api(nextLink);
                if (!permissionFallback) {
                    apiCall.version('beta').select('displayName,mail,userPrincipalName,userType,id,assignedLicenses,department,officeLocation,signInActivity');
                } else {
                    apiCall.select('displayName,mail,userPrincipalName,userType,id,assignedLicenses,department,officeLocation');
                }

                const response = await apiCall.get();
                users = [...users, ...response.value];
                nextLink = response['@odata.nextLink'] ? response['@odata.nextLink'] : null;
            } catch (error: any) {
                // If permission error on first page, trigger fallback and restart
                if (!permissionFallback && (error.statusCode === 403 || error.message?.includes('AuditLog.Read.All'))) {
                    console.warn('AuditLog.Read.All permission missing. Falling back to query without sign-in activity.');
                    permissionFallback = true;
                    users = [];
                    nextLink = '/users';
                    continue;
                }
                throw error;
            }
        }

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
