import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

// The extension name we will use on the sender's user account
const EXTENSION_NAME = 'com.eqncs.mailtracker.schedule';

export async function GET(request: Request) {
    try {
        const client = getGraphClient();
        const sendFrom = process.env.MAIL_TRACKER_SEND_FROM;

        if (!sendFrom) {
            return NextResponse.json({ error: 'MAIL_TRACKER_SEND_FROM environment variable not set' }, { status: 500 });
        }

        try {
            const user = await client.api(`/users/${sendFrom}`)
                .select('id,mail')
                .expand(`extensions($filter=id eq '${EXTENSION_NAME}')`)
                .get();

            let scheduleHour = '08'; // Default to 8 AM UTC

            if (user.extensions && user.extensions.length > 0) {
                scheduleHour = user.extensions[0].scheduleHour;
            }

            return NextResponse.json({ scheduleHour });
        } catch (graphError: any) {
             if (graphError.statusCode === 404) {
                 return NextResponse.json({ error: `Sender user '${sendFrom}' not found in Azure AD.` }, { status: 404 });
             }
             throw graphError;
        }

    } catch (error: any) {
        console.error('API Error (Mail Tracker Settings GET):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { scheduleHour } = await request.json();
        
        if (!scheduleHour) {
             return NextResponse.json({ error: 'Missing scheduleHour' }, { status: 400 });
        }

        const client = getGraphClient();
        const sendFrom = process.env.MAIL_TRACKER_SEND_FROM;

        if (!sendFrom) {
            return NextResponse.json({ error: 'MAIL_TRACKER_SEND_FROM environment variable not set' }, { status: 500 });
        }

        // We replace the entire extension. It's safer to attempt DELETE then POST or just use PATCH if it exists.
        // We will try to fetch the user to get ID and see if extension exists.
        const user = await client.api(`/users/${sendFrom}`).select('id').expand(`extensions($filter=id eq '${EXTENSION_NAME}')`).get();
        const existingAuth = user.extensions && user.extensions.length > 0;

        const payload = {
            "@odata.type": "microsoft.graph.openTypeExtension",
            "extensionName": EXTENSION_NAME,
            "scheduleHour": scheduleHour
        };

        if (existingAuth) {
            await client.api(`/users/${user.id}/extensions/${EXTENSION_NAME}`).patch(payload);
        } else {
            await client.api(`/users/${user.id}/extensions`).post(payload);
        }

        return NextResponse.json({ success: true, scheduleHour });
    } catch (error: any) {
        console.error('API Error (Mail Tracker Settings POST):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
