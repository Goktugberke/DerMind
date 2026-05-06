import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { userApi } from '../../types/api';
import type { UserResponseDTO } from '../../types/api';
import { auth } from '../../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { clearCart, fetchCart, mergeCartAsync } from './cartSlice';


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
  allergies: Array.isArray(dto.allergens) ? dto.allergens : [],
  picture: dto.picture,
});

// --- ASYNC THUNKS ---

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await userApi.getCurrentUser();
      const user = convertToUser(response);
      dispatch(fetchCart()); // Kullanıcı bilgisi geldiyse sepetini getir
      return user;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Kullanıcı bilgisi alınamadı';
      return rejectWithValue(errorMessage);
    }
  }
);


export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: { email: string; name: string; password?: string }, { rejectWithValue }) => {
    try {
      // 1. Firebase'de kullanıcı oluştur
      if (!userData.password) throw new Error("Şifre gereklidir");
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const firebaseUser = userCredential.user;

      // 2. Firebase profilini güncelle (isim ekle)
      await updateProfile(firebaseUser, { displayName: userData.name });

      // Token al (Backend doğrulaması için gerekirse)
      // const token = await firebaseUser.getIdToken();

      // 3. Backend'e kaydet (Firebase UID ile)
      const token = await firebaseUser.getIdToken();
      localStorage.setItem('authHeader', `Bearer ${token}`);
      localStorage.setItem('isLoggedIn', 'true');

      const response = await userApi.createUser({
        id: firebaseUser.uid,
        email: userData.email,
        name: userData.name,
        picture: firebaseUser.photoURL || ""
      });
      return convertToUser(response);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Kayıt başarısız';
      return rejectWithValue(errorMessage);
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { email?: string; password?: string; token?: string; name?: string; picture?: string; uid?: string }, { dispatch, rejectWithValue }) => {

    try {
      let response;
      if (credentials.token && credentials.email && credentials.name && credentials.uid) {
        // Google Login (Zaten token var)
        response = await userApi.verifyFirebaseToken({
          token: credentials.token,
          email: credentials.email,
          name: credentials.name,
          picture: credentials.picture || '',
          uid: credentials.uid
        });
        
        // Save token for storage-based persistence on refresh
        localStorage.setItem('authHeader', `Bearer ${credentials.token}`);
        localStorage.setItem('isLoggedIn', 'true');
      } else if (credentials.email && credentials.password) {
        // Email/Password Login -> Önce Firebase'e giriş yap
        const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
        const user = userCredential.user;
        const token = await user.getIdToken();

        // Sonra Backend'e doğrulat (verifyFirebaseToken endpointini kullanarak)
        response = await userApi.verifyFirebaseToken({
          token,
          email: user.email || credentials.email,
          name: user.displayName || 'User', // İsim yoksa varsayılan
          picture: user.photoURL || '',
          uid: user.uid
        });

        // Token'ı localStorage'a kaydet ki sonraki isteklerde header olarak gitsin
        localStorage.setItem('authHeader', `Bearer ${token}`);


        // Eski yöntem: Backend'in kendi login endpointi (artık kullanılmıyor çünkü şifreler null)
        // response = await userApi.login({ email: credentials.email, password: credentials.password });
      } else {
        throw new Error('Bilgi eksik');
      }
      const user = convertToUser(response);
      dispatch(mergeCartAsync()); // Giriş başarılıysa sepeti birleştir
      return user;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Giriş başarısız';
      return rejectWithValue(errorMessage);
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
        allergens: userData.allergies,
      });
      return convertToUser(response);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Güncelleme başarısız';
      return rejectWithValue(errorMessage);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { dispatch }) => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Firebase signout error:', error);
    } finally {
      dispatch(logout());
      dispatch(clearCart()); // Çıkışta sepeti temizle
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