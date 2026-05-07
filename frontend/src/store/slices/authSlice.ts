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
  isAdmin?: boolean;
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
  isAdmin: dto.isAdmin,
});

const getFriendlyErrorMessage = (error: any): string => {
  if (error && typeof error === 'object' && 'code' in error) {
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-posta adresi veya şifre hatalı.';
      case 'auth/email-already-in-use':
        return 'Bu e-posta adresi zaten kullanımda.';
      case 'auth/weak-password':
        return 'Şifre çok zayıf. Lütfen daha güçlü bir şifre deneyin.';
      case 'auth/invalid-email':
        return 'Geçersiz bir e-posta adresi girdiniz.';
      case 'auth/too-many-requests':
        return 'Çok fazla başarısız deneme yaptınız. Lütfen daha sonra tekrar deneyin.';
      case 'auth/user-disabled':
        return 'Bu hesap devre dışı bırakılmış.';
      case 'auth/operation-not-allowed':
        return 'Giriş yöntemi şu an aktif değil.';
      case 'auth/popup-closed-by-user':
        return 'Giriş penceresi kapatıldı.';
      default:
        return 'Bir hata oluştu. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
    }
  }
  return error instanceof Error ? error.message : 'Bir hata oluştu';
};

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
      console.log("[AuthSlice] Starting registration for:", userData.email);
      // 1. Firebase'de kullanıcı oluştur
      if (!userData.password) throw new Error("Şifre gereklidir");
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const firebaseUser = userCredential.user;
      console.log("[AuthSlice] Firebase user created:", firebaseUser.uid);

      // 2. Firebase profilini güncelle (isim ekle)
      await updateProfile(firebaseUser, { displayName: userData.name });
      console.log("[AuthSlice] Firebase profile updated");

      // 3. Backend'e kaydet (Firebase UID ile)
      const token = await firebaseUser.getIdToken();
      console.log("[AuthSlice] Got Firebase token");
      
      localStorage.setItem('authHeader', `Bearer ${token}`);
      localStorage.setItem('isLoggedIn', 'true');

      console.log("[AuthSlice] Calling Backend verifyFirebaseToken for registration...");
      const response = await userApi.verifyFirebaseToken({
        token,
        email: userData.email,
        name: userData.name,
        picture: firebaseUser.photoURL || "",
        uid: firebaseUser.uid
      });
      console.log("[AuthSlice] Backend registration success:", response);
      return convertToUser(response);
    } catch (error: unknown) {
      console.error("[AuthSlice] Registration error:", error);
      return rejectWithValue(getFriendlyErrorMessage(error));
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { email?: string; password?: string; token?: string; name?: string; picture?: string; uid?: string }, { dispatch, rejectWithValue }) => {
    try {
      console.log("[AuthSlice] Starting login for:", credentials.email || "Google Auth");
      let response;
      if (credentials.token && credentials.email && credentials.name && credentials.uid) {
        // Google Login (Zaten token var)
        console.log("[AuthSlice] Using Google Auth token");
        response = await userApi.verifyFirebaseToken({
          token: credentials.token,
          email: credentials.email,
          name: credentials.name,
          picture: credentials.picture || '',
          uid: credentials.uid
        });
        
        localStorage.setItem('authHeader', `Bearer ${credentials.token}`);
        localStorage.setItem('isLoggedIn', 'true');
      } else if (credentials.email && credentials.password) {
        // Email/Password Login -> Önce Firebase'e giriş yap
        console.log("[AuthSlice] Attempting Firebase sign-in...");
        const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
        const user = userCredential.user;
        const token = await user.getIdToken();
        console.log("[AuthSlice] Firebase sign-in success, got token");

        // Sonra Backend'e doğrulat
        console.log("[AuthSlice] Calling Backend verifyFirebaseToken...");
        response = await userApi.verifyFirebaseToken({
          token,
          email: user.email || credentials.email,
          name: user.displayName || 'User',
          picture: user.photoURL || '',
          uid: user.uid
        });
        console.log("[AuthSlice] Backend verify success:", response);

        localStorage.setItem('authHeader', `Bearer ${token}`);
        localStorage.setItem('isLoggedIn', 'true');
      } else {
        throw new Error('Bilgi eksik');
      }
      const user = convertToUser(response);
      console.log("[AuthSlice] Login complete for user:", user.name);
      dispatch(mergeCartAsync());
      return user;
    } catch (error: unknown) {
      console.error("[AuthSlice] Login error:", error);
      return rejectWithValue(getFriendlyErrorMessage(error));
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