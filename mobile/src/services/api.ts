import axios from 'axios';
import { Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuth, getIdToken } from '@react-native-firebase/auth';
import { queryClient } from './queryClient';

import type { User, UserProfileData, UpdateUserProfilePayload, Product, CartItem, Favorite, Rating, Notification } from '../types/user';

console.log('API Module Loading - Platform:', Platform.OS);
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
console.log('BASE_URL set to:', BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const user = getAuth().currentUser;

  if (user) {
    const idToken = await getIdToken(user);
    config.headers.Authorization = `Bearer ${idToken}`;
    console.log('Firebase token injected for:', user.email);
  } else {
    console.log('No Firebase user, request without token');
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('API Response Success:', response.status, response.config.url);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const data = error.response?.data;

    if (status === 503) {
      console.warn(`⚠️ AI Server Unavailable (503): ${url}`, data);
    } else {
      console.error(`API Response Error ${status}:`, url, data || error.message);
    }

    return Promise.reject(error);
  }
);

export const authService = {
  // Standart Kayıt (POST /api/users)
  register: (userData: User & { password?: string }) => api.post<User>('/api/users', userData),

  // Google/Firebase Senkronizasyonu (POST /api/users/firebase)
  firebaseLogin: (firebaseData: Record<string, string>) => api.post<User>('/api/users/firebase', firebaseData),

  // Kullanıcı Detayı Çekme (GET /api/users/me)
  getCurrentUser: () => api.get<User>('/api/users/me'),
};

export const productService = {
  getAllProducts: (page: number = 0, size: number = 15) => api.get<any>(`/api/products?page=${page}&size=${size}`),
  searchProducts: (query: string, page: number = 0, size: number = 15) => api.get<any>(`/api/products/search?query=${query}&page=${page}&size=${size}`),
  getProductById: (id: number) => api.get<Product>(`/api/products/${id}`),
};

export const purchaseService = {
  getPurchasesByUser: (userId: string) => api.get<any>(`/api/purchases/my-purchases`),
  createPurchase: (data: any) => api.post<any>('/api/purchases', data),
};

export const streakService = {
  startStreak: (data: any = {}) => api.post<any>('/api/streaks', data),
  getMyStreaks: () => api.get<any[]>('/api/streaks/my-streaks'),
  getStreak: (id: number) => api.get<any>(`/api/streaks/${id}`),
  updateStreak: (id: number, data: any) => api.put<any>(`/api/streaks/${id}`, data),
  useStreak: (id: number) => api.post<any>(`/api/streaks/${id}/use`),
  deleteStreak: (id: number) => api.delete<void>(`/api/streaks/${id}`),
};

export const cartService = {
  getCart: () => api.get<CartItem[]>('/api/cart'),
  addItem: (productId: number, quantity: number = 1) => api.post<CartItem>('/api/cart/add', { productId, quantity }),
  updateQuantity: (productId: number, quantity: number) => api.put<CartItem>(`/api/cart/item/${productId}?quantity=${quantity}`),
  removeItem: (productId: number) => api.delete<void>(`/api/cart/item/${productId}`),
  clearCart: () => api.delete<void>('/api/cart')
};

export const favoriteService = {
  getFavorites: () => api.get<Favorite[]>('/api/favorites/my-favorites'),
  addFavorite: (productId: number | string) => api.post<Favorite>(`/api/favorites/${productId}`),
  removeFavorite: (productId: number | string) => api.delete<void>(`/api/favorites/${productId}`),
  checkFavorite: (productId: number | string) => api.get<boolean>(`/api/favorites/check/${productId}`),
};

export const aiService = {
  getHealth: () => api.get<{ status: string }>('/api/ai/health'),
  getScore: (productId: number) => api.get<{ score: number;[key: string]: any }>(`/api/ai/score/${productId}`),
  getExplain: (productId: number, userData: any, language: 'tr' | 'en' = 'tr') =>
    api.get<any>(`/api/ai/explain/${productId}`, { params: { user: userData, language } }),
  getRecommend: (params?: { category?: string; secondaryCategory?: string; topK?: number }) =>
    api.get<any>('/api/ai/recommend', { params }),
  getSimilar: (productId: number) => api.get<any>(`/api/ai/similar/${productId}`),
};

