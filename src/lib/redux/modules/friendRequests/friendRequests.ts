import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export interface FriendRequest {
  id: number;
  senderId: number;
  senderUsername: string;
  senderImageUrl: string | null;
  receiverId: number;
  receiverUsername: string;
  status: string;
  createdAt: string;
}

interface FriendRequestState {
  requests: FriendRequest[];
  isLoading: boolean;
  error: boolean;
}

const initialState: FriendRequestState = { requests: [], isLoading: false, error: false };

export const fetchPendingRequests = createAsyncThunk(
  'friendRequest/fetchPending',
  async (userId: number) => {
    const res = await axios.get('/api/v1/friend-requests', { params: { userId } });
    return res.data as FriendRequest[];
  }
);

export const sendFriendRequest = createAsyncThunk(
  'friendRequest/send',
  async (params: { senderId: number; senderUsername: string; receiverId: number }) => {
    const res = await axios.post('/api/v1/friend-requests', params);
    return res.data as FriendRequest;
  }
);

export const respondToRequest = createAsyncThunk(
  'friendRequest/respond',
  async (params: { requestId: number; action: 'accept' | 'decline' }) => {
    const res = await axios.put('/api/v1/friend-requests', params);
    return res.data;
  }
);

export const checkFriendRequest = createAsyncThunk(
  'friendRequest/check',
  async (params: { senderId: number; receiverId: number }) => {
    const res = await axios.get('/api/v1/friend-requests', {
      params: { senderId: params.senderId, receiverId: params.receiverId },
    });
    return res.data as FriendRequest | null;
  }
);

const friendRequestSlice = createSlice({
  name: 'friendRequest',
  initialState,
  reducers: { resetFriendRequestValues: () => initialState },
  extraReducers: builder => {
    builder.addCase(fetchPendingRequests.pending, s => { s.isLoading = true; s.error = false; });
    builder.addCase(fetchPendingRequests.fulfilled, (s, a) => { s.isLoading = false; s.requests = a.payload; });
    builder.addCase(fetchPendingRequests.rejected, s => { s.isLoading = false; s.error = true; });

    builder.addCase(sendFriendRequest.pending, s => { s.isLoading = true; s.error = false; });
    builder.addCase(sendFriendRequest.fulfilled, s => { s.isLoading = false; });
    builder.addCase(sendFriendRequest.rejected, s => { s.isLoading = false; s.error = true; });

    builder.addCase(respondToRequest.pending, s => { s.isLoading = true; s.error = false; });
    builder.addCase(respondToRequest.fulfilled, (s, a) => {
      s.isLoading = false;
      // Remove the request from the pending list after responding
      const requestId = a.meta.arg.requestId;
      s.requests = s.requests.filter(r => r.id !== requestId);
    });
    builder.addCase(respondToRequest.rejected, s => { s.isLoading = false; s.error = true; });

    builder.addCase(checkFriendRequest.pending, s => { s.isLoading = true; s.error = false; });
    builder.addCase(checkFriendRequest.fulfilled, s => { s.isLoading = false; });
    builder.addCase(checkFriendRequest.rejected, s => { s.isLoading = false; s.error = true; });
  },
});

export const { resetFriendRequestValues } = friendRequestSlice.actions;
export default friendRequestSlice.reducer;
