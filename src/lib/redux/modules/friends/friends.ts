import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import type { Friend } from '@/lib/types';

interface FriendState {
  friends: Friend[];
  isLoading: boolean;
  error: boolean;
  success: boolean;
}

const initialState: FriendState = { friends: [], isLoading: false, error: false, success: false };

export const friendCreate = createAsyncThunk('friend/create', async (params: Record<string, unknown>) => {
  const res = await axios.post('/api/v1/friends', params);
  return res.data;
});

export const friendDelete = createAsyncThunk('friend/delete', async (params: Record<string, unknown>) => {
  const res = await axios.delete('/api/v1/friends', { data: params });
  return res.data;
});

export const friendUnfriend = createAsyncThunk('friend/unfriend', async (params: { userId: number; friendId: number }) => {
  await axios.patch('/api/v1/friends', params);
  const res = await axios.get('/api/v1/friends', { params: { userId: params.userId } });
  return res.data;
});

export const findFriends = createAsyncThunk('friend/findAll', async (userId: number) => {
  const res = await axios.get('/api/v1/friends', { params: { userId } });
  return res.data;
});

const friendSlice = createSlice({
  name: 'friend',
  initialState,
  reducers: { resetFriendValues: () => initialState },
  extraReducers: builder => {
    builder.addCase(friendCreate.pending, s => { s.error = false; });
    builder.addCase(friendCreate.fulfilled, (s, a) => { s.friends = a.payload; s.success = true; });
    builder.addCase(friendCreate.rejected, s => { s.error = true; });

    builder.addCase(friendDelete.pending, s => { s.error = false; });
    builder.addCase(friendDelete.fulfilled, (s, a) => { s.friends = a.payload; });
    builder.addCase(friendDelete.rejected, s => { s.error = true; });

    builder.addCase(friendUnfriend.fulfilled, (s, a) => { s.friends = a.payload; });

    builder.addCase(findFriends.pending, s => { s.error = false; });
    builder.addCase(findFriends.fulfilled, (s, a) => { s.friends = a.payload; });
    builder.addCase(findFriends.rejected, s => { s.error = true; });
  },
});

export const { resetFriendValues } = friendSlice.actions;
export default friendSlice.reducer;
