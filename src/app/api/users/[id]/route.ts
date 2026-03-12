import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const id = params.id;
        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const client = getGraphClient();

        // Fetch detailed user profile from Entra ID
        // Note: signInActivity requires AuditLog.Read.All permission
        let userProfile;
        try {
            const userResponse = await client.api(`/users/${id}`)
                .version('beta')
                .select('id,displayName,givenName,surname,mail,userPrincipalName,userType,jobTitle,department,officeLocation,businessPhones,mobilePhone,streetAddress,city,state,postalCode,country,accountEnabled,createdDateTime,assignedLicenses,signInActivity,usageLocation,preferredLanguage')
                .get();
            userProfile = userResponse;
        } catch (initialError: any) {
             if (initialError.statusCode === 403 || (initialError.message && initialError.message.includes('AuditLog.Read.All'))) {
                console.warn(`AuditLog.Read.All permission missing while fetching user ${id}. Falling back to query without sign-in activity.`);
                const fallbackResponse = await client.api(`/users/${id}`)
                    .select('id,displayName,givenName,surname,mail,userPrincipalName,userType,jobTitle,department,officeLocation,businessPhones,mobilePhone,streetAddress,city,state,postalCode,country,accountEnabled,createdDateTime,assignedLicenses')
                    .get();
                userProfile = fallbackResponse;
             } else {
                 throw initialError;
             }
        }

        // We can fetch manager if needed:
        let manager = null;
        try {
            const managerResponse = await client.api(`/users/${id}/manager`).get();
            manager = managerResponse;
        } catch (managerError: any) {
            // A 404 indicates no manager is assigned, which is fine
            if (managerError.statusCode !== 404) {
                console.warn(`Failed to fetch manager for user ${id}:`, managerError);
            }
        }

        return NextResponse.json({
            user: userProfile,
            manager: manager 
        });

    } catch (error: any) {
        console.error('Graph API Error (User Details):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const id = params.id;
        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const body = await request.json();
        
        // Allowed fields for update in Entra ID
        const allowedFields = [
            'givenName', 'surname', 'displayName', 'jobTitle', 
            'department', 'officeLocation', 'mobilePhone', 
            'streetAddress', 'city', 'state', 'postalCode', 'country',
            'usageLocation', 'preferredLanguage'
        ];
        
        const updateData: any = {};
        for (const key of allowedFields) {
            if (body[key] !== undefined) {
                updateData[key] = body[key] === '' ? null : body[key];
            }
        }
        
        if (body.businessPhones !== undefined) {
            if (Array.isArray(body.businessPhones)) {
                updateData.businessPhones = body.businessPhones;
            } else if (typeof body.businessPhones === 'string') {
                updateData.businessPhones = body.businessPhones ? [body.businessPhones] : [];
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
        }

        const client = getGraphClient();
        
        await client.api(`/users/${id}`)
            .version('v1.0')
            .patch(updateData);
            
        return NextResponse.json({ success: true, updatedFields: Object.keys(updateData) });
    } catch (error: any) {
        console.error('Graph API Error (Update User):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
