import axios from 'axios';

// --- ERROR TYPES ---
export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface GeneralErrorResponse {
  message?: string;
  code?: string;
  errorCode?: string;
  errorMessages?: { field?: string; message: string }[];
}

// --- ENUMS ---
export const UsageFrequency = {
  DAILY: 'DAILY',
  TWICE_DAILY: 'TWICE_DAILY',
} as const;
export type UsageFrequency = (typeof UsageFrequency)[keyof typeof UsageFrequency];

// UsageTime removed

// --- USER TYPES ---
export interface UserResponseDTO {
  id: string;
  email: string;
  name: string;
  allergens?: string;
  skinType?: string;
  picture?: string;
}
export type UserDetailDTO = UserResponseDTO;
export interface UserCreateDto {
  id: string;
  email: string;
  name: string;
  picture?: string;
}
export interface UserUpdateDto {
  name?: string;
  allergens?: string;
  skinType?: string;
}

// --- PRODUCT TYPES ---
export interface ProductResponseDTO {
  id: string;
  name: string;
  brand: string;
  price?: number;
  category?: string;
  ingredients?: string;
  qualityScore?: number;
  personalScore?: number;
}
export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}
export interface ProductDetailDTO extends ProductResponseDTO {
  description?: string;
  averageUserRating?: number;
  totalRatings?: number;
  totalPurchases?: number;
}
export interface ProductCreateDTO { name: string; brand: string; price: number; }
export type ProductUpdateDTO = Partial<ProductCreateDTO>;
export interface ProductRecommendationDTO { products: ProductResponseDTO[]; reason: string; }

// --- FAVORITE TYPES ---
export interface FavoriteResponseDTO {
  id: number;
  product: ProductResponseDTO;
  createdAt: string;
}

// --- STREAK & ROUTINE TYPES ---
export interface StreakResponseDTO {
  id: number;
  productId: number;
  productName?: string;
  currentStreak: number;
  longestStreak: number;
  totalUses: number;
  isActive: boolean;
  lastUsedDate?: string;
  usageFrequency: UsageFrequency;
  customTimes?: string[]; // LocalTime strings: "09:00", etc.
  dailyUsageCounter?: number;
}
export interface StreakCreateDTO {
  productId: number;
  usageFrequency: UsageFrequency;
  customTimes?: string[];
  daysOfWeek?: string[];
}
export interface StreakUpdateDTO { usageFrequency?: UsageFrequency; }

// --- RATING & PURCHASE & NOTIFICATION ---
export interface RatingResponseDTO {
  id: number;
  userId: string;
  productId: number;
  rating: number;
  comment?: string;
  userName?: string;
  review?: string;
  verifiedPurchase?: boolean;
}
export interface RatingCreateDTO { userId: string; productId: number; rating: number; review?: string; }
export interface RatingUpdateDTO { rating: number; review?: string; }
export interface ProductRatingStatsDTO { averageRating: number; totalRatings: number; }

// --- CART TYPES ---
export interface CartItemResponseDTO {
  id: number;
  product: ProductResponseDTO;
  quantity: number;
}
export interface CartItemAddDTO {
  productId: string | number;
  quantity: number;
}


export interface PurchaseResponseDTO { id: number; purchaseDate: string; totalAmount: number; }
export interface PurchaseCreateDTO { productIds: string[]; totalAmount: number; }
export interface PurchaseUpdateDTO { status: string; }
export interface PurchaseDetailDTO extends PurchaseResponseDTO { items: unknown[]; }
export interface PurchaseStatsDTO { totalPurchases: number; totalSpent: number; }

export interface NotificationResponseDTO { id: number; message: string; isRead: boolean; createdAt: string; }
export interface NotificationUnreadCountDTO { count: number; }

// --- API CONFIGURATION ---
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const apiClient = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' } });

import { auth } from '../firebase';