export const ratingsService = {
  getProductRatings: (productId: number) => api.get<any[]>(`/api/ratings/product/${productId}`),
  createRating: (data: { productId: number, rating: number, review: string, wouldRecommend: boolean, usageFrequencyString?: string, usageAmountString?: string }) => api.post<any>('/api/ratings', data),
  getMyRatings: () => api.get<any>(`/api/ratings/my-ratings`),
  deleteRating: (id: number) => api.delete<void>(`/api/ratings/${id}`),
  updateRating: (id: number, data: any) => api.put<any>(`/api/ratings/${id}`, data),
};

export const profileService = {
  // Profil bilgisini güncelle (PUT /api/users/{id})
  updateUserProfile: (userId: string, profileData: UserProfileData) => api.put<User>(`/api/users/${userId}`, profileData),

  // Kullanıcı detayını getir (GET /api/users/{id})
  getUserById: (userId: string) => api.get<User>(`/api/users/${userId}`),
};

export const notificationService = {
  getNotifications: () => api.get<Notification[]>('/api/notifications'),
  getUnreadCount: () => api.get<number>('/api/notifications/unread-count'),
  markAsRead: (id: number) => api.put<void>(`/api/notifications/${id}/read`),
  markAllAsRead: () => api.put<void>('/api/notifications/read-all'),
  deleteNotification: (id: number) => api.delete<void>(`/api/notifications/${id}`),
};

export const addressService = {
  getAddresses: () => api.get<any[]>('/api/addresses'),
  createAddress: (data: any) => api.post<any>('/api/addresses', data),
  updateAddress: (id: number, data: any) => api.put<any>(`/api/addresses/${id}`, data),
  deleteAddress: (id: number) => api.delete<void>(`/api/addresses/${id}`),
  setDefaultAddress: (id: number) => api.put<void>(`/api/addresses/${id}/default`),
};

// ============ TanStack Query Hooks ============

// Products
export const useGetAllProducts = (page = 0, size = 15) => {
  return useQuery<any, Error>({
    queryKey: ['products', page, size],
    queryFn: () => productService.getAllProducts(page, size).then(res => res.data),
  });
};

export const useSearchProducts = (query: string, page = 0, size = 15, enabled = true) => {
  return useQuery<any, Error>({
    queryKey: ['searchProducts', query, page, size],
    queryFn: () => productService.searchProducts(query, page, size).then(res => res.data),
    enabled: !!query && enabled,
  });
};

export const useGetProductById = (id: number, enabled = true) => {
  return useQuery<Product, Error>({
    queryKey: ['product', id],
    queryFn: () => productService.getProductById(id).then(res => res.data),
    enabled: !!id && enabled,
  });
};

// AI
export const useAiHealth = () => {
  return useQuery<{ status: string }, Error>({
    queryKey: ['aiHealth'],
    queryFn: () => aiService.getHealth().then(res => res.data),
    staleTime: 60 * 1000, // 1 dakika cache
    retry: false,
  });
};

export const useAiScore = (productId: number, enabled = true) => {
  return useQuery<{ score: number;[key: string]: any }, Error>({
    queryKey: ['aiScore', productId],
    queryFn: () => aiService.getScore(productId).then(res => res.data),
    enabled: !!productId && enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    gcTime: 10 * 60 * 1000, // 503 sonrasında 10 dakika cache tut
  });
};

export const useAiExplain = (productId: number, language: 'tr' | 'en' = 'tr', enabled = true) => {
  const uid = getAuth().currentUser?.uid;
  const { data: currentUser } = useGetCurrentUser(enabled && !!uid);

  return useQuery<any, Error>({
    queryKey: ['aiExplain', productId, language, currentUser?.id],
    queryFn: () => {
      if (!currentUser) throw new Error('User data not available');
      return aiService.getExplain(productId, currentUser, language).then(res => res.data);
    },
    enabled: !!productId && !!currentUser && enabled,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    gcTime: 10 * 60 * 1000,
  });
};

