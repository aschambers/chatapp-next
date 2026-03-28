import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

import type { Category } from '@/lib/types';

const TTL = 30_000;

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  error: boolean;
  success: boolean;
  fetchedAt: number | null;
  fetchedForId: number | null;
}

const initialState: CategoryState = {
  categories: [],
  isLoading: false,
  error: false,
  success: false,
  fetchedAt: null,
  fetchedForId: null,
};

export const categoryCreate = createAsyncThunk(
  'category/create',
  async (params: Record<string, unknown>) => {
    const res = await axios.post('/api/v1/categories', params);
    return res.data;
  }
);

export const categoryFindAll = createAsyncThunk(
  'category/findAll',
  async (serverId: number) => {
    const res = await axios.get('/api/v1/categories', { params: { serverId } });
    return res.data;
  },
  {
    condition: (serverId, { getState }) => {
      const { category } = getState() as { category: CategoryState };
      if (category.isLoading) return false;
      if (
        category.fetchedForId === serverId &&
        category.fetchedAt &&
        Date.now() - category.fetchedAt < TTL
      )
        return false;
      return true;
    },
  }
);

export const categoryUpdate = createAsyncThunk(
  'category/update',
  async (params: Record<string, unknown>) => {
    const res = await axios.put('/api/v1/categories', params);
    return res.data;
  }
);

export const categoryDelete = createAsyncThunk('category/delete', async (categoryId: number) => {
  await axios.delete('/api/v1/categories', { data: { categoryId } });
  return categoryId;
});

const categorySlice = createSlice({
  name: 'category',
  initialState,
  reducers: { resetCategoryValues: () => initialState },
  extraReducers: (builder) => {
    builder.addCase(categoryCreate.pending, (s) => {
      s.error = false;
    });
    builder.addCase(categoryCreate.fulfilled, (s, a) => {
      s.categories = a.payload;
      s.success = true;
    });
    builder.addCase(categoryCreate.rejected, (s) => {
      s.error = true;
    });

    builder.addCase(categoryFindAll.pending, (s) => {
      s.error = false;
    });
    builder.addCase(categoryFindAll.fulfilled, (s, a) => {
      s.categories = a.payload;
      s.fetchedAt = Date.now();
      s.fetchedForId = a.meta.arg;
    });
    builder.addCase(categoryFindAll.rejected, (s) => {
      s.error = true;
    });

    builder.addCase(categoryUpdate.fulfilled, (s, a) => {
      const idx = s.categories.findIndex((c) => c.id === a.payload.id);
      if (idx !== -1) s.categories[idx] = a.payload;
    });

    builder.addCase(categoryDelete.fulfilled, (s, a) => {
      s.categories = s.categories.filter((c) => c.id !== a.payload);
    });
  },
});

export const { resetCategoryValues } = categorySlice.actions;
export default categorySlice.reducer;
