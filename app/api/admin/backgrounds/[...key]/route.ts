import { NextResponse } from 'next/server';
import { fetchR2Object } from '@/lib/r2';

export async function GET(
  request: Request,
  { params }: { params: { key: string[] } }
) {
  try {
    const key = params.key.join('/');
    const r2Response = await fetchR2Object(key);

    const headers = new Headers();
    headers.set('Content-Type', r2Response.headers.get('content-type') || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(r2Response.body as unknown as ReadableStream, { 
      status: 200, 
      headers 
    });
  } catch (error) {
    console.error(error);
    return new NextResponse('Not found', { status: 404 });
  }
}