export const useAiRecommend = (
  params?: { category?: string; secondaryCategory?: string; topK?: number },
  enabled = true
) => {
  return useQuery<any[], Error>({
    queryKey: ['aiRecommend', params],
    queryFn: () => aiService.getRecommend(params).then(res => {
      // Backend AiRecommendResponseDTO döndürüyor, içinde recommendations listesi var
      return res.data?.recommendations || [];
    }),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    gcTime: 10 * 60 * 1000,
  });
};

export const useAiSimilar = (productId: number, enabled = true) => {
  return useQuery<any[], Error>({
    queryKey: ['aiSimilar', productId],
    queryFn: () => aiService.getSimilar(productId).then(res => {
      return res.data?.recommendations || [];
    }),
    enabled: !!productId && enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

// Auth
export const useGetCurrentUser = (enabled = true) => {
  const uid = getAuth().currentUser?.uid;
  return useQuery<User, Error>({
    queryKey: ['currentUser', uid],   // UID ile ayrı cache — farklı kullanıcılar karışmaz
    queryFn: async () => {
      try {
        console.log('Fetching current user...');
        const res = await authService.getCurrentUser();
        console.log('Current user fetched successfully:', res.data);
        return res.data;
      } catch (error) {
        console.error('Error fetching current user:', error);
        throw error;
      }
    },
    enabled: enabled && !!uid,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
};

export const useRegister = () => {
  const queryClient = useQueryClient();
  return useMutation<User, Error, User & { password?: string }>({
    mutationFn: (userData) => authService.register(userData).then(res => res.data),
    onSuccess: (data) => {
      // Yeni kullanıcı cache'e direkt yaz, gereksiz network call olmasın
      const uid = getAuth().currentUser?.uid;
      if (uid) queryClient.setQueryData(['currentUser', uid], data);
    },
  });
};

export const useFirebaseLogin = () => {
  const queryClient = useQueryClient();
  return useMutation<User, Error, Record<string, string>>({
    mutationFn: (firebaseData) => authService.firebaseLogin(firebaseData).then(res => res.data),
    onSuccess: (data) => {
      const uid = getAuth().currentUser?.uid;
      if (uid) queryClient.setQueryData(['currentUser', uid], data);
    },
  });
};

// Favorites
export const useGetFavorites = (enabled = true) => {
  return useQuery<Favorite[], Error>({
    queryKey: ['favorites'],
    queryFn: () => favoriteService.getFavorites().then(res => res.data),
    enabled,
  });
};

export const useCheckFavorite = (productId: number | string, enabled = true) => {
  return useQuery<boolean, Error>({
    queryKey: ['favorite', productId],
    queryFn: () => favoriteService.checkFavorite(productId).then(res => res.data),
    enabled: !!productId && enabled,
  });
};

export const useAddFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation<Favorite, Error, number | string>({
    mutationFn: (productId) => favoriteService.addFavorite(productId).then(res => res.data),
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: ['favorite', productId] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
};

export const useRemoveFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number | string>({
    mutationFn: (productId) => favoriteService.removeFavorite(productId).then(res => res.data),
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: ['favorite', productId] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
};

// Cart
export const useGetCart = (enabled = true) => {
  return useQuery<CartItem[], Error>({
    queryKey: ['cart'],
    queryFn: () => cartService.getCart().then(res => res.data),
    enabled,
  });
};

export const useAddToCart = () => {
  const queryClient = useQueryClient();
  return useMutation<CartItem, Error, { productId: number; quantity: number }>({
    mutationFn: ({ productId, quantity }) => cartService.addItem(productId, quantity).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

export const useUpdateCartQuantity = () => {
  const queryClient = useQueryClient();
  return useMutation<CartItem, Error, { productId: number; quantity: number }>({
    mutationFn: ({ productId, quantity }) => cartService.updateQuantity(productId, quantity).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

export const useRemoveFromCart = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (productId) => cartService.removeItem(productId).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

export const useClearCart = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => cartService.clearCart().then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

// Ratings
export const useGetProductRatings = (productId: string) => {
  return useQuery({
    queryKey: ['productRatings', productId],
    queryFn: () => ratingsService.getProductRatings(Number(productId)).then(res => res.data),
    enabled: !!productId,
  });
};

export const useCreateRating = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { productId: number, rating: number, review: string, wouldRecommend: boolean, usageFrequencyString?: string, usageAmountString?: string }) => ratingsService.createRating(data).then(res => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['productRatings', variables.productId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
    },
  });
};

export const useMyReviews = () => {
  return useQuery({
    queryKey: ['myReviews'],
    queryFn: () => ratingsService.getMyRatings().then(res => res.data),
  });
};

export const useDeleteReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ratingsService.deleteRating(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
    },
  });
};

export const useUpdateRating = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: number, data: any }>({
    mutationFn: ({ id, data }) => ratingsService.updateRating(id, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productRatings'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
    },
  });
};

// Profile
export const useGetUserById = (userId: string, enabled = true) => {
  return useQuery<User, Error>({
    queryKey: ['user', userId],
    queryFn: () => profileService.getUserById(userId).then(res => res.data),
    enabled: !!userId && enabled,
  });
};

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<User, Error, UpdateUserProfilePayload>({
    mutationFn: (payload: UpdateUserProfilePayload) =>
      profileService.updateUserProfile(payload.userId, payload.profileData).then(res => res.data),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['user', payload.userId] });
    },
  });
};

// Purchases
export const useMyPurchases = () => {
  return useQuery({
    queryKey: ['my-purchases'],
    queryFn: () => purchaseService.getPurchasesByUser('me').then(res => res.data),
  });
};

export const useCreatePurchase = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: (data) => purchaseService.createPurchase(data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
  });
};

