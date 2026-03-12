import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

const EXTENSION_NAME = 'com.eqncs.mailtracker';

/**
 * GET: Retrieves all users that have the mail tracker extension.
 */
export async function GET() {
    try {
        const client = getGraphClient();
        
        let trackedUsers: any[] = [];
        let nextLink: string | null = '/users';
        
        // Fetch all users with their extensions
        // Unfortunately, Open Extensions don't support simple server-side filtering on all users easily, 
        // so we fetch users by page and filter locally. In a huge tenant, a schema extension would be better,
        // but for a dashboard this is fine.
        while (nextLink) {
            const response = await client.api(nextLink)
                .select('id,displayName,mail,userPrincipalName')
                .expand(`extensions($filter=id eq '${EXTENSION_NAME}')`)
                .get();
                
            const usersWithExtensions = response.value || [];
            
            // Filter to only those who actually have the extension explicitly attached
            const currentlyTracked = usersWithExtensions.filter((u: any) => 
                u.extensions && 
                u.extensions.length > 0 && 
                u.extensions[0].isTracked === true
            );
            
            trackedUsers = [...trackedUsers, ...currentlyTracked];
            nextLink = response['@odata.nextLink'] ? response['@odata.nextLink'] : null;
        }

        // Map it to a cleaner format
        const cleanList = trackedUsers.map(u => {
            const ext = u.extensions[0];
            return {
                id: u.id,
                displayName: u.displayName,
                mail: u.mail || u.userPrincipalName,
                expiresAt: ext.expiresAt || null,
                trackedSince: ext.trackedSince || new Date().toISOString()
            };
        });

        return NextResponse.json({ trackedUsers: cleanList });
    } catch (error: any) {
        console.error('Graph API Error (GET Tracked Users):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST: Start tracking a user by adding/updating the open extension
 * Expected body: { userId: string, durationDays: number | null }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, durationDays } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const client = getGraphClient();

        // Calculate expiration
        let expiresAt = null;
        if (durationDays && durationDays > 0) {
            const date = new Date();
            date.setDate(date.getDate() + durationDays);
            expiresAt = date.toISOString();
        }

        const extensionData = {
            "@odata.type": "microsoft.graph.openTypeExtension",
            "extensionName": EXTENSION_NAME,
            "isTracked": true,
            "expiresAt": expiresAt,
            "trackedSince": new Date().toISOString()
        };

        try {
            // Try POST first (create new)
            await client.api(`/users/${userId}/extensions`).post(extensionData);
        } catch (postError: any) {
            // 409 Conflict means it already exists, so we PATCH (update)
            if (postError.statusCode === 409 || postError.code === 'ExtensionAlreadyExists') {
                await client.api(`/users/${userId}/extensions/${EXTENSION_NAME}`).patch(extensionData);
            } else {
                throw postError; // Throw actual errors
            }
        }

        return NextResponse.json({ success: true, message: 'User tracking enabled', expiresAt });
    } catch (error: any) {
        console.error('Graph API Error (POST Tracked User):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE: Stop tracking a user by removing the extension
 * Expected body: { userId: string }
 */
export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const client = getGraphClient();

        try {
            await client.api(`/users/${userId}/extensions/${EXTENSION_NAME}`).delete();
        } catch (deleteError: any) {
            // Ignore 404s if they are already untracked
            if (deleteError.statusCode !== 404 && deleteError.code !== 'ResourceNotFound') {
                throw deleteError;
            }
        }

        return NextResponse.json({ success: true, message: 'User tracking disabled' });
    } catch (error: any) {
        console.error('Graph API Error (DELETE Tracked User):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
