import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function GET() {
    try {
        const client = getGraphClient();

        // Fetch Secure Score
        const securityResponse = await client.api('/security/secureScores')
            .top(1)
            .get();

        return NextResponse.json({
            score: securityResponse.value[0] || null,
        });
    } catch (error: any) {
        console.error('Graph API Error (Security):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
