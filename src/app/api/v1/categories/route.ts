import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import Category from '@/lib/models/Category';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const serverId = req.nextUrl.searchParams.get('serverId');
  if (!serverId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  const categories = await Category.findAll({ where: { serverId: Number(serverId) } });
  return NextResponse.json(categories);
}

export async function DELETE(req: NextRequest) {
  const { categoryId } = await req.json();
  if (!categoryId) return NextResponse.json({ error: 'Missing categoryId' }, { status: 400 });
  const deleted = await Category.destroy({ where: { id: categoryId } });
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  const { categoryId, isPrivate, allowedUserIds } = await req.json();
  if (!categoryId) return NextResponse.json({ error: 'Missing categoryId' }, { status: 400 });
  const category = await Category.findByPk(categoryId);
  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updates: Record<string, unknown> = {};
  if (isPrivate !== undefined) updates.isPrivate = isPrivate;
  if (allowedUserIds !== undefined) updates.allowedUserIds = allowedUserIds;
  await category.update(updates);
  return NextResponse.json(category);
}

export async function POST(req: NextRequest) {
  const { name, serverId, order, visible, isPrivate } = await req.json();
  if (!name || !serverId || !order || visible === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (name.length > 24) return NextResponse.json({ error: 'Category name too long' }, { status: 400 });

  const existing = await Category.findOne({ where: { [Op.and]: [{ serverId }, { name }] } });
  if (existing) return NextResponse.json({ error: 'Category exists' }, { status: 422 });

  await Category.create({ name, serverId, order, visible, isPrivate: !!isPrivate });
  const all = await Category.findAll({ where: { serverId } });
  return NextResponse.json(all);
}
