import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { userApi } from '../../types/api';
import type { UserResponseDTO } from '../../types/api';

export interface User {
  id: string;
  email: string;
  name: string;
  skinType?: string;
  allergies?: string[];
  picture?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const convertToUser = (dto: UserResponseDTO): User => ({
  id: dto.id,
  email: dto.email,
  name: dto.name,
  skinType: dto.skinType,
  allergies: dto.allergens ? dto.allergens.split(',').map((a: string) => a.trim()) : [],
  picture: dto.picture,
});

// --- ASYNC THUNKS ---

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userApi.getCurrentUser();
      return convertToUser(response);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Kullanıcı bilgisi alınamadı');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: { email: string; name: string; password?: string }, { rejectWithValue }) => {
    try {
      const id = `user_${Date.now()}`;
      const response = await userApi.createUser({
        id,
        email: userData.email,
        name: userData.name,
        password: userData.password
      });
      return convertToUser(response);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Kayıt başarısız');
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { email?: string; password?: string; token?: string; name?: string; picture?: string; uid?: string }, { rejectWithValue }) => {
    try {
      let response;
      if (credentials.token && credentials.email && credentials.name && credentials.uid) {
        // Google Login
        response = await userApi.verifyFirebaseToken({
          token: credentials.token,
          email: credentials.email,
          name: credentials.name,
          picture: credentials.picture || '',
          uid: credentials.uid
        });
      } else if (credentials.email && credentials.password) {
        response = await userApi.login({ email: credentials.email, password: credentials.password });
      } else {
        throw new Error('Bilgi eksik');
      }
      return convertToUser(response);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Giriş başarısız');
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData: { id: string; name?: string; skinType?: string; allergies?: string[] }, { rejectWithValue }) => {
    try {
      const response = await userApi.updateUser(userData.id, {
        name: userData.name,
        skinType: userData.skinType,
        allergens: userData.allergies?.join(', '),
      });
      return convertToUser(response);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Güncelleme başarısız');
    }
  }
);

// --- SLICE ---

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.error = null;
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('authHeader'); // Credential'ları temizle
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Current User
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.loading = false;
      })
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        // Token veya kullanıcı bilgisini sakla (isteğe bağlı)
        localStorage.setItem('isLoggedIn', 'true');
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { setUser, logout, clearError } = authSlice.actions;
export default authSlice.reducer;