import { configureStore } from '@reduxjs/toolkit';
import productReducer from './slices/productSlice';
import orderReducer from './slices/orderSlice';
import reviewReducer from './slices/reviewSlice';

export const store = configureStore({
  reducer: {
    products: productReducer,
    orders: orderReducer,
    reviews: reviewReducer,
  },
});