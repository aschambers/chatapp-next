'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';

type UserStatus = 'online' | 'away' | 'busy' | 'offline';

const STATUS_COLOR: Record<UserStatus, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-400',
  busy: 'bg-red-500',
  offline: 'bg-gray-500',
};

const STATUS_LABEL: Record<UserStatus, string> = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline',
};

interface UserProfile {
  id: number;
  username: string;
  imageUrl: string | null;
  createdAt: string;
}

interface Props {
  userId: number;
  username: string;
  imageUrl?: string | null;
  status?: UserStatus;
  isSelf: boolean;
  serverJoinedAt?: string;
  onClose: () => void;
  onSendMessage?: () => void;
  onEditProfile?: () => void;
}

export default function UserProfileModal({
  userId,
  username,
  imageUrl: imageUrlProp,
  status,
  isSelf,
  serverJoinedAt,
  onClose,
  onSendMessage,
  onEditProfile,
}: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    axios.get(`/api/v1/users?userId=${userId}`)
      .then(r => setProfile(r.data))
      .catch(() => {});
  }, [userId]);

  const displayImage = profile?.imageUrl ?? imageUrlProp;
  const memberSince = profile?.createdAt ? dayjs(profile.createdAt).format('MMMM D, YYYY') : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-[5%] sm:px-0"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-lg bg-gray-800 shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-3 z-10 text-gray-400 hover:text-white text-xl leading-none"
        >
          ✕
        </button>

        {/* Banner */}
        <div className="h-16 bg-indigo-700" />

        <div className="px-5 pb-5">
          {/* Avatar */}
          <div className="relative -mt-8 mb-3 inline-block">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-indigo-600 text-xl font-bold ring-4 ring-gray-800">
              {displayImage
                ? <img src={displayImage} alt={username} className="h-full w-full object-cover" />
                : username[0]?.toUpperCase()
              }
            </div>
            {status && (
              <span className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-gray-800 ${STATUS_COLOR[status]}`} />
            )}
          </div>

          {/* Action buttons */}
          <div className="float-right mt-5">
            {!isSelf && onSendMessage && (
              <button
                onClick={() => { onSendMessage(); onClose(); }}
                className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
              >
                Send Message
              </button>
            )}
            {isSelf && onEditProfile && (
              <button
                onClick={() => { onEditProfile(); onClose(); }}
                className="rounded bg-gray-600 px-3 py-1.5 text-sm text-white hover:bg-gray-500"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Username */}
          <h2 className="text-lg font-bold text-white leading-tight">{username}</h2>

          {/* Status */}
          {status && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-2 w-2 rounded-full ${STATUS_COLOR[status]}`} />
              <span className="text-xs text-gray-400">{STATUS_LABEL[status]}</span>
            </div>
          )}

          {/* Member since */}
          {memberSince && (
            <div className="mt-4 border-t border-gray-700 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-0.5">Member Since</p>
              <p className="text-sm text-gray-200">{memberSince}</p>
            </div>
          )}

          {/* Server member since */}
          {serverJoinedAt && (
            <div className="mt-3 border-t border-gray-700 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-0.5">Member in Server Since</p>
              <p className="text-sm text-gray-200">{dayjs(serverJoinedAt).format('MMMM D, YYYY')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
