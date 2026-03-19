import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graphClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const client = getGraphClient();

    let requestApi = client
      .api('/users')
      .select('id,displayName,userPrincipalName,jobTitle,department,userType,officeLocation')
      .top(999);

    if (query) {
      requestApi = requestApi.filter(`startsWith(displayName,'${query}') or startsWith(userPrincipalName,'${query}')`);
    }

    const response = await requestApi.get();
    return NextResponse.json(response.value);
  } catch (error: any) {
    console.error('Error fetching users:', JSON.stringify(error, null, 2));
    const status = error.statusCode || 500;
    let message = error.message || 'Failed to fetch users';
    try {
      if (error.body) {
        const body = JSON.parse(error.body);
        if (body.error?.message) message = body.error.message;
      }
    } catch (e) { }
    return NextResponse.json({ error: message }, { status });
  }
}
