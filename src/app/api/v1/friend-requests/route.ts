import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import crypto from 'crypto';
import FriendRequest from '@/lib/models/FriendRequest';
import Friend from '@/lib/models/Friend';
import User from '@/lib/models/User';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const senderId = req.nextUrl.searchParams.get('senderId');
  const receiverId = req.nextUrl.searchParams.get('receiverId');

  // ?senderId=X&receiverId=Y → return request between X and Y (any status)
  if (senderId && receiverId) {
    const request = await FriendRequest.findOne({
      where: {
        [Op.or]: [
          { senderId: Number(senderId), receiverId: Number(receiverId) },
          { senderId: Number(receiverId), receiverId: Number(senderId) },
        ],
      },
    });
    return NextResponse.json(request ?? null);
  }

  // ?userId=X → return all pending requests where receiverId = X
  if (userId) {
    const requests = await FriendRequest.findAll({
      where: { receiverId: Number(userId), status: 'pending' },
      order: [['createdAt', 'DESC']],
    });
    return NextResponse.json(requests);
  }

  return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const { senderId, senderUsername, receiverId } = await req.json();
  if (!senderId || !senderUsername || !receiverId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Fetch sender's imageUrl
  const sender = await User.findByPk(Number(senderId));
  const senderImageUrl = sender?.imageUrl ?? null;

  // Check if a pending/accepted request already exists in either direction
  const existingRequest = await FriendRequest.findOne({
    where: {
      [Op.or]: [
        { senderId: Number(senderId), receiverId: Number(receiverId), status: { [Op.in]: ['pending', 'accepted'] } },
        { senderId: Number(receiverId), receiverId: Number(senderId), status: { [Op.in]: ['pending', 'accepted'] } },
      ],
    },
  });
  if (existingRequest) {
    return NextResponse.json({ error: 'Friend request already exists' }, { status: 422 });
  }

  // Fetch receiver's username
  const receiver = await User.findByPk(Number(receiverId));
  if (!receiver) {
    return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
  }

  const request = await FriendRequest.create({
    senderId: Number(senderId),
    senderUsername,
    senderImageUrl,
    receiverId: Number(receiverId),
    receiverUsername: receiver.username,
    status: 'pending',
  });

  return NextResponse.json(request);
}

export async function PUT(req: NextRequest) {
  const { requestId, action } = await req.json();
  if (!requestId || !action) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const request = await FriendRequest.findByPk(Number(requestId));
  if (!request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  if (action === 'accept') {
    await request.update({ status: 'accepted' });

    const groupId = crypto.randomBytes(32).toString('hex');

    // Get image URLs for both users
    const [receiverUser, senderUser] = await Promise.all([
      User.findByPk(request.receiverId),
      User.findByPk(request.senderId),
    ]);

    const receiverImageUrl = receiverUser?.imageUrl ?? null;
    const senderImageUrl = request.senderImageUrl ?? senderUser?.imageUrl ?? null;

    // Create Friend record: receiver → sender
    const receiverToSender = await Friend.findOne({
      where: { userId: request.receiverId, friendId: request.senderId },
    });
    if (!receiverToSender) {
      await Friend.create({
        username: request.senderUsername,
        imageUrl: senderImageUrl,
        userId: request.receiverId,
        friendId: request.senderId,
        activeFriend: true,
        isFriend: true,
        groupId,
      });
    } else {
      await receiverToSender.update({ activeFriend: true, isFriend: true, groupId });
    }

    // Create Friend record: sender → receiver
    const senderToReceiver = await Friend.findOne({
      where: { userId: request.senderId, friendId: request.receiverId },
    });
    if (!senderToReceiver) {
      await Friend.create({
        username: request.receiverUsername,
        imageUrl: receiverImageUrl,
        userId: request.senderId,
        friendId: request.receiverId,
        activeFriend: true,
        isFriend: true,
        groupId,
      });
    } else {
      await senderToReceiver.update({ activeFriend: true, isFriend: true, groupId });
    }

    const friendsList = await Friend.findAll({ where: { userId: request.receiverId } });
    return NextResponse.json({ request, friendsList });
  }

  if (action === 'decline') {
    await request.update({ status: 'declined' });
    return NextResponse.json(request);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
