import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { getToken } from '../../utils/helper';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Async Thunks with improved error handling
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (_, { rejectWithValue }) => {
    try {
      const token = await getToken();
      const response = await axios.get(`${BACKEND_URL}/api/v1/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.products || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch products');
    }
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (productId, { rejectWithValue }) => {
    try {
      const token = await getToken();
      const response = await axios.get(`${BACKEND_URL}/api/v1/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.product;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch product');
    }
  }
);

export const fetchDeletedProducts = createAsyncThunk(
  'products/fetchDeletedProducts',
  async (_, { rejectWithValue }) => {
    try {
      const token = await getToken();
      const response = await axios.get(`${BACKEND_URL}/api/v1/admin/products/trash`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.products || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch deleted products');
    }
  }
);

export const createProduct = createAsyncThunk(
  'products/createProduct',
  async (formData, { rejectWithValue }) => {
    try {
      const token = await getToken();
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/admin/products`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000,
        }
      );
      return { 
        product: response.data.product, 
        message: 'Product created successfully' 
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create product');
    }
  }
);

export const updateProduct = createAsyncThunk(
  'products/updateProduct',
  async ({ productId, formData }, { rejectWithValue, dispatch }) => {
    try {
      const token = await getToken();
      const response = await axios.put(
        `${BACKEND_URL}/api/v1/admin/products/${productId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000,
        }
      );
      
      // After successful update, fetch the updated product
      await dispatch(fetchProductById(productId));
      
      return { 
        product: response.data.product, 
        message: 'Product updated successfully' 
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update product');
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/deleteProduct',
  async (productId, { rejectWithValue }) => {
    try {
      const token = await getToken();
      await axios.delete(`${BACKEND_URL}/api/v1/admin/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { 
        productId, 
        message: 'Product moved to trash successfully' 
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete product');
    }
  }
);

export const permanentlyDeleteProduct = createAsyncThunk(
  'products/permanentlyDeleteProduct',
  async (productId, { rejectWithValue }) => {
    try {
      const token = await getToken();
      await axios.delete(`${BACKEND_URL}/api/v1/admin/products/delete/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { 
        productId, 
        message: 'Product permanently deleted' 
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to permanently delete product');
    }
  }
);

export const restoreProduct = createAsyncThunk(
  'products/restoreProduct',
  async (productId, { rejectWithValue }) => {
    try {
      const token = await getToken();
      await axios.patch(
        `${BACKEND_URL}/api/v1/admin/products/restore/${productId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return { 
        productId, 
        message: 'Product restored successfully' 
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to restore product');
    }
  }
);

export const fetchSuppliers = createAsyncThunk(
  'products/fetchSuppliers',
  async (_, { rejectWithValue }) => {
    try {
      const token = await getToken();
      const response = await axios.get(`${BACKEND_URL}/api/v1/suppliers/dropdown`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.suppliers || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch suppliers');
    }
  }
);

// Product Slice with improved state management
const productSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    deletedItems: [],
    currentProduct: null,
    suppliers: [],
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
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
    resetProductState: (state) => {
      state.error = null;
      state.success = false;
      state.successMessage = '';
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Products
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Product By Id
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Deleted Products
      .addCase(fetchDeletedProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDeletedProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.deletedItems = action.payload;
      })
      .addCase(fetchDeletedProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create Product
      .addCase(createProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload.product);
        state.success = true;
        state.successMessage = action.payload.message;
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      
      // Update Product
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        // Update items list
        const index = state.items.findIndex(p => p._id === action.payload.product._id);
        if (index !== -1) {
          state.items[index] = action.payload.product;
        }
        // currentProduct will be updated by fetchProductById
        state.success = true;
        state.successMessage = action.payload.message;
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      
      // Delete Product
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.items = state.items.filter(p => p._id !== action.payload.productId);
        if (state.currentProduct?._id === action.payload.productId) {
          state.currentProduct = null;
        }
        state.success = true;
        state.successMessage = action.payload.message;
      })
      
      // Permanently Delete Product
      .addCase(permanentlyDeleteProduct.fulfilled, (state, action) => {
        state.deletedItems = state.deletedItems.filter(p => p._id !== action.payload.productId);
        state.success = true;
        state.successMessage = action.payload.message;
      })
      
      // Restore Product
      .addCase(restoreProduct.fulfilled, (state, action) => {
        state.deletedItems = state.deletedItems.filter(p => p._id !== action.payload.productId);
        state.success = true;
        state.successMessage = action.payload.message;
      })
      
      // Fetch Suppliers
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.suppliers = action.payload;
      });
  },
});

export const { clearError, clearSuccess, clearCurrentProduct, resetProductState } = productSlice.actions;
export default productSlice.reducer;