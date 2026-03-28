import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import type { Friend } from '@/lib/types';

const TTL = 30_000;

interface FriendState {
  friends: Friend[];
  isLoading: boolean;
  error: boolean;
  success: boolean;
  fetchedAt: number | null;
  fetchedForId: number | null;
}

const initialState: FriendState = {
  friends: [],
  isLoading: false,
  error: false,
  success: false,
  fetchedAt: null,
  fetchedForId: null,
};

export const friendCreate = createAsyncThunk(
  'friend/create',
  async (params: Record<string, unknown>) => {
    const res = await axios.post('/api/v1/friends', params);
    return res.data;
  }
);

export const friendDelete = createAsyncThunk(
  'friend/delete',
  async (params: Record<string, unknown>) => {
    const res = await axios.delete('/api/v1/friends', { data: params });
    return res.data;
  }
);

export const friendUnfriend = createAsyncThunk(
  'friend/unfriend',
  async (params: { userId: number; friendId: number }) => {
    await axios.patch('/api/v1/friends', params);
    const res = await axios.get('/api/v1/friends', { params: { userId: params.userId } });
    return res.data;
  }
);

export const findFriends = createAsyncThunk(
  'friend/findAll',
  async (userId: number) => {
    const res = await axios.get('/api/v1/friends', { params: { userId } });
    return res.data;
  },
  {
    condition: (userId, { getState }) => {
      const { friend } = getState() as { friend: FriendState };
      if (friend.isLoading) return false;
      if (friend.fetchedForId === userId && friend.fetchedAt && Date.now() - friend.fetchedAt < TTL)
        return false;
      return true;
    },
  }
);

const friendSlice = createSlice({
  name: 'friend',
  initialState,
  reducers: { resetFriendValues: () => initialState },
  extraReducers: (builder) => {
    builder.addCase(friendCreate.pending, (s) => {
      s.error = false;
    });
    builder.addCase(friendCreate.fulfilled, (s, a) => {
      s.friends = a.payload;
      s.success = true;
    });
    builder.addCase(friendCreate.rejected, (s) => {
      s.error = true;
    });

    builder.addCase(friendDelete.pending, (s) => {
      s.error = false;
    });
    builder.addCase(friendDelete.fulfilled, (s, a) => {
      s.friends = a.payload;
    });
    builder.addCase(friendDelete.rejected, (s) => {
      s.error = true;
    });

    builder.addCase(friendUnfriend.fulfilled, (s, a) => {
      s.friends = a.payload;
    });

    builder.addCase(findFriends.pending, (s) => {
      s.error = false;
    });
    builder.addCase(findFriends.fulfilled, (s, a) => {
      s.friends = a.payload;
      s.fetchedAt = Date.now();
      s.fetchedForId = a.meta.arg;
    });
    builder.addCase(findFriends.rejected, (s) => {
      s.error = true;
    });
  },
});

export const { resetFriendValues } = friendSlice.actions;
export default friendSlice.reducer;
