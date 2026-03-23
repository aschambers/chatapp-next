'use client';

import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AppDispatch, useAppSelector } from '@/lib/redux/store';
import { findServer, findUserList, resetServerValues, patchUserNameColor, kickServerUser } from '@/lib/redux/modules/servers/servers';
import { friendCreate, friendDelete, friendUnfriend, findFriends } from '@/lib/redux/modules/friends/friends';
import { fetchPendingRequests, sendFriendRequest, respondToRequest } from '@/lib/redux/modules/friendRequests/friendRequests';
import { getChatrooms } from '@/lib/redux/modules/chatrooms/chatrooms';
import { categoryFindAll } from '@/lib/redux/modules/categories/categories';
import { userLogout } from '@/lib/redux/modules/users/users';
import { getSocket } from '@/lib/socket';
import { JWTPayload } from '@/lib/auth';
import type { Server, Chatroom as ChatroomType, Friend, ServerUser } from '@/lib/types';
import Chatroom from '@/components/Chatroom/Chatroom';
import VoiceRoom from '@/components/VoiceRoom/VoiceRoom';
import ChatroomFriend from '@/components/ChatroomFriend/ChatroomFriend';
import CreateServer from '@/components/CreateServer/CreateServer';
import JoinServer from '@/components/JoinServer/JoinServer';
import ServerChannelList from '@/components/ServerChannelList/ServerChannelList';
import ServerSettings from '@/components/ServerSettings/ServerSettings';
import UserSettings from '@/components/UserSettings/UserSettings';
import UserProfileModal from '@/components/UserProfileModal/UserProfileModal';
import FriendsModal from '@/components/FriendsModal/FriendsModal';

interface Props {
  initialUser: JWTPayload;
  initialServers: Server[];
  initialActiveServer: Server | null;
  initialPendingChatroomId: number | null;
}

type UserStatus = 'online' | 'away' | 'busy' | 'offline';

