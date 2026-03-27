import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0)
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const result = await cloudinary.uploader.upload(`data:${file.type};base64,${base64}`, {
    folder: 'chat',
  });

  return NextResponse.json({ url: result.secure_url });
}
