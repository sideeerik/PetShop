import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { getToken } from '../../utils/helper';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Async Thunks
export const fetchReviews = createAsyncThunk(
  'reviews/fetchReviews',
  async (_, { rejectWithValue }) => {
    try {
      const token = await getToken();
      const response = await axios.get(`${BACKEND_URL}/api/v1/admin/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.reviews || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch reviews');
    }
  }
);

export const fetchReviewById = createAsyncThunk(
  'reviews/fetchReviewById',
  async (reviewId, { rejectWithValue }) => {
    try {
      const token = await getToken();
      const response = await axios.get(`${BACKEND_URL}/api/v1/admin/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.review;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch review');
    }
  }
);

export const deleteReview = createAsyncThunk(
  'reviews/deleteReview',
  async (reviewId, { rejectWithValue }) => {
    try {
      const token = await getToken();
      await axios.delete(`${BACKEND_URL}/api/v1/admin/reviews/delete/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { 
        reviewId, 
        message: 'Review deleted successfully' 
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete review');
    }
  }
);

// Review Slice
const reviewSlice = createSlice({
  name: 'reviews',
  initialState: {
    items: [],
    currentReview: null,
    loading: false,
    error: null,
    success: false,
    successMessage: '',
    lastUpdated: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = false;
      state.successMessage = '';
    },
    clearCurrentReview: (state) => {
      state.currentReview = null;
    },
    resetReviewState: (state) => {
      state.error = null;
      state.success = false;
      state.successMessage = '';
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Reviews
      .addCase(fetchReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Review By Id
      .addCase(fetchReviewById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviewById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentReview = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchReviewById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete Review
      .addCase(deleteReview.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(r => r._id !== action.payload.reviewId);
        if (state.currentReview?._id === action.payload.reviewId) {
          state.currentReview = null;
        }
        state.success = true;
        state.successMessage = action.payload.message;
      })
      .addCase(deleteReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      });
  },
});

export const { clearError, clearSuccess, clearCurrentReview, resetReviewState } = reviewSlice.actions;
export default reviewSlice.reducer;