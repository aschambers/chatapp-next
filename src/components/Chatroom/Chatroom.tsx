'use client';

import { useEffect, useRef, useState } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import dayjs from 'dayjs';
import { getSocket } from '@/lib/socket';
import type { ServerUser, Message } from '@/lib/types';
import UserProfileModal from '@/components/UserProfileModal/UserProfileModal';

type UserStatus = 'online' | 'away' | 'busy' | 'offline';

const STATUS_COLOR: Record<UserStatus, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-400',
  busy: 'bg-red-500',
  offline: 'bg-gray-500',
};

interface Props {
  userId: number;
  username: string;
  currentUserImageUrl?: string | null;
  activeChatroom: string;
  activeChatroomId: number;
  activeChatroomType: string;
  serverId: number;
  isAdmin: boolean;
  serverUserList: ServerUser[];
  onlineUsers: Map<string, UserStatus>;
  onStartDM: (user: ServerUser) => void;
  onEditProfile?: () => void;
}

interface ProfileTarget {
  userId: number;
  username: string;
  imageUrl?: string | null;
  serverJoinedAt?: string;
}

function formatMessageTime(dateStr: string): string {
  const d = dayjs(dateStr);
  const today = dayjs().startOf('day');
  const yesterday = today.subtract(1, 'day');
  if (d.isAfter(today)) return d.format('h:mm A');
  if (d.isAfter(yesterday)) return `Yesterday at ${d.format('h:mm A')}`;
  return d.format('MM/DD/YYYY, h:mm A');
}

function roomKey(serverId: number, chatroomId: number) {
  const base = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001';
  return `${base}/chatroom/${serverId}/${chatroomId}`;
}

