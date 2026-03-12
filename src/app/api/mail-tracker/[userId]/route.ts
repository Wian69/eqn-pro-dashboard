import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function GET(request: Request, props: { params: Promise<{ userId: string }> }) {
    try {
        const params = await props.params;
        const userId = params.userId;
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const client = getGraphClient();

        const url = new URL(request.url);
        const daysParam = url.searchParams.get('days') || '1';
        const days = parseInt(daysParam);

        let filterString = 'isDraft eq false';
        if (!isNaN(days) && days > 0) {
            const date = new Date();
            date.setDate(date.getDate() - days);
            filterString += ` and sentDateTime ge ${date.toISOString()}`;
        }

        // Fetch sent items for the user
        let messages = [];
        try {
            const response = await client.api(`/users/${userId}/mailFolders/SentItems/messages`)
                .filter(filterString)
                .select('id,subject,toRecipients,ccRecipients,sentDateTime,hasAttachments')
                .expand('attachments($select=name)')
                .orderby('sentDateTime desc')
                .top(100)
                .get();
                
            messages = response.value;
        } catch (mailError: any) {
            if (mailError.statusCode === 403 || (mailError.message && mailError.message.includes('Mail.Read'))) {
                return NextResponse.json({ 
                    error: 'Permission Denied', 
                    details: 'The Azure App Registration is missing "Mail.Read.All" or "Mail.ReadBasic.All" Application permission. Please grant this permission and try again.' 
                }, { status: 403 });
            }
            throw mailError;
        }

        return NextResponse.json({ messages });
    } catch (error: any) {
        console.error('Graph API Error (Mail Tracker Fetch):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
