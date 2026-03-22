import { NextRequest, NextResponse } from 'next/server';
import User from '@/lib/models/User';
import Server from '@/lib/models/Server';
import cloudinary from '@/lib/cloudinary';
import { signToken, cookieOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  const formData = await req.formData();
  const userId = Number(formData.get('userId'));
  const username = formData.get('username') as string | null;
  const email = formData.get('email') as string | null;
  const imageFile = formData.get('imageUrl') as File | null;

  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  if (username && username.length > 30) return NextResponse.json({ error: 'Username too long' }, { status: 400 });

  const user = await User.findByPk(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 422 });

  let imageUrl: string | undefined;
  if (imageFile && imageFile.size > 0) {
    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const result = await cloudinary.uploader.upload(`data:${imageFile.type};base64,${base64}`);
    imageUrl = result.url.replace(/^http:\/\//i, 'https://');
  }

  await user.update({
    ...(username ? { username } : {}),
    ...(email ? { email } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  });

  // Sync updated imageUrl/username into each server's userList
  if (imageUrl || username) {
    const serversList = (user.serversList ?? []) as { serverId: number }[];
    for (const s of serversList) {
      const server = await Server.findByPk(s.serverId);
      if (!server) continue;
      const list = server.userList as Record<string, unknown>[];
      const idx = list.findIndex(u => u.userId === userId);
      if (idx >= 0) {
        if (imageUrl) list[idx].imageUrl = imageUrl;
        if (username) list[idx].username = username;
        server.changed('userList', true);
        await server.save();
      }
    }
  }

  const { password: _, ...safe } = user.toJSON();
  const token = await signToken({
    id: user.id,
    username: user.username,
    email: user.email,
    imageUrl: user.imageUrl,
    active: user.active,
    type: user.type,
    isVerified: user.isVerified,
  });
  const opts = cookieOptions();
  const res = NextResponse.json(safe);
  res.cookies.set(opts.name, token, opts);
  return res;
}