export default function Chatroom({
  userId,
  username,
  currentUserImageUrl,
  activeChatroom,
  activeChatroomId,
  activeChatroomType,
  serverId,
  isAdmin,
  serverUserList: serverUserListProp,
  onlineUsers,
  onStartDM,
  onEditProfile,
}: Props) {
  const socket = getSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [profileTarget, setProfileTarget] = useState<ProfileTarget | null>(null);
  const [serverUserList, setServerUserList] = useState<ServerUser[]>(serverUserListProp);
  const [localOnlineUsers, setLocalOnlineUsers] = useState<Map<string, UserStatus>>(onlineUsers);
  const [message, setMessage] = useState('');
  const [hover, setHover] = useState('');
  const [messageMenu, setMessageMenu] = useState(false);
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [slowmodeCooldown, setSlowmodeCooldown] = useState(0);
  const slowmodeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [showMobileMembers, setShowMobileMembers] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [sideUserModalOpen, setSideUserModalOpen] = useState(false);
  const [rightClickedUser, setRightClickedUser] = useState<Message | null>(null);
  const [sideRightClickedUser, setSideRightClickedUser] = useState<ServerUser | null>(null);
  const [myConnection] = useState<RTCPeerConnection | null>(null);

  const socketIdRef = useRef<string>('');
  const previousRoomRef = useRef<string>('');
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevChatroomIdRef = useRef<number>(activeChatroomId);
  const scrollContainerRef = useRef<HTMLDivElement>(null);


  // Sync serverUserList from props
  useEffect(() => {
    setServerUserList(serverUserListProp);
  }, [serverUserListProp]);

  // Sync onlineUsers from props and listen for live updates
  useEffect(() => {
    setLocalOnlineUsers(onlineUsers);
  }, [onlineUsers]);

  useEffect(() => {
    const handleUsers = (data: { userId: number; username: string; status: string }[]) => {
      const map = new Map<string, UserStatus>();
      data.forEach(u => { if (u.status !== 'offline') map.set(u.username, u.status as UserStatus); });
      setLocalOnlineUsers(map);
    };
    socket.on('RECEIVE_USERS', handleUsers);
    socket.emit('GET_USERS');
    return () => { socket.off('RECEIVE_USERS', handleUsers); };
  }, [socket]);

  // Scroll to bottom when messages change
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMessageMenu(false);
        setUserModalOpen(false);
        setSideUserModalOpen(false);
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  // Escape key to cancel edit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !messageMenu) {
        setEditingMessage(null);
        setNewMessage('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [messageMenu]);

  // Socket event listeners
  useEffect(() => {
    const handleMessages = (data: Message[]) => {
      setMessageMenu(false);
      setEditMessage(null);
      setEditingMessage(null);
      setNewMessage('');
      setMessages([...data].reverse());
    };

    const handleServerList = (data: ServerUser[]) => {
      const idx = data.findIndex(u => u.username === username);
      if (idx < 0) {
        // user was kicked — parent should handle navigation
      } else {
        setServerUserList(data);
        setUserModalOpen(false);
        setSideUserModalOpen(false);
        setRightClickedUser(null);
        setSideRightClickedUser(null);
      }
    };

    const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit }) => {
      if (myConnection) {
        await myConnection.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error);
      }
    };

    const handleOffer = async (data: { desc: RTCSessionDescriptionInit }) => {
      if (!myConnection) return;
      try {
        await myConnection.setRemoteDescription(data.desc);
        const answer = await myConnection.createAnswer();
        await myConnection.setLocalDescription(answer);
        socket.emit('SEND_ANSWER', { desc: answer, username, room: roomKey(serverId, activeChatroomId) });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    };

    const handleAnswer = async (data: { desc: RTCSessionDescriptionInit }) => {
      if (!myConnection) return;
      try {
        await myConnection.setRemoteDescription(data.desc);
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    };

    const handleSlowmodeError = ({ remaining }: { remaining: number }) => {
      setSlowmodeCooldown(remaining);
      if (slowmodeTimer.current) clearInterval(slowmodeTimer.current);
      slowmodeTimer.current = setInterval(() => {
        setSlowmodeCooldown(prev => {
          if (prev <= 1) {
            clearInterval(slowmodeTimer.current!);
            slowmodeTimer.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    socket.on('RECEIVE_CHATROOM_MESSAGES', handleMessages);
    socket.on('RECEIVE_SERVER_LIST', handleServerList);
    socket.on('RECEIVE_ICE_CANDIDATE', handleIceCandidate);
    socket.on('RECEIVE_OFFER', handleOffer);
    socket.on('RECEIVE_ANSWER', handleAnswer);
    socket.on('SLOWMODE_ERROR', handleSlowmodeError);

    return () => {
      socket.off('RECEIVE_CHATROOM_MESSAGES', handleMessages);
      socket.off('RECEIVE_SERVER_LIST', handleServerList);
      socket.off('RECEIVE_ICE_CANDIDATE', handleIceCandidate);
      socket.off('RECEIVE_OFFER', handleOffer);
      socket.off('RECEIVE_ANSWER', handleAnswer);
      socket.off('SLOWMODE_ERROR', handleSlowmodeError);
      if (slowmodeTimer.current) clearInterval(slowmodeTimer.current);
    };
  }, [socket, username, myConnection, serverId, activeChatroomId]);

  // Join chatroom on mount and when activeChatroomId changes
  useEffect(() => {
    const room = roomKey(serverId, activeChatroomId);
    const prevRoom = previousRoomRef.current;

    const emitJoin = () => {
      socketIdRef.current = socket.id ?? '';
      socket.emit('GET_CHATROOM_MESSAGES', {
        socketId: socket.id,
        chatroomId: activeChatroomId,
        serverId,
        previousRoom: prevRoom || room,
        room,
      });
      previousRoomRef.current = room;
    };

    if (socket.connected) {
      emitJoin();
    } else {
      socket.once('connect', () => {
        socketIdRef.current = socket.id ?? '';
        emitJoin();
      });
    }

    prevChatroomIdRef.current = activeChatroomId;

    return () => {
      socket.emit('LEAVE_CHATROOMS', { room });
    };
  }, [socket, activeChatroomId, serverId]);

  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit('CHATROOM_MESSAGE', {
      username,
      message,
      userId,
      chatroomId: activeChatroomId,
      room: roomKey(serverId, activeChatroomId),
    });
    setMessage('');
  };

  const sendEditedMessage = () => {
    if (!editingMessage) return;
    socket.emit('EDIT_CHATROOM_MESSAGE', {
      username,
      message: newMessage,
      userId,
      chatroomId: activeChatroomId,
      messageId: editingMessage.id,
      room: roomKey(serverId, activeChatroomId),
    });
  };

  const deleteChatroomMessage = () => {
    if (!editMessage) return;
    socket.emit('DELETE_CHATROOM_MESSAGE', {
      username,
      userId,
      chatroomId: activeChatroomId,
      messageId: editMessage.id,
      room: roomKey(serverId, activeChatroomId),
    });
  };

  const kickUser = (user: ServerUser) => {
    socket.emit('KICK_SERVER_USER', {
      serverId,
      chatroomId: activeChatroomId,
      type: 'user',
      userId: user.userId,
      room: roomKey(serverId, activeChatroomId),
    });
  };

  const banUser = (user: ServerUser) => {
    socket.emit('BAN_SERVER_USER', {
      serverId,
      chatroomId: activeChatroomId,
      type: 'user',
      userId: user.userId,
      room: roomKey(serverId, activeChatroomId),
    });
  };

  const startCall = async () => {
    if (!myConnection) return;
    try {
      const offer = await myConnection.createOffer({ offerToReceiveAudio: true });
      await myConnection.setLocalDescription(offer);
      socket.emit('SEND_OFFER', {
        desc: offer,
        username,
        room: roomKey(serverId, activeChatroomId),
      });
    } catch (err) {
      console.error('Error starting call:', err);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  const USER_ROLES = ['owner', 'admin', 'moderator', 'voice', 'user'] as const;
  const ROLE_LABELS: Record<string, string> = {
    owner: 'Room Owners',
    admin: 'Administrators',
    moderator: 'Moderators',
    voice: 'Voice',
    user: 'Users',
  };

  const filteredUsers = serverUserList.filter(u =>
    u.username.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Audio elements for WebRTC */}
      <div id="audioElements" className="hidden" />

      {/* Chat area */}
      <div className="relative flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex h-12 items-center gap-2 border-b border-gray-600 px-4 font-semibold">
          <span className="cursor-pointer text-gray-400" onClick={startCall}>{activeChatroomType === 'text' ? '#' : '🔊'}</span>
          <span className="flex-1 cursor-pointer" onClick={startCall}>{activeChatroom}</span>
          <button
            onClick={() => setShowMobileMembers(v => !v)}
            className="md:hidden flex items-center justify-center h-8 w-8 rounded bg-gray-600 hover:bg-gray-500 text-white"
            title="Members"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
        >
          <div className="flex min-h-full flex-col justify-end p-4">
          {messages.map((item, index) => {
            const canModerate =
              isAdmin &&
              serverUserList.some(
                u =>
                  u.username === item.username &&
                  u.type !== 'owner' &&
                  u.type !== 'admin' &&
                  u.username !== username
              );
            const msgKey = `message${index}`;
            const senderImage = item.username === username
              ? (currentUserImageUrl ?? serverUserList.find(u => u.username === item.username)?.imageUrl ?? null)
              : (serverUserList.find(u => u.username === item.username)?.imageUrl ?? null);
            return (
              <div
                key={index}
                id={msgKey}
                className={`group mb-2 rounded px-2 -mx-2 transition-colors ${userId === item.userId || canModerate ? 'hover:bg-white/5' : ''}`}
                onMouseEnter={() => {
                  if (!editingMessage && !messageMenu && (userId === item.userId || canModerate)) setHover(msgKey);
                }}
                onMouseLeave={() => setHover('')}
              >
                <div className="flex gap-3 items-start">
                  {/* Avatar */}
                  <div
                    className="flex-shrink-0 mt-1 h-9 w-9 rounded-full bg-indigo-600 overflow-hidden flex items-center justify-center text-sm font-bold cursor-pointer"
                    onClick={() => { const su = serverUserList.find(u => u.username === item.username); setProfileTarget({ userId: item.userId, username: item.username, serverJoinedAt: su?.joinedAt }); }}
                    onContextMenu={e => {
                      e.preventDefault();
                      setRightClickedUser(item);
                      setUserModalOpen(true);
                      setMessageMenu(false);
                      setEditingMessage(null);
                    }}
                  >
                    {senderImage
                      ? <img src={senderImage} alt={item.username} className="h-full w-full object-cover" />
                      : item.username[0]?.toUpperCase()
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-semibold text-indigo-400 cursor-pointer hover:underline"
                        onClick={() => { const su = serverUserList.find(u => u.username === item.username); setProfileTarget({ userId: item.userId, username: item.username, serverJoinedAt: su?.joinedAt }); }}
                        onContextMenu={e => {
                          e.preventDefault();
                          setRightClickedUser(item);
                          setUserModalOpen(true);
                          setMessageMenu(false);
                          setEditingMessage(null);
                        }}
                      >
                        {item.username}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatMessageTime(item.updatedAt)}
                      </span>
                    </div>

                    {/* Message menu */}
                    {messageMenu && editMessage?.id === item.id && (
                      <div
                        ref={menuRef}
                        className="mt-1 flex gap-3 rounded bg-gray-700 p-2 text-sm"
                      >
                        <button onClick={() => { setMessageMenu(false); setEditMessage(null); }}>✕</button>
                        {item.userId === userId && (
                          <button
                            className="hover:text-yellow-400"
                            onClick={() => {
                              setEditingMessage(editMessage);
                              setNewMessage(editMessage!.message);
                              setHover('');
                              setEditMessage(null);
                              setMessageMenu(false);
                            }}
                          >
                            Edit
                          </button>
                        )}
                        <button className="hover:text-red-400" onClick={deleteChatroomMessage}>
                          Delete
                        </button>
                      </div>
                    )}

                    {/* User context modal */}
                    {userModalOpen && rightClickedUser?.id === item.id && (
                      <div ref={menuRef} className="mt-1 rounded bg-gray-700 p-2 text-sm">
                        <button className="float-right" onClick={() => setUserModalOpen(false)}>✕</button>
                        <p
                          className="cursor-pointer hover:text-indigo-400"
                          onClick={() => {
                            const u = serverUserList.find(u => u.username === item.username);
                            if (u) { onStartDM(u); setUserModalOpen(false); }
                          }}
                        >
                          Send Message
                        </p>
                        {canModerate && (
                          <>
                            <p
                              className="cursor-pointer hover:text-yellow-400"
                              onClick={() => {
                                const u = serverUserList.find(u => u.username === item.username);
                                if (u) kickUser(u);
                              }}
                            >
                              Kick {item.username}
                            </p>
                            <p
                              className="cursor-pointer hover:text-red-400"
                              onClick={() => {
                                const u = serverUserList.find(u => u.username === item.username);
                                if (u) banUser(u);
                              }}
                            >
                              Ban {item.username}
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {/* Message body or edit input */}
                    {editingMessage?.id === item.id ? (
                      <div>
                        <input
                          className="mt-1 w-full rounded bg-gray-600 px-2 py-1 text-sm"
                          value={newMessage}
                          onChange={e => {
                            if (e.target.value.length < 500) setNewMessage(e.target.value);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) sendEditedMessage();
                          }}
                        />
                        <p className="text-xs text-gray-400">escape to cancel • enter to save</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-200">{item.message}</p>
                    )}
                  </div>

                  {/* Three-dot menu button */}
                  {hover === msgKey && (
                    <button
                      className="self-center flex-shrink-0 text-gray-400 hover:text-white px-1"
                      onClick={() => { setEditMessage(item); setMessageMenu(true); }}
                    >
                      ···
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>

        {/* Emoji picker */}
        {showEmojiPicker && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(false)} />
            <div ref={menuRef} className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 md:left-2 md:translate-x-0">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </div>
          </>
        )}

        {/* Input bar */}
        <div className="flex items-center gap-2 border-t border-gray-600 p-3">
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            accept="image/*"
          />
          <button
            className="text-gray-400 hover:text-white"
            onClick={() => fileInputRef.current?.click()}
          >
            📎
          </button>
          <input
            className="flex-1 rounded bg-gray-600 px-3 py-2 text-sm outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={slowmodeCooldown > 0 ? `Slowmode — wait ${slowmodeCooldown}s` : 'Send a message!'}
            value={message}
            disabled={slowmodeCooldown > 0}
            onChange={e => {
              if (e.target.value.length < 500) setMessage(e.target.value);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) sendMessage();
            }}
          />
          <button
            className="text-gray-400 hover:text-white"
            onClick={() => setShowEmojiPicker(p => !p)}
          >
            😊
          </button>
        </div>
      </div>

      {/* Right sidebar — user list */}
      <div
        className={`${showMobileMembers ? 'fixed inset-0 z-40' : 'hidden'} md:static md:block w-full md:w-48 overflow-y-auto border-l border-gray-600 bg-gray-700 p-3`}
        onClick={() => setShowEmojiPicker(false)}
      >
        <div className="flex items-center justify-between mb-3 md:hidden">
          <span className="text-sm font-semibold">Members</span>
          <button onClick={() => setShowMobileMembers(false)} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <input
          className="mb-3 w-full rounded bg-gray-600 px-2 py-1 text-xs"
          placeholder="Filter users"
          value={filterQuery}
          onChange={e => setFilterQuery(e.target.value)}
        />
        {USER_ROLES.map(role => {
          const usersOfRole = filteredUsers.filter(u => u.type === role);
          if (usersOfRole.length === 0) return null;
          return (
            <div key={role} className="mb-3">
              <p className="mb-1 text-xs font-bold text-gray-400">{ROLE_LABELS[role]} — {usersOfRole.length}</p>
              {usersOfRole.map((user, i) => {
                const canMod = isAdmin && user.username !== username && role !== 'owner' && role !== 'admin';
                return (
                  <div key={i} className="mb-1 flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-600"
                    onClick={() => setProfileTarget({ userId: user.userId, username: user.username, imageUrl: user.imageUrl, serverJoinedAt: user.joinedAt })}
                    onContextMenu={e => { e.preventDefault(); setSideRightClickedUser(user); setSideUserModalOpen(true); }}>
                    <div className="relative">
                      <div className="h-7 w-7 overflow-hidden rounded-full bg-indigo-600 text-xs flex items-center justify-center">
                        {(() => { const img = user.username === username ? (currentUserImageUrl ?? user.imageUrl) : user.imageUrl; return img ? <img src={img} alt={user.username} className="h-full w-full object-cover" /> : user.username[0]?.toUpperCase(); })()}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-gray-700 ${STATUS_COLOR[localOnlineUsers.get(user.username) ?? 'offline']}`} />
                    </div>
                    <span className="truncate text-xs">{user.username}</span>
                    {sideUserModalOpen && sideRightClickedUser?.username === user.username && (
                      <div ref={menuRef} className="absolute z-10 rounded bg-gray-800 p-2 shadow-lg text-xs">
                        <button className="float-right" onClick={() => setSideUserModalOpen(false)}>✕</button>
                        <p className="cursor-pointer hover:text-indigo-400" onClick={() => { onStartDM(user); setSideUserModalOpen(false); }}>Send Message</p>
                        {canMod && (<>
                          <p className="cursor-pointer hover:text-yellow-400" onClick={() => kickUser(user)}>Kick {user.username}</p>
                          <p className="cursor-pointer hover:text-red-400" onClick={() => banUser(user)}>Ban {user.username}</p>
                        </>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {profileTarget && (
        <UserProfileModal
          userId={profileTarget.userId}
          username={profileTarget.username}
          imageUrl={profileTarget.imageUrl}
          status={localOnlineUsers.get(profileTarget.username)}
          isSelf={Number(profileTarget.userId) === Number(userId)}
          serverJoinedAt={profileTarget.serverJoinedAt}
          onClose={() => setProfileTarget(null)}
          onSendMessage={Number(profileTarget.userId) !== Number(userId) ? () => {
            const u = serverUserList.find(u => u.userId === profileTarget.userId);
            if (u) onStartDM(u);
          } : undefined}
          onEditProfile={onEditProfile}
        />
      )}
    </div>
  );
}
