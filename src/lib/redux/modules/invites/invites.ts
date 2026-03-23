import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import type { Invite } from '@/lib/types';

interface InviteState {
  invites: Invite[];
  isLoading: boolean;
  error: boolean;
  errorMessage: string | null;
  success: boolean;
}

const initialState: InviteState = { invites: [], isLoading: false, error: false, errorMessage: null, success: false };

export const inviteCreate = createAsyncThunk('invite/create', async (params: Record<string, unknown>) => {
  const res = await axios.post('/api/v1/invites', params);
  return res.data;
});

export const inviteEmailCreate = createAsyncThunk('invite/emailCreate', async (params: Record<string, unknown>) => {
  const res = await axios.post('/api/v1/invites/email', params);
  return res.data;
});

export const inviteVerification = createAsyncThunk('invite/verify', async (params: Record<string, unknown>, { rejectWithValue }) => {
  try {
    const res = await axios.put('/api/v1/invites', params);
    return res.data;
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
    return rejectWithValue(msg ?? 'Invalid or expired invite code.');
  }
});

export const findInvites = createAsyncThunk('invite/findAll', async (serverId: number) => {
  const res = await axios.get('/api/v1/invites', { params: { serverId } });
  return res.data;
});

export const deleteInvite = createAsyncThunk('invite/delete', async (params: { inviteId: number; serverId: number }) => {
  const res = await axios.delete('/api/v1/invites', { data: params });
  return res.data;
});

const inviteSlice = createSlice({
  name: 'invite',
  initialState,
  reducers: { resetInviteValues: () => initialState },
  extraReducers: builder => {
    builder.addCase(inviteCreate.pending, s => { s.error = false; });
    builder.addCase(inviteCreate.fulfilled, s => { s.success = true; });
    builder.addCase(inviteCreate.rejected, s => { s.error = true; });

    builder.addCase(inviteEmailCreate.pending, s => { s.error = false; });
    builder.addCase(inviteEmailCreate.fulfilled, s => { s.success = true; });
    builder.addCase(inviteEmailCreate.rejected, s => { s.error = true; });

    builder.addCase(inviteVerification.pending, s => { s.error = false; s.errorMessage = null; });
    builder.addCase(inviteVerification.fulfilled, s => { s.success = true; s.errorMessage = null; });
    builder.addCase(inviteVerification.rejected, (s, a) => { s.error = true; s.errorMessage = (a.payload as string) ?? null; });

    builder.addCase(findInvites.pending, s => { s.error = false; });
    builder.addCase(findInvites.fulfilled, (s, a) => { s.invites = a.payload; });
    builder.addCase(findInvites.rejected, s => { s.error = true; });

    builder.addCase(deleteInvite.pending, s => { s.error = false; });
    builder.addCase(deleteInvite.fulfilled, (s, a) => { s.invites = a.payload; });
    builder.addCase(deleteInvite.rejected, s => { s.error = true; });
  },
});

export const { resetInviteValues } = inviteSlice.actions;
export default inviteSlice.reducer;
