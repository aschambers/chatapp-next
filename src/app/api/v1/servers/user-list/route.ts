import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import Server from '@/lib/models/Server';
import User from '@/lib/models/User';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const serverId = req.nextUrl.searchParams.get('serverId');
  const server = await Server.findByPk(Number(serverId));
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 422 });

  const list = (server.userList ?? []) as Record<string, unknown>[];
  const userIds = list.map((u) => Number(u.userId));
  const users = await User.findAll({
    where: { id: { [Op.in]: userIds } },
    attributes: ['id', 'imageUrl'],
  });
  const imageMap = new Map(users.map((u) => [u.id, u.imageUrl]));
  const enriched = list.map((u) => ({ ...u, imageUrl: imageMap.get(Number(u.userId)) ?? null }));

  return NextResponse.json(enriched);
}

export async function PUT(req: NextRequest) {
  const { active, imageUrl, type, userId, username, serverId } = await req.json();
  if (!type || !userId || !username || !serverId)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  const server = await Server.findByPk(serverId);
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 422 });

  const list = server.userList as Record<string, unknown>[];
  const idx = list.findIndex((u) => u.userId === userId);
  if (idx < 0) return NextResponse.json({ error: 'User not on server' }, { status: 422 });

  list[idx] = { type, active, userId: Number(userId), imageUrl, username };
  server.changed('userList', true);
  await server.save();
  return NextResponse.json(server.userList);
}
