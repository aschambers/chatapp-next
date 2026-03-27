import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import type { Chatroom } from '@/lib/types';

interface ChatroomState {
  chatrooms: Chatroom[];
  isLoading: boolean;
  error: boolean;
  success: boolean;
  updateChatroomSuccess: boolean;
}

const initialState: ChatroomState = {
  chatrooms: [],
  isLoading: false,
  error: false,
  success: false,
  updateChatroomSuccess: false,
};

export const createChatroom = createAsyncThunk(
  'chatroom/create',
  async (params: Record<string, unknown>) => {
    const res = await axios.post('/api/v1/chatrooms', params);
    return res.data;
  }
);

export const getChatrooms = createAsyncThunk('chatroom/getAll', async (serverId: number) => {
  const res = await axios.get('/api/v1/chatrooms', { params: { serverId } });
  return res.data;
});

export const deleteChatroom = createAsyncThunk(
  'chatroom/delete',
  async (params: Record<string, unknown>) => {
    const res = await axios.delete('/api/v1/chatrooms', { data: params });
    return res.data;
  }
);

export const updateChatroom = createAsyncThunk(
  'chatroom/update',
  async (params: Record<string, unknown>) => {
    const res = await axios.put('/api/v1/chatrooms', params);
    return res.data;
  }
);

export const reorderChatrooms = createAsyncThunk(
  'chatroom/reorder',
  async (chatroomIds: number[]) => {
    const res = await axios.patch('/api/v1/chatrooms', { chatroomIds });
    return res.data;
  }
);

const chatroomSlice = createSlice({
  name: 'chatroom',
  initialState,
  reducers: {
    resetChatroomValues: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(createChatroom.pending, (s) => {
      s.isLoading = true;
      s.error = false;
      s.success = false;
    });
    builder.addCase(createChatroom.fulfilled, (s, a) => {
      s.isLoading = false;
      s.success = true;
      s.chatrooms = a.payload;
    });
    builder.addCase(createChatroom.rejected, (s) => {
      s.isLoading = false;
      s.error = true;
    });

    builder.addCase(getChatrooms.pending, (s) => {
      s.error = false;
    });
    builder.addCase(getChatrooms.fulfilled, (s, a) => {
      s.chatrooms = a.payload;
    });
    builder.addCase(getChatrooms.rejected, (s) => {
      s.error = true;
    });

    builder.addCase(deleteChatroom.pending, (s) => {
      s.error = false;
    });
    builder.addCase(deleteChatroom.fulfilled, (s, a) => {
      s.success = true;
      s.chatrooms = s.chatrooms.filter((c) => c.id !== a.meta.arg.chatroomId);
    });
    builder.addCase(deleteChatroom.rejected, (s) => {
      s.error = true;
    });

    builder.addCase(updateChatroom.pending, (s) => {
      s.error = false;
    });
    builder.addCase(updateChatroom.fulfilled, (s, a) => {
      s.updateChatroomSuccess = true;
      const idx = s.chatrooms.findIndex((c) => c.id === a.payload.id);
      if (idx !== -1) s.chatrooms[idx] = a.payload;
    });
    builder.addCase(updateChatroom.rejected, (s) => {
      s.error = true;
    });

    builder.addCase(reorderChatrooms.pending, (s) => {
      s.error = false;
    });
    builder.addCase(reorderChatrooms.fulfilled, (s, a) => {
      s.chatrooms = a.payload;
    });
    builder.addCase(reorderChatrooms.rejected, (s) => {
      s.error = true;
    });
  },
});

export const { resetChatroomValues } = chatroomSlice.actions;
export default chatroomSlice.reducer;