function statusColor(s: UserStatus | undefined) {
  if (s === 'online') return 'bg-green-500';
  if (s === 'away') return 'bg-yellow-400';
  if (s === 'busy') return 'bg-red-500';
  return 'bg-gray-500';
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const COOKIE = 'dashboard_selection';
function saveSelection(value: object) {
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=604800; SameSite=Lax`;
}
function clearSelection() {
  document.cookie = `${COOKIE}=; path=/; max-age=0`;
}
function readSelection() {
  const match = document.cookie.split('; ').find(r => r.startsWith(`${COOKIE}=`));
  if (!match) return null;
  try { return JSON.parse(decodeURIComponent(match.slice(COOKIE.length + 1))); } catch { return null; }
}

export default function DashboardClient({ initialUser, initialServers, initialActiveServer, initialPendingChatroomId }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { servers: reduxServers, serverUserList, error: serverError, isLoading: serverLoading } = useAppSelector(s => s.server);
  const [serversFetched, setServersFetched] = useState(false);
  const servers = serversFetched || reduxServers.length > 0 ? reduxServers : initialServers;
  const { friends, isLoading: friendLoading } = useAppSelector(s => s.friend);
  const { chatrooms, isLoading: chatroomLoading } = useAppSelector(s => s.chatroom);
  const { isLoading: inviteLoading } = useAppSelector(s => s.invite);
  const { isLoading: categoryLoading } = useAppSelector(s => s.category);
  const { requests: pendingRequests } = useAppSelector(s => s.friendRequest);
  const isLoading = serverLoading || friendLoading || chatroomLoading || inviteLoading || categoryLoading;

  const hasRestored = useRef(initialActiveServer !== null);
  const pendingChatroomId = useRef<number | null>(initialPendingChatroomId);
  const shouldAutoSelectRef = useRef(initialActiveServer !== null && initialPendingChatroomId === null);

  const [activeServer, setActiveServer] = useState<Server | null>(initialActiveServer);
  const [activeChatroom, setActiveChatroom] = useState('');
  const [activeChatroomId, setActiveChatroomId] = useState<number | null>(null);
  const [activeChatroomType, setActiveChatroomType] = useState<'text' | 'voice'>('text');
  const [currentFriend, setCurrentFriend] = useState<Friend | null>(null);
  const [serverId, setServerId] = useState<number | null>(initialActiveServer?.serverId ?? null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [modal, setModal] = useState<'create' | 'join' | null>(null);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [sidebarOpen, setSidebarOpen] = useState(initialActiveServer === null);
  const [dmLastActivity, setDmLastActivity] = useState<Record<number, string>>({});
  const [isRestoringChatroom, setIsRestoringChatroom] = useState(initialPendingChatroomId !== null);
  const [userStatus, setUserStatus] = useState<UserStatus>('online');
  const [isAutomatic, setIsAutomatic] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserStatus>>(new Map());
  const [profileTarget, setProfileTarget] = useState<{ userId: number; username: string; imageUrl?: string | null; isSelf: boolean } | null>(null);
  const autoStatusRef = useRef<{ manual: boolean; timer: ReturnType<typeof setTimeout> | null }>({ manual: false, timer: null });
  const userStatusRef = useRef<UserStatus>('online');
  const [showNewDM, setShowNewDM] = useState(false);
  const [dmSearch, setDmSearch] = useState('');
  const [dmSearchResults, setDmSearchResults] = useState<{ id: number; username: string; imageUrl?: string | null }[]>([]);
  const dmSearchRef = useRef<HTMLInputElement>(null);
  const [friendRequestToast, setFriendRequestToast] = useState<string | null>(null);
  const [showFriendsModal, setShowFriendsModal] = useState(false);

  // Keep autoStatusRef in sync with isAutomatic
  useEffect(() => { autoStatusRef.current.manual = !isAutomatic; }, [isAutomatic]);

  const { id, email } = initialUser;
  const username = currentUser.username;
  const socket = getSocket();

  const playFriendRequestSound = () => {
    try {
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      [0, 0.18, 0.36].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        osc.connect(gain);
        osc.type = 'sine';
        osc.frequency.setValueAtTime([880, 1100, 1320][i], ctx.currentTime + offset);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.22);
        if (i === 2) osc.onended = () => ctx.close();
      });
    } catch {}
  };

  useEffect(() => {
    dispatch(findServer(id)).then(() => setServersFetched(true));
    dispatch(findFriends(id));
    dispatch(fetchPendingRequests(id));
    axios.get(`/api/v1/messages?lastActivity=true&userId=${id}`).then((r: { data: Record<number, string> }) => setDmLastActivity(r.data)).catch(() => {});
  }, [dispatch, id]);

  useEffect(() => {
    const handleUsers = (data: { userId: number; username: string; status: string }[]) => {
      const map = new Map<string, UserStatus>();
      data.forEach(u => { if (u.status !== 'offline') map.set(u.username, u.status as UserStatus); });
      setOnlineUsers(map);
    };
    const handleForceHome = () => {
      goHome();
      dispatch(findServer(id)).then(() => setServersFetched(true));
    };
    const handleReconnect = () => {
      dispatch(findServer(id)).then(() => setServersFetched(true));
    };
    const handleFriendRequest = (req: { senderUsername?: string }) => {
      dispatch(fetchPendingRequests(id));
      setFriendRequestToast(`Friend request from ${req?.senderUsername ?? 'someone'}`);
      setTimeout(() => setFriendRequestToast(null), 5000);
      playFriendRequestSound();
    };
    const handleFriendRequestAccepted = () => { dispatch(findFriends(id)); };
    const handleFriendRemoved = () => { dispatch(findFriends(id)); };
    socket.on('RECEIVE_USERS', handleUsers);
    socket.on('FORCE_HOME', handleForceHome);
    socket.on('connect', handleReconnect);
    socket.on('RECEIVE_FRIEND_REQUEST', handleFriendRequest);
    socket.on('FRIEND_REQUEST_ACCEPTED', handleFriendRequestAccepted);
    socket.on('FRIEND_REMOVED', handleFriendRemoved);
    socket.emit('SEND_USER', { userId: id, username, status: 'online' });
    socket.emit('GET_USERS');
    return () => {
      socket.off('RECEIVE_USERS', handleUsers);
      socket.off('FORCE_HOME', handleForceHome);
      socket.off('connect', handleReconnect);
      socket.off('RECEIVE_FRIEND_REQUEST', handleFriendRequest);
      socket.off('FRIEND_REQUEST_ACCEPTED', handleFriendRequestAccepted);
      socket.off('FRIEND_REMOVED', handleFriendRemoved);
    };
  }, [socket, id, username]);

  // Refresh presence once friends have loaded so DM dots populate
  const friendsLoadedRef = useRef(false);
  useEffect(() => {
    if (friends.length > 0 && !friendsLoadedRef.current) {
      friendsLoadedRef.current = true;
      socket.emit('GET_USERS');
    }
  }, [friends, socket]);

  // Keep currentFriend in sync with Redux so isFriend updates without navigation
  useEffect(() => {
    if (currentFriend) {
      const updated = friends.find(f => f.id === currentFriend.id);
      if (updated) setCurrentFriend(updated);
    }
  }, [friends]);

  useEffect(() => {
    if (serverId) {
      dispatch(getChatrooms(serverId));
      dispatch(findUserList(serverId));
      dispatch(categoryFindAll(serverId));
    }
  }, [serverId, dispatch]);

  useEffect(() => {
    const me = serverUserList.find(u => u.username === username);
    setIsAdmin(me?.type === 'admin' || me?.type === 'owner');
  }, [serverUserList, username]);

  // Restore selection from cookie once servers/friends have loaded (friend DM case, or fallback)
  useEffect(() => {
    if (hasRestored.current) return;
    const sel = readSelection();
    if (!sel) { hasRestored.current = true; return; }
    if ((sel.type === 'server' || sel.type === 'chatroom') && servers.length > 0) {
      const server = servers.find((s: Server) => s.serverId === sel.serverId);
      if (server) {
        setActiveServer(server);
        setServerId(server.serverId);
        if (sel.type === 'chatroom') { pendingChatroomId.current = sel.chatroomId; setSidebarOpen(false); setIsRestoringChatroom(true); }
        else { shouldAutoSelectRef.current = true; }
      }
      hasRestored.current = true;
    } else if (sel.type === 'friend' && friends.length > 0) {
      const friend = friends.find((f: Friend) => f.id === sel.friendId);
      if (friend) setCurrentFriend(friend);
      hasRestored.current = true;
    }
  }, [servers, friends]);

  // Restore or auto-select chatroom once chatrooms have loaded
  useEffect(() => {
    if (chatrooms.length === 0) return;
    if (pendingChatroomId.current) {
      const chatroom = chatrooms.find(c => c.id === pendingChatroomId.current);
      if (chatroom) {
        setActiveChatroom(chatroom.name);
        setActiveChatroomId(chatroom.id);
        setActiveChatroomType(chatroom.type);
        setSidebarOpen(false);
        pendingChatroomId.current = null;
      }
      setIsRestoringChatroom(false);
    } else if (shouldAutoSelectRef.current) {
      shouldAutoSelectRef.current = false;
      const sorted = [...chatrooms].sort((a, b) => {
        const pa = a.position ?? 999999;
        const pb = b.position ?? 999999;
        return pa !== pb ? pa - pb : a.id - b.id;
      });
      const first = sorted.find(c => c.type === 'text') ?? sorted[0];
      if (first) {
        setActiveChatroom(first.name);
        setActiveChatroomId(first.id);
        setActiveChatroomType(first.type);
        setSidebarOpen(false);
        saveSelection({ type: 'chatroom', serverId: first.serverId, chatroomId: first.id });
      }
    }
  }, [chatrooms]);

  const handleStatusChange = (value: UserStatus | 'automatic') => {
    if (value === 'automatic') {
      setIsAutomatic(true);
      // autoStatusRef.manual synced via useEffect; timer will run on next activity
      // immediately restore online
      setUserStatus('online');
      socket.emit('SET_STATUS', { username, status: 'online' });
    } else {
      setIsAutomatic(false);
      setUserStatus(value);
      socket.emit('SET_STATUS', { username, status: value });
    }
  };

  // Auto-status: away after 5 min inactivity, back to online on activity
  useEffect(() => { userStatusRef.current = userStatus; }, [userStatus]);

  useEffect(() => {
    const AWAY_MS = 60 * 1000;

    const resetTimer = () => {
      if (autoStatusRef.current.manual) return;
      if (autoStatusRef.current.timer) clearTimeout(autoStatusRef.current.timer);
      // If currently away due to inactivity, restore online
      if (userStatusRef.current === 'away') {
        setUserStatus('online');
        socket.emit('SET_STATUS', { username, status: 'online' });
      }
      autoStatusRef.current.timer = setTimeout(() => {
        if (autoStatusRef.current.manual) return;
        setUserStatus('away');
        socket.emit('SET_STATUS', { username, status: 'away' });
      }, AWAY_MS);
    };

    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    EVENTS.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      EVENTS.forEach(ev => window.removeEventListener(ev, resetTimer));
      if (autoStatusRef.current.timer) clearTimeout(autoStatusRef.current.timer);
    };
  }, [socket, username]);

  const handleLogout = async () => {
    socket.emit('LOGOUT_USER', { username });
    clearSelection();
    await dispatch(userLogout({ id }));
    router.push('/login');
  };

  const goHome = () => {
    setActiveServer(null);
    setServerId(null);
    setActiveChatroom('');
    setActiveChatroomId(null);
    setSidebarOpen(true);
    clearSelection();
  };

  const selectServer = (server: Server) => {
    shouldAutoSelectRef.current = true;
    setActiveServer(server);
    setServerId(server.serverId);
    setCurrentFriend(null);
    setActiveChatroom('');
    setActiveChatroomId(null);
    setSidebarOpen(true);
    saveSelection({ type: 'server', serverId: server.serverId });
  };

  const selectChatroom = (chatroom: ChatroomType) => {
    socket.emit('GET_USERS');
    setActiveChatroom(chatroom.name);
    setActiveChatroomId(chatroom.id);
    setActiveChatroomType(chatroom.type);
    setCurrentFriend(null);
    setSidebarOpen(false);
    saveSelection({ type: 'chatroom', serverId: activeServer?.serverId, chatroomId: chatroom.id });
  };

  const selectFriend = (friend: Friend) => {
    setCurrentFriend(friend);
    setActiveServer(null);
    setServerId(null);
    setActiveChatroom('');
    setActiveChatroomId(null);
    setSidebarOpen(false);
    saveSelection({ type: 'friend', friendId: friend.id });
  };

  const handleCloseDM = async (friendId: number | null, e: React.MouseEvent) => {
    e.stopPropagation();
    await dispatch(friendDelete({ userId: id, friendId }));
    if (currentFriend?.friendId === friendId) goHome();
  };

  const openNewDM = async () => {
    setShowNewDM(true);
    setDmSearch('');
    const res = await axios.get('/api/v1/users');
    setDmSearchResults(res.data as { id: number; username: string; imageUrl?: string | null }[]);
    setTimeout(() => dmSearchRef.current?.focus(), 50);
  };

  const handleAddFriend = async (targetUserId: number) => {
    const result = await dispatch(sendFriendRequest({ senderId: id, senderUsername: username, receiverId: targetUserId }));
    if (sendFriendRequest.fulfilled.match(result)) {
      socket.emit('SEND_FRIEND_REQUEST', { requestId: result.payload.id });
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    const result = await dispatch(respondToRequest({ requestId, action: 'accept' }));
    if (respondToRequest.fulfilled.match(result)) {
      socket.emit('FRIEND_REQUEST_ACCEPTED', { requestId });
      dispatch(findFriends(id));
    }
  };

  const handleDeclineRequest = async (requestId: number) => {
    dispatch(respondToRequest({ requestId, action: 'decline' }));
  };

  const handleUnfriend = async (targetFriendId: number) => {
    await dispatch(friendUnfriend({ userId: id, friendId: targetFriendId }));
    socket.emit('FRIEND_REMOVED', { userId: id, friendId: targetFriendId });
  };

  const openSavedMessages = async () => {
    const existing = friends.find(f => f.friendId === id);
    if (existing) {
      selectFriend(existing);
      return;
    }
    const result = await dispatch(friendCreate({
      userId: id,
      friendId: id,
      username,
      friendUsername: username,
      imageUrl: currentUser.imageUrl ?? null,
    }));
    if (friendCreate.fulfilled.match(result)) {
      const updatedFriends = result.payload as Friend[];
      const found = updatedFriends.find(f => f.friendId === id);
      if (found) selectFriend(found);
    }
  };

  const handleDMSearchSelect = async (user: { id: number; username: string; imageUrl?: string | null }) => {
    setShowNewDM(false);
    setDmSearch('');
    const result = await dispatch(friendCreate({
      userId: id,
      friendId: user.id,
      username: user.username,
      friendUsername: username,
      imageUrl: user.imageUrl ?? null,
    }));
    if (friendCreate.fulfilled.match(result)) {
      const updatedFriends = result.payload as Friend[];
      const found = updatedFriends.find(f => f.friendId === user.id);
      if (found) {
        setCurrentFriend(found);
        setActiveServer(null);
        setServerId(null);
        setSidebarOpen(false);
        saveSelection({ type: 'friend', friendId: found.id });
      }
    }
  };

  const handleStartDM = async (user: ServerUser) => {
    if (user.userId === id) return;
    const result = await dispatch(friendCreate({
      userId: id,
      friendId: user.userId,
      username: user.username,
      friendUsername: username,
      imageUrl: user.imageUrl ?? null,
    }));
    if (friendCreate.fulfilled.match(result)) {
      const updatedFriends = result.payload as Friend[];
      const found = updatedFriends.find(f => f.friendId === user.userId);
      if (found) {
        setCurrentFriend(found);
        setActiveServer(null);
        setServerId(null);
        setActiveChatroom('');
        setActiveChatroomId(null);
      }
    }
  };

  const isHome = !activeServer;

  // Drag left on sidebar → conversation panel slides in from the right on top
  const sidebarDragRef = useRef({ active: false, startX: 0, startY: 0, moved: false });
  const mainSlideXRef = useRef<number | null>(null);
  const [mainSlideX, setMainSlideX] = useState<number | null>(null);
  const currentFriendRef = useRef(currentFriend);
  useEffect(() => { currentFriendRef.current = currentFriend; }, [currentFriend]);

  const snapMainOpen = () => {
    sidebarDragRef.current.active = false;
    setMainSlideX(0);
    setTimeout(() => { setSidebarOpen(false); setMainSlideX(null); }, 260);
  };
  const snapMainClosed = () => {
    sidebarDragRef.current.active = false;
    const W = window.innerWidth;
    setMainSlideX(W);
    setTimeout(() => setMainSlideX(null), 260);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!sidebarDragRef.current.active) return;
      const W = window.innerWidth;
      const dx = Math.max(0, sidebarDragRef.current.startX - e.clientX);
      if (dx > 5) sidebarDragRef.current.moved = true;
      const val = Math.max(0, W - dx);
      mainSlideXRef.current = val;
      setMainSlideX(val);
    };
    const onMouseUp = () => {
      if (!sidebarDragRef.current.active) return;
      const moved = sidebarDragRef.current.moved;
      sidebarDragRef.current.active = false;
      sidebarDragRef.current.moved = false;
      if (!moved) { setMainSlideX(null); mainSlideXRef.current = null; return; }
      const W = window.innerWidth;
      const curr = mainSlideXRef.current ?? W;
      if (curr < W * 0.5 && currentFriendRef.current) {
        snapMainOpen();
      } else {
        snapMainClosed();
      }
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const handleSidebarTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, a, [role="button"]')) return;
    const W = window.innerWidth;
    sidebarDragRef.current = { active: true, startX: e.touches[0].clientX, startY: e.touches[0].clientY, moved: false };
    mainSlideXRef.current = W;
    setMainSlideX(W);
  };
  const handleSidebarTouchMove = (e: React.TouchEvent) => {
    if (!sidebarDragRef.current.active) return;
    const W = window.innerWidth;
    const dx = sidebarDragRef.current.startX - e.touches[0].clientX;
    const dy = Math.abs(e.touches[0].clientY - sidebarDragRef.current.startY);
    if (dy > 40 && !sidebarDragRef.current.moved) { sidebarDragRef.current.active = false; setMainSlideX(null); return; }
    if (dx > 5) sidebarDragRef.current.moved = true;
    const val = Math.max(0, W - Math.max(0, dx));
    mainSlideXRef.current = val;
    setMainSlideX(val);
  };
  const handleSidebarTouchEnd = () => {
    if (!sidebarDragRef.current.active) return;
    const W = window.innerWidth;
    const curr = mainSlideXRef.current ?? W;
    if (curr < W * 0.5 && sidebarDragRef.current.moved && currentFriend) {
      snapMainOpen();
    } else {
      snapMainClosed();
    }
    sidebarDragRef.current.moved = false;
  };

  // Swipe right on mobile main content to go back to sidebar
  const mainSwipeRef = useRef({ startX: 0, startY: 0 });
  const handleMainTouchStart = (e: React.TouchEvent) => {
    mainSwipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
  };
  const handleMainTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - mainSwipeRef.current.startX;
    const dy = Math.abs(e.changedTouches[0].clientY - mainSwipeRef.current.startY);
    if (dx > 60 && dy < Math.abs(dx) * 0.8) setSidebarOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-800 text-white">


      {/* Channel / DM sidebar */}
      <div
        className={`${sidebarOpen ? 'flex' : 'hidden'} md:flex fixed md:relative inset-0 md:inset-auto z-30 md:z-auto w-full md:w-64 flex-shrink-0 flex-row bg-gray-700`}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          if ((e.target as HTMLElement).closest('button, input, select, a, [role="button"]')) return;
          const W = window.innerWidth;
          sidebarDragRef.current = { active: true, startX: e.clientX, startY: e.clientY, moved: false };
          mainSlideXRef.current = W;
        }}
        onTouchStart={handleSidebarTouchStart}
        onTouchMove={handleSidebarTouchMove}
        onTouchEnd={handleSidebarTouchEnd}
      >
        {/* Vertical server rail — left side */}
        <div className="flex w-14 flex-shrink-0 flex-col items-center gap-2 overflow-y-auto bg-gray-900 py-3">
          <div className="relative">
            <button onClick={goHome} title="Home" className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-yellow-500 hover:bg-yellow-400 transition-all ${isHome ? 'ring-2 ring-green-500 rounded-xl' : ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.svg" alt="Meshyve" width={36} height={36} />
            </button>
            {pendingRequests.length > 0 && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white pointer-events-none">
                {pendingRequests.length}
              </span>
            )}
          </div>
          <div className="w-6 border-t border-gray-700" />
          {servers.filter(s => s.active !== false).map((s) => (
            <button key={s.serverId} onClick={() => selectServer(s)} title={s.name}
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden text-xs font-bold transition-all hover:rounded-xl ${activeServer?.serverId === s.serverId ? 'rounded-xl ring-2 ring-green-500' : 'rounded-full'} ${s.imageUrl ? '' : 'bg-gray-600 hover:bg-yellow-400'}`}>
              {s.imageUrl ? <Image src={s.imageUrl} alt={s.name} width={40} height={40} className="h-full w-full object-cover" /> : s.name?.[0]?.toUpperCase()}
            </button>
          ))}
          <button onClick={() => setModal('create')} title="Create a Server" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-green-400 hover:bg-green-500 hover:text-white transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
          <button onClick={() => setModal('join')} title="Join a Server" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-yellow-300 hover:bg-yellow-400 hover:text-gray-900 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          </button>
        </div>

        {/* Channel list — right side of sidebar */}
        <div className="flex flex-1 flex-col overflow-hidden">

        {activeServer ? (
          <ServerChannelList
            serverId={activeServer.serverId}
            serverName={activeServer.name}
            isAdmin={isAdmin}
            userId={id}
            serverUserList={serverUserList}
            activeChatroomId={activeChatroomId}
            onSelectChatroom={selectChatroom}
            onOpenSettings={() => setShowServerSettings(true)}
            onLeaveServer={async () => {
              await dispatch(kickServerUser({ serverId: activeServer.serverId, userId: id }));
              goHome();
              dispatch(findServer(id));
            }}
          />
        ) : (
          <>
            <div className="border-b border-gray-600 px-4 py-3 md:pb-2">
              {/* Single row on mobile */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Direct Messages</p>
                <div className="flex md:hidden items-center gap-3">
                  <button
                    onClick={() => setShowFriendsModal(true)}
                    className="relative rounded px-1.5 py-0.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-600 transition-colors"
                    title="Friends"
                  >
                    Friends
                    {pendingRequests.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                        {pendingRequests.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => showNewDM ? (setShowNewDM(false), setDmSearch('')) : openNewDM()}
                    className={`text-lg leading-none transition-colors ${showNewDM ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                    title={showNewDM ? 'Close' : 'New DM'}
                  >{showNewDM ? '×' : '+'}</button>
                </div>
              </div>
              {/* Second row on desktop only */}
              <div className="hidden md:flex items-center justify-between mt-1.5">
                <button
                  onClick={() => setShowFriendsModal(true)}
                  className="relative rounded pl-0 pr-1.5 py-0.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-600 transition-colors"
                  title="Friends"
                >
                  Friends
                  {pendingRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => showNewDM ? (setShowNewDM(false), setDmSearch('')) : openNewDM()}
                  className={`text-lg leading-none transition-colors ${showNewDM ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                  title={showNewDM ? 'Close' : 'New DM'}
                >{showNewDM ? '×' : '+'}</button>
              </div>
            </div>
            {showNewDM && (
              <div className="border-b border-gray-600 px-3 py-2">
                <input
                  ref={dmSearchRef}
                  type="text"
                  placeholder="Find a user…"
                  value={dmSearch}
                  onChange={e => setDmSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') { setShowNewDM(false); setDmSearch(''); } }}
                  className="w-full rounded bg-gray-700 px-2 py-1 text-sm text-white outline-none focus:ring-1 focus:ring-yellow-400"
                />
                <div className="mt-1 max-h-48 overflow-y-auto">
                  {dmSearchResults
                    .filter(u => u.id !== id && u.username.toLowerCase().includes(dmSearch.toLowerCase()))
                    .map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleDMSearchSelect(u)}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-700 text-left"
                      >
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white ring-1 ring-gray-600 overflow-hidden">
                          {u.imageUrl
                            ? <img src={u.imageUrl} alt={u.username} className="h-full w-full object-cover" />
                            : u.username[0]?.toUpperCase()
                          }
                        </div>
                        <span className="truncate text-white">{u.username}</span>
                      </button>
                    ))
                  }
                </div>
              </div>
            )}
            {/* Pending friend requests */}
            {pendingRequests.length > 0 && (
              <div className="border-b border-gray-600 px-3 py-2">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Friend Requests <span className="ml-1 rounded-full bg-yellow-500 px-1.5 py-0.5 text-xs text-gray-900">{pendingRequests.length}</span>
                </p>
                {pendingRequests.map(req => (
                  <div key={req.id} className="flex items-center gap-2 py-1.5">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 ring-1 ring-gray-600 text-sm font-bold text-white overflow-hidden">
                      {req.senderImageUrl
                        ? <img src={req.senderImageUrl} alt={req.senderUsername} className="h-full w-full object-cover" />
                        : req.senderUsername[0]?.toUpperCase()
                      }
                    </div>
                    <span className="flex-1 truncate text-sm text-white">{req.senderUsername}</span>
                    <button onClick={() => handleAcceptRequest(req.id)} className="rounded bg-green-600 px-2 py-0.5 text-xs text-white hover:bg-green-500">✓</button>
                    <button onClick={() => handleDeclineRequest(req.id)} className="rounded bg-gray-600 px-2 py-0.5 text-xs text-white hover:bg-gray-500">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-y-auto py-2">
              {/* Saved Messages (note to self) */}
              <div
                onClick={openSavedMessages}
                className={`flex w-full cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-600 border-l-2 ${currentFriend?.friendId === id ? 'bg-gray-600 border-green-500' : 'border-transparent'}`}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-base">
                  🔖
                </div>
                <span className="text-sm font-medium text-white">Saved Messages</span>
              </div>
              {friends.filter(f => f.activeFriend !== false && f.friendId !== id).map((f, i) => {
                const lastAt = f.friendId != null ? dmLastActivity[f.friendId] : undefined;
                const relativeTime = lastAt ? formatRelative(lastAt) : null;
                return (
                  <div
                    key={i}
                    onClick={() => selectFriend(f)}
                    className={`group flex w-full cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-600 border-l-2 ${currentFriend?.id === f.id ? 'bg-gray-600 border-green-500' : 'border-transparent'}`}
                  >
                    <div
                      className="relative flex-shrink-0"
                      onClick={e => { e.stopPropagation(); setProfileTarget({ userId: f.friendId ?? f.userId, username: f.username, isSelf: false }); }}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 ring-1 ring-gray-600 text-sm font-bold text-white hover:opacity-80 transition-opacity overflow-hidden">
                        {f.imageUrl
                          ? <img src={f.imageUrl} alt={f.username} className="h-full w-full object-cover" />
                          : f.username[0]?.toUpperCase()
                        }
                      </div>
                      <span className={`absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-2 border-gray-700 ${statusColor(onlineUsers.get(f.username))}`} />
                    </div>
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="truncate text-sm font-medium text-white">{f.username}</span>
                      {relativeTime && <span className="text-xs text-gray-400">{relativeTime}</span>}
                    </div>
                    <button
                      onClick={e => handleCloseDM(f.friendId, e)}
                      className="ml-auto hidden group-hover:flex items-center justify-center text-gray-500 hover:text-white"
                      title="Close DM"
                    >✕</button>
                  </div>
                );
              })}
            </div>
            {/* User info bar */}
            <div className="flex items-center gap-2 border-t border-r border-gray-600 bg-gray-700 px-3 py-2">
              <button
                className="relative flex-shrink-0"
                onClick={() => setProfileTarget({ userId: id, username, imageUrl: currentUser.imageUrl, isSelf: true })}
                title="View profile"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 ring-1 ring-gray-600 text-xs font-bold text-white overflow-hidden hover:opacity-80 transition-opacity">
                  {currentUser.imageUrl
                    ? <img src={currentUser.imageUrl} alt={username} className="h-full w-full object-cover" />
                    : username[0]?.toUpperCase()
                  }
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-gray-800 ${statusColor(userStatus)}`} />
              </button>
              <div className="flex flex-1 min-w-0 flex-col">
                <span className="truncate text-xs font-semibold" style={{ color: currentUser.nameColor || '#fde047' }}>{username}</span>
                <select
                  value={isAutomatic ? 'automatic' : userStatus}
                  onChange={e => handleStatusChange(e.target.value as UserStatus | 'automatic')}
                  className="w-auto max-w-fit bg-transparent text-xs text-gray-400 outline-none cursor-pointer"
                >
                  <option value="automatic">Automatic</option>
                  <option value="online">Online</option>
                  <option value="away">Away</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Invisible</option>
                </select>
              </div>
              <button onClick={() => setShowUserSettings(true)} title="Settings" className="text-gray-400 hover:text-white text-xs">⚙</button>
              <button onClick={handleLogout} title="Logout" className="text-gray-400 hover:text-red-400 text-xs">⏻</button>
            </div>
          </>
        )}
        </div> {/* end channel list */}
      </div> {/* end sidebar */}

      {/* Main content — slides in from right on top of sidebar when dragging */}
      <div
        className={mainSlideX !== null
          ? 'fixed inset-0 z-40 flex flex-col overflow-hidden bg-gray-800'
          : `${sidebarOpen ? 'hidden' : 'flex'} md:flex flex-1 flex-col overflow-hidden min-w-0`}
        style={mainSlideX !== null ? {
          transform: `translateX(${mainSlideX}px)`,
          transition: sidebarDragRef.current.active ? 'none' : 'transform 0.26s ease',
        } : undefined}
        onTouchStart={handleMainTouchStart}
        onTouchEnd={handleMainTouchEnd}
      >
        {/* Mobile top bar */}
        <div className="flex md:hidden items-center gap-2 border-b border-gray-600 bg-gray-700 px-3 py-2 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-300 hover:text-white text-xl leading-none px-1">‹</button>
          <span className="truncate text-sm font-semibold">{activeChatroom || currentFriend?.username || 'Home'}</span>
        </div>
        {activeChatroomId && serverId && !currentFriend && activeChatroomType === 'text' && (
          <Chatroom
            userId={id}
            username={username}
            currentUserImageUrl={currentUser?.imageUrl ?? null}
            activeChatroom={activeChatroom}
            activeChatroomId={activeChatroomId}
            activeChatroomType={activeChatroomType}
            serverId={serverId}
            isAdmin={isAdmin}
            serverUserList={serverUserList}
            onlineUsers={onlineUsers}
            onStartDM={handleStartDM}
            onEditProfile={() => setShowUserSettings(true)}
            nameColor={currentUser.nameColor}
            onAddFriend={handleAddFriend}
            onAcceptRequest={handleAcceptRequest}
            onUnfriend={handleUnfriend}
          />
        )}
        {activeChatroomId && serverId && !currentFriend && activeChatroomType === 'voice' && (
          <VoiceRoom
            username={username}
            activeChatroom={activeChatroom}
            activeChatroomId={activeChatroomId}
            serverId={serverId}
          />
        )}
        {currentFriend && (
          <ChatroomFriend
            userId={id}
            username={username}
            friendUsername={currentFriend.friendId === id ? 'Saved Messages' : currentFriend.username}
            currentUserImageUrl={currentUser?.imageUrl ?? null}
            friendId={currentFriend.friendId}
            groupId={currentFriend.groupId}
            isFriend={currentFriend.isFriend ?? false}
            incomingRequest={pendingRequests.find(r => r.senderId === currentFriend.friendId) ?? null}
            onEditProfile={() => setShowUserSettings(true)}
            nameColor={currentUser.nameColor}
            onAddFriend={currentFriend.friendId !== id ? () => handleAddFriend(currentFriend.friendId!) : undefined}
            onAcceptRequest={currentFriend.friendId !== id ? (requestId) => handleAcceptRequest(requestId) : undefined}
            onUnfriend={currentFriend.friendId !== id ? () => handleUnfriend(currentFriend.friendId!) : undefined}
          />
        )}
        {/* Home screen: show create/join cards */}
        {isHome && !currentFriend && (
          <div className="flex flex-1 items-center justify-center p-4">
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
              <div className="flex flex-1 flex-col items-center rounded-lg bg-gray-700 p-6 text-center">
                <h2 className="mb-2 text-lg font-bold text-white">Create</h2>
                <p className="mb-4 text-sm text-gray-400">Create a new server and invite other people to join!</p>
                <button
                  onClick={() => setModal('create')}
                  className="rounded bg-yellow-500 px-4 py-2 text-sm text-gray-900 hover:bg-yellow-600"
                >
                  Create a server
                </button>
              </div>
              <div className="flex flex-1 flex-col items-center rounded-lg bg-gray-700 p-6 text-center">
                <h2 className="mb-2 text-lg font-bold text-white">Join</h2>
                <p className="mb-4 text-sm text-gray-400">Enter a secret invite code to join an existing server!</p>
                <button
                  onClick={() => setModal('join')}
                  className="rounded bg-yellow-500 px-4 py-2 text-sm text-gray-900 hover:bg-yellow-600"
                >
                  Join a server
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Loading spinner while restoring chatroom */}
        {activeServer && !activeChatroomId && !currentFriend && isRestoringChatroom && (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-600 border-t-yellow-400" />
          </div>
        )}
      </div>

      {modal === 'create' && (
        <CreateServer
          userId={id}
          onClose={() => setModal(null)}
          onSuccess={() => setModal(null)}
        />
      )}
      {modal === 'join' && (
        <JoinServer
          userId={id}
          email={email}
          onClose={() => setModal(null)}
          onSuccess={(newServerId) => {
            setModal(null);
            dispatch(findServer(id)).then((result) => {
              if (findServer.fulfilled.match(result)) {
                const joined = (result.payload as Server[]).find(s => s.serverId === newServerId);
                if (joined) selectServer(joined);
              }
            });
          }}
        />
      )}

      {showServerSettings && activeServer && (
        <ServerSettings
          serverId={activeServer.serverId}
          serverName={activeServer.name}
          currentUsername={username}
          userId={id}
          onClose={() => setShowServerSettings(false)}
          onServerDeleted={() => { setShowServerSettings(false); setActiveServer(null); setServerId(null); dispatch(findServer(id)); }}
          onServerUpdated={() => dispatch(findServer(id))}
        />
      )}

      {showUserSettings && (
        <UserSettings
          user={currentUser}
          onClose={() => setShowUserSettings(false)}
          onSaved={(updated) => {
            setCurrentUser(u => ({ ...u, ...updated }));
            if ('nameColor' in updated) dispatch(patchUserNameColor({ username, nameColor: updated.nameColor ?? null }));
          }}
        />
      )}

      {profileTarget && (
        <UserProfileModal
          userId={profileTarget.userId}
          username={profileTarget.username}
          imageUrl={profileTarget.imageUrl}
          status={profileTarget.isSelf ? userStatus : onlineUsers.get(profileTarget.username)}
          isSelf={profileTarget.isSelf}
          currentUserId={id}
          onClose={() => setProfileTarget(null)}
          onSendMessage={!profileTarget.isSelf ? () => {
            const friend = friends.find(f => f.friendId === profileTarget.userId || f.userId === profileTarget.userId);
            if (friend) selectFriend(friend);
          } : undefined}
          onAddFriend={!profileTarget.isSelf ? () => handleAddFriend(profileTarget.userId) : undefined}
          onAcceptRequest={!profileTarget.isSelf ? (requestId) => handleAcceptRequest(requestId) : undefined}
          onUnfriend={!profileTarget.isSelf ? () => handleUnfriend(profileTarget.userId) : undefined}
          onEditProfile={() => { setProfileTarget(null); setShowUserSettings(true); }}
        />
      )}

      {showFriendsModal && (
        <FriendsModal
          friends={friends}
          currentUserId={id}
          onlineUsers={onlineUsers}
          pendingRequests={pendingRequests}
          onClose={() => setShowFriendsModal(false)}
          onMessage={(friend) => selectFriend(friend)}
          onUnfriend={(friendId) => handleUnfriend(friendId)}
          onAcceptRequest={(requestId) => handleAcceptRequest(requestId)}
          onDeclineRequest={(requestId) => handleDeclineRequest(requestId)}
        />
      )}

      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-600 border-t-yellow-400" />
        </div>
      )}

      {serverError && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-lg bg-red-600 px-5 py-3 shadow-xl">
          <span className="text-sm text-white">Something went wrong. Please try again.</span>
          <button onClick={() => dispatch(resetServerValues())} className="text-white hover:text-red-200 text-lg leading-none">✕</button>
        </div>
      )}

      {friendRequestToast && (
        <div
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-lg bg-teal-600 px-5 py-3 shadow-xl cursor-pointer"
          onClick={() => { goHome(); setFriendRequestToast(null); }}
        >
          <span className="text-sm text-white">👋 {friendRequestToast} — click to view</span>
          <button onClick={e => { e.stopPropagation(); setFriendRequestToast(null); }} className="text-white hover:text-teal-200 text-lg leading-none">✕</button>
        </div>
      )}
    </div>
  );
}
