import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || 'image.png';

    if (!request.body) {
      return NextResponse.json({ error: 'No body provided' }, { status: 400 });
    }

    // ⚠️ Ensure BLOB_READ_WRITE_TOKEN is set in your .env.local
    const blob = await put(filename, request.body, {
      access: 'public',
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}