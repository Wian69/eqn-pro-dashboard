import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graphClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const client = getGraphClient();
    
    let requestApi = client
      .api('/groups')
      .select('id,displayName,description,groupTypes')
      .top(100);

    if (query) {
      requestApi = requestApi.filter(`contains(displayName,'${query}')`);
    }

    const response = await requestApi.get();
    return NextResponse.json(response.value);
  } catch (error: any) {
    console.error('Error fetching groups:', JSON.stringify(error, null, 2));
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Failed to fetch groups' }, { status });
  }
}
