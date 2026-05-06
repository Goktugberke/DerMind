import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { cartApi } from '../../types/api';
import type { CartItemAddDTO } from '../../types/api';

import type { RootState } from '../store';


export interface Product {
  id: string | number;
  name: string;
  brand?: string;
  price: number;
  image?: string;
  description?: string;
  rating?: number;
  category?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  loading: boolean;
  error: string | null;
}

const initialState: CartState = {
  items: [],
  loading: false,
  error: null,
};

// --- ASYNC THUNKS ---

export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const response = await cartApi.getCart();
      return response.map(item => ({
        id: item.product.id,
        name: item.product.name,
        brand: item.product.brand,
        price: item.product.price || 0,
        image: item.product.imageUrl,
        description: item.product.ingredients,
        quantity: item.quantity
      })) as CartItem[];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Sepet yüklenirken hata oluştu';
      return rejectWithValue(errorMessage);
    }

  }
);

export const addToCartAsync = createAsyncThunk(
  'cart/addToCartAsync',
  async (product: Product, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    if (state.auth.isAuthenticated) {
      try {
        await cartApi.addItem({ productId: product.id, quantity: 1 });
        // Başarılı olursa state'i güncellemek için ürünü döneriz
        return product;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Ürün eklenirken hata oluştu';
        return rejectWithValue(errorMessage);
      }

    }
    return product; // Anonim kullanıcı için sadece payload döner
  }
);

export const updateQuantityAsync = createAsyncThunk(
  'cart/updateQuantityAsync',
  async ({ productId, quantity }: { productId: string | number; quantity: number }, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    if (state.auth.isAuthenticated) {
      try {
        await cartApi.updateQuantity(productId, quantity);
        return { productId, quantity };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Miktar güncellenirken hata oluştu';
        return rejectWithValue(errorMessage);
      }

    }
    return { productId, quantity };
  }
);

export const removeFromCartAsync = createAsyncThunk(
  'cart/removeFromCartAsync',
  async (productId: string | number, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    if (state.auth.isAuthenticated) {
      try {
        await cartApi.removeItem(productId);
        return productId;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Ürün silinirken hata oluştu';
        return rejectWithValue(errorMessage);
      }

    }
    return productId;
  }
);

export const clearCartAsync = createAsyncThunk(
  'cart/clearCartAsync',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    if (state.auth.isAuthenticated) {
      try {
        await cartApi.clearCart();
        return;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Sepet temizlenirken hata oluştu';
        return rejectWithValue(errorMessage);
      }

    }
    return;
  }
);


export const mergeCartAsync = createAsyncThunk(
  'cart/mergeCart',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const localItems = state.cart.items.map(item => ({
      productId: item.id,
      quantity: item.quantity
    })) as CartItemAddDTO[];

    try {
      const response = await cartApi.mergeCart(localItems);
      return response.map(item => ({
        id: item.product.id,
        name: item.product.name,
        brand: item.product.brand,
        price: item.product.price || 0,
        image: item.product.imageUrl,
        description: item.product.ingredients,
        quantity: item.quantity
      })) as CartItem[];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Sepet birleştirilirken hata oluştu';
      return rejectWithValue(errorMessage);
    }

  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Senkron reducer'lar hala anonim modda veya logout durumunda kullanılabilir
    addToCart: (state, action: PayloadAction<Product>) => {
      const existingItem = state.items.find((item) => String(item.id) === String(action.payload.id));
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({ ...action.payload, quantity: 1 });
      }
    },
    removeFromCart: (state, action: PayloadAction<string | number>) => {
      state.items = state.items.filter((item) => String(item.id) !== String(action.payload));
    },
    updateQuantity: (state, action: PayloadAction<{ productId: string | number; quantity: number }>) => {
      const { productId, quantity } = action.payload;
      if (quantity <= 0) {
        state.items = state.items.filter((item) => String(item.id) !== String(productId));
      } else {
        const item = state.items.find((item) => String(item.id) === String(productId));
        if (item) {
          item.quantity = quantity;
        }
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(mergeCartAsync.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      // Thunk'lar başarılı olduğunda senkron reducer mantığını burada da uygulayabiliriz 
      // veya API'dan dönen datayı direkt basabiliriz.
      // Basitlik için async thunk'lar bittiğinde state'i yerel olarak da güncelliyoruz:
      .addCase(addToCartAsync.fulfilled, (state, action) => {
        const product = action.payload;
        const existingItem = state.items.find((item) => String(item.id) === String(product.id));
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          state.items.push({ ...product, quantity: 1 });
        }
      })
      .addCase(updateQuantityAsync.fulfilled, (state, action) => {
        const { productId, quantity } = action.payload;
        if (quantity <= 0) {
          state.items = state.items.filter((item) => String(item.id) !== String(productId));
        } else {
          const item = state.items.find((item) => String(item.id) === String(productId));
          if (item) {
            item.quantity = quantity;
          }
        }
      })
      .addCase(removeFromCartAsync.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => String(item.id) !== String(action.payload));
      })
      .addCase(clearCartAsync.fulfilled, (state) => {
        state.items = [];
      });
  }
});


export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;

// Selectors
export const selectCartItems = (state: RootState) => state.cart.items;
export const selectTotalPrice = (state: RootState) =>
  state.cart.items.reduce((total, item) => total + (item.price || 0) * item.quantity, 0);
export const selectTotalItems = (state: RootState) =>
  state.cart.items.reduce((total, item) => total + item.quantity, 0);

export default cartSlice.reducer;
