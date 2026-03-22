'use client';

import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AppDispatch, useAppSelector } from '@/lib/redux/store';
import { findServer, findUserList, resetServerValues } from '@/lib/redux/modules/servers/servers';
import { friendCreate, findFriends } from '@/lib/redux/modules/friends/friends';
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
  const servers = reduxServers.length > 0 ? reduxServers : initialServers;
  const { friends, isLoading: friendLoading } = useAppSelector(s => s.friend);
  const { chatrooms, isLoading: chatroomLoading } = useAppSelector(s => s.chatroom);
  const { isLoading: inviteLoading } = useAppSelector(s => s.invite);
  const { isLoading: categoryLoading } = useAppSelector(s => s.category);
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

  // Keep autoStatusRef in sync with isAutomatic
  useEffect(() => { autoStatusRef.current.manual = !isAutomatic; }, [isAutomatic]);

  const { id, email } = initialUser;
  const username = currentUser.username;
  const socket = getSocket();

  useEffect(() => {
    dispatch(findServer(id));
    dispatch(findFriends(id));
    axios.get(`/api/v1/messages?lastActivity=true&userId=${id}`).then((r: { data: Record<number, string> }) => setDmLastActivity(r.data)).catch(() => {});
  }, [dispatch, id]);

  useEffect(() => {
    const handleUsers = (data: { userId: number; username: string; status: string }[]) => {
      const map = new Map<string, UserStatus>();
      data.forEach(u => { if (u.status !== 'offline') map.set(u.username, u.status as UserStatus); });
      setOnlineUsers(map);
    };
    socket.on('RECEIVE_USERS', handleUsers);
    // Register listener first, then emit so response is never missed
    socket.emit('SEND_USER', { userId: id, username, status: 'online' });
    socket.emit('GET_USERS');
    return () => { socket.off('RECEIVE_USERS', handleUsers); };
  }, [socket, id, username]);

  // Refresh presence once friends have loaded so DM dots populate
  const friendsLoadedRef = useRef(false);
  useEffect(() => {
    if (friends.length > 0 && !friendsLoadedRef.current) {
      friendsLoadedRef.current = true;
      socket.emit('GET_USERS');
    }
  }, [friends, socket]);

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

  const handleStartDM = async (user: ServerUser) => {
    const result = await dispatch(friendCreate({
      userId: id,
      friendId: user.userId,
      username: user.username,
      friendUsername: user.username,
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
          <button onClick={goHome} title="Home" className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 transition-all ${isHome ? 'ring-2 ring-green-500 rounded-xl' : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.svg" alt="Sanctrel" width={36} height={36} />
          </button>
          <div className="w-6 border-t border-gray-700" />
          {servers.filter(s => s.active !== false).map((s) => (
            <button key={s.serverId} onClick={() => selectServer(s)} title={s.name}
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden text-xs font-bold transition-all hover:rounded-xl ${activeServer?.serverId === s.serverId ? 'rounded-xl ring-2 ring-green-500' : 'rounded-full'} ${s.imageUrl ? '' : 'bg-gray-600 hover:bg-indigo-500'}`}>
              {s.imageUrl ? <Image src={s.imageUrl} alt={s.name} width={40} height={40} className="h-full w-full object-cover" /> : s.name?.[0]?.toUpperCase()}
            </button>
          ))}
          <button onClick={() => setModal('create')} title="Create a Server" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-green-400 hover:bg-green-500 hover:text-white transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
          <button onClick={() => setModal('join')} title="Join a Server" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all">
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
            activeChatroomId={activeChatroomId}
            onSelectChatroom={selectChatroom}
            onOpenSettings={() => setShowServerSettings(true)}
          />
        ) : (
          <>
            <div className="border-b border-gray-600 px-4 py-3">
              <p className="text-sm font-bold">Direct Messages</p>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {friends.map((f, i) => {
                const lastAt = f.friendId != null ? dmLastActivity[f.friendId] : undefined;
                const relativeTime = lastAt ? formatRelative(lastAt) : null;
                return (
                  <button
                    key={i}
                    onClick={() => selectFriend(f)}
                    className={`flex w-full items-center gap-3 px-3 py-2 hover:bg-gray-600 border-l-2 ${currentFriend?.id === f.id ? 'bg-gray-600 border-green-500' : 'border-transparent'}`}
                  >
                    <div
                      className="relative flex-shrink-0"
                      onClick={e => { e.stopPropagation(); setProfileTarget({ userId: f.friendId ?? f.userId, username: f.username, isSelf: false }); }}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold hover:opacity-80 transition-opacity">
                        {f.username[0]?.toUpperCase()}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-gray-700 ${statusColor(onlineUsers.get(f.username))}`} />
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                      <span className="truncate text-sm font-medium text-white">{f.username}</span>
                      {relativeTime && <span className="text-xs text-gray-400">{relativeTime}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            {/* User info bar */}
            <div className="flex items-center gap-2 border-t border-gray-600 bg-gray-800 px-3 py-2">
              <button
                className="relative flex-shrink-0"
                onClick={() => setProfileTarget({ userId: id, username, imageUrl: currentUser.imageUrl, isSelf: true })}
                title="View profile"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold overflow-hidden hover:opacity-80 transition-opacity">
                  {currentUser.imageUrl
                    ? <img src={currentUser.imageUrl} alt={username} className="h-full w-full object-cover" />
                    : username[0]?.toUpperCase()
                  }
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-gray-800 ${statusColor(userStatus)}`} />
              </button>
              <div className="flex flex-1 min-w-0 flex-col">
                <span className="truncate text-xs font-semibold">{username}</span>
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
            currentUserImageUrl={currentUser?.imageUrl ?? null}
            friendId={currentFriend.friendId}
            groupId={currentFriend.groupId}
            onEditProfile={() => setShowUserSettings(true)}
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
                  className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                >
                  Create a server
                </button>
              </div>
              <div className="flex flex-1 flex-col items-center rounded-lg bg-gray-700 p-6 text-center">
                <h2 className="mb-2 text-lg font-bold text-white">Join</h2>
                <p className="mb-4 text-sm text-gray-400">Enter a secret invite code to join an existing server!</p>
                <button
                  onClick={() => setModal('join')}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
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
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-600 border-t-indigo-500" />
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
          onSuccess={() => setModal(null)}
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
          onSaved={(updated) => setCurrentUser(u => ({ ...u, ...updated }))}
        />
      )}

      {profileTarget && (
        <UserProfileModal
          userId={profileTarget.userId}
          username={profileTarget.username}
          imageUrl={profileTarget.imageUrl}
          status={profileTarget.isSelf ? userStatus : onlineUsers.get(profileTarget.username)}
          isSelf={profileTarget.isSelf}
          onClose={() => setProfileTarget(null)}
          onSendMessage={!profileTarget.isSelf ? () => {
            const friend = friends.find(f => f.friendId === profileTarget.userId || f.userId === profileTarget.userId);
            if (friend) selectFriend(friend);
          } : undefined}
          onEditProfile={() => { setProfileTarget(null); setShowUserSettings(true); }}
        />
      )}

      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-600 border-t-indigo-500" />
        </div>
      )}

      {serverError && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-lg bg-red-600 px-5 py-3 shadow-xl">
          <span className="text-sm text-white">Something went wrong. Please try again.</span>
          <button onClick={() => dispatch(resetServerValues())} className="text-white hover:text-red-200 text-lg leading-none">✕</button>
        </div>
      )}
    </div>
  );
}