// --- INTERCEPTORS ---
// Request Interceptor: Auth header'ı ekle
apiClient.interceptors.request.use(
  async (config) => {
    if (config.url === '/api/users' && config.method === 'post') {
      return config;
    }

    let token = localStorage.getItem('authHeader');
    let source = 'localStorage';

    // Firebase kullanıcısı varsa güncel token al
    if (auth.currentUser) {
      try {
        const firebaseToken = await auth.currentUser.getIdToken();
        token = `Bearer ${firebaseToken}`;
        source = 'firebase';
      } catch (error) {
        console.error("Token refresh error:", error);
      }
    }

    if (token) {
      config.headers['Authorization'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Hata yönetimi
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorData = (error as any).response?.data;

    let errorMessage = 'Bir hata oluştu';

    if (typeof errorData === 'string') {
      errorMessage = errorData;
    } else if (errorData?.errorMessages?.[0]?.message) {
      errorMessage = errorData.errorMessages[0].message;
    } else if (errorData?.message) {
      errorMessage = errorData.message;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } else if ((error as any).message) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errorMessage = (error as any).message;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Promise.reject(new ApiError(errorMessage, (error as any).response?.status));
  }
);

// --- SERVICES ---
export const userApi = {
  getCurrentUser: async () => (await apiClient.get<UserResponseDTO>('/api/users/me')).data,
  login: async (credentials: { email: string; password?: string }) => {
    const authHeader = 'Basic ' + btoa(credentials.email + ':' + credentials.password);

    const response = await apiClient.get<UserResponseDTO>('/api/users/me', {
      headers: {
        'Authorization': authHeader
      }
    });

    localStorage.setItem('authHeader', authHeader);
    return response.data;
  },
  verifyFirebaseToken: async (data: { token: string; email: string; name: string; picture: string; uid: string }) =>
    (await apiClient.post<UserResponseDTO>('/api/users/firebase', data)).data,
  createUser: async (data: UserCreateDto) => (await apiClient.post<UserResponseDTO>('/api/users', data)).data,
  getUserById: async (id: string) => (await apiClient.get<UserDetailDTO>(`/api/users/${id}`)).data,
  getUserByEmail: async (email: string) => (await apiClient.get<UserResponseDTO>(`/api/users/email/${email}`)).data,
  updateUser: async (id: string, data: UserUpdateDto) => (await apiClient.put<UserResponseDTO>(`/api/users/${id}`, data)).data,
  getAllUsers: async () => (await apiClient.get<UserResponseDTO[]>('/api/users')).data,
  getHomePage: async () => (await apiClient.get('/api/home')).data,
};

export const productApi = {
  getProductById: async (id: number) => (await apiClient.get<ProductDetailDTO>(`/api/products/${id}`)).data,
  getAllProducts: async (page = 0, size = 20, sort?: string) => (await apiClient.get<PageResponse<ProductResponseDTO>>(`/api/products?page=${page}&size=${size}${sort ? `&sort=${sort}` : ''}`)).data,
  searchProducts: async (query: string, page = 0, size = 20, sort?: string) =>
    (await apiClient.get<PageResponse<ProductResponseDTO>>(`/api/products/search?query=${query}&page=${page}&size=${size}${sort ? `&sort=${sort}` : ''}`)).data,
  getTopQualityProducts: async (limit = 10) => (await apiClient.get<ProductDetailDTO[]>(`/api/products/top/quality?limit=${limit}`)).data,
};

export const streakApi = {
  getMyStreaks: async () => (await apiClient.get<StreakResponseDTO[]>('/api/streaks/my-streaks')).data,
  createStreak: async (data: StreakCreateDTO) => (await apiClient.post<StreakResponseDTO>('/api/streaks', data)).data,
  recordUsage: async (id: number) => (await apiClient.post(`/api/streaks/${id}/use`)).data,
  deleteStreak: async (id: number) => (await apiClient.delete(`/api/streaks/${id}`)).data,
};

export const ratingApi = {
  getRatingsByProductId: async (id: number) => (await apiClient.get<RatingResponseDTO[]>(`/api/ratings/product/${id}`)).data,
  getProductRatingStats: async (id: number) => (await apiClient.get<ProductRatingStatsDTO>(`/api/ratings/product/${id}/stats`)).data,
  addRating: async (data: RatingCreateDTO) => (await apiClient.post<RatingResponseDTO>('/api/ratings', data)).data,
  updateRating: async (id: number, data: RatingUpdateDTO) => (await apiClient.put<RatingResponseDTO>(`/api/ratings/${id}`, data)).data,
  deleteRating: async (id: number) => await apiClient.delete(`/api/ratings/${id}`),
};

export const favoriteApi = {
  addFavorite: async (productId: number | string) => (await apiClient.post<FavoriteResponseDTO>(`/api/favorites/${productId}`)).data,
  removeFavorite: async (productId: number | string) => await apiClient.delete(`/api/favorites/${productId}`),
  getMyFavorites: async () => (await apiClient.get<FavoriteResponseDTO[]>('/api/favorites/my-favorites')).data,
  checkIsFavorite: async (productId: number | string) => (await apiClient.get<boolean>(`/api/favorites/check/${productId}`)).data,
};

export const cartApi = {
  getCart: async () => (await apiClient.get<CartItemResponseDTO[]>('/api/cart')).data,
  addItem: async (data: CartItemAddDTO) => (await apiClient.post<CartItemResponseDTO>('/api/cart/add', data)).data,
  updateQuantity: async (productId: string | number, quantity: number) =>
    (await apiClient.put<CartItemResponseDTO>(`/api/cart/item/${productId}?quantity=${quantity}`)).data,
  removeItem: async (productId: string | number) => await apiClient.delete(`/api/cart/item/${productId}`),
  clearCart: async () => await apiClient.delete('/api/cart'),
  mergeCart: async (localItems: CartItemAddDTO[]) => (await apiClient.post<CartItemResponseDTO[]>('/api/cart/merge', localItems)).data,
};