// Streaks
export const useStartStreak = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: (data) => streakService.startStreak(data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streaks'] });
      queryClient.invalidateQueries({ queryKey: ['myStreaks'] });
    },
  });
};

export const useMyStreaks = (enabled = true) => {
  return useQuery<any[], Error>({
    queryKey: ['myStreaks'],
    queryFn: () => streakService.getMyStreaks().then(res => res.data),
    enabled,
  });
};

export const useUpdateStreak = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: number; data: any }>({
    mutationFn: ({ id, data }) => streakService.updateStreak(id, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streaks'] });
      queryClient.invalidateQueries({ queryKey: ['myStreaks'] });
    },
  });
};

export const useDeleteStreak = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => streakService.deleteStreak(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streaks'] });
      queryClient.invalidateQueries({ queryKey: ['myStreaks'] });
    },
  });
};

export const useGetStreak = (id: number, enabled = true) => {
  return useQuery<any, Error>({
    queryKey: ['streak', id],
    queryFn: () => streakService.getStreak(id).then(res => res.data),
    enabled: !!id && enabled,
  });
};

export const useUseStreak = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, number>({
    mutationFn: (id) => streakService.useStreak(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streaks'] });
      queryClient.invalidateQueries({ queryKey: ['myStreaks'] });
      queryClient.invalidateQueries({ queryKey: ['streak'] });
    },
  });
};

// Notifications
export const useNotifications = (enabled = true) => {
  return useQuery<Notification[], Error>({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications().then(res => res.data),
    enabled,
  });
};

export const useUnreadCount = (enabled = true) => {
  return useQuery<number, Error>({
    queryKey: ['unreadCount'],
    queryFn: () => notificationService.getUnreadCount().then(res => res.data),
    enabled,
    refetchInterval: 300000, // 5 dakikada bir kontrol et
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => notificationService.markAsRead(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => notificationService.markAllAsRead().then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => notificationService.deleteNotification(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    },
  });
};

// Addresses
export const useGetAddresses = () => {
  return useQuery<any[], Error>({
    queryKey: ['addresses'],
    queryFn: () => addressService.getAddresses().then(res => res.data || []),
  });
};

export const useCreateAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => addressService.createAddress(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
};

export const useUpdateAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => addressService.updateAddress(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => addressService.deleteAddress(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
};

export const useSetDefaultAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => addressService.setDefaultAddress(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
};
export default api;