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
export type UsageFrequency = 'DAILY' | 'TWICE_DAILY' | 'WEEKLY' | 'AS_NEEDED';
export const UsageFrequency = {
  DAILY: 'DAILY' as UsageFrequency,
  TWICE_DAILY: 'TWICE_DAILY' as UsageFrequency,
  WEEKLY: 'WEEKLY' as UsageFrequency,
  AS_NEEDED: 'AS_NEEDED' as UsageFrequency,
};

export type UsageTime = 'MORNING' | 'EVENING' | 'MORNING_AND_EVENING' | 'ANYTIME';
export const UsageTime = {
  MORNING: 'MORNING' as UsageTime,
  EVENING: 'EVENING' as UsageTime,
  MORNING_AND_EVENING: 'MORNING_AND_EVENING' as UsageTime,
  ANYTIME: 'ANYTIME' as UsageTime,
};

// --- USER TYPES ---
export interface UserResponseDTO {
  id: string;
  email: string;
  name: string;
  allergens?: string;
  skinType?: string;
  picture?: string;
}
export interface UserDetailDTO extends UserResponseDTO { }
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
  imageUrl?: string;
  category?: string;
  ingredients?: string;
  qualityScore?: number;
}
export interface ProductDetailDTO extends ProductResponseDTO {
  description?: string;
  averageUserRating?: number;
}
export interface ProductCreateDTO { name: string; brand: string; price: number; }
export interface ProductUpdateDTO extends Partial<ProductCreateDTO> { }
export interface ProductRecommendationDTO { products: ProductResponseDTO[]; reason: string; }

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
  usageTime: UsageTime;
}
export interface StreakCreateDTO { productId: number; usageFrequency: UsageFrequency; usageTime: UsageTime; }
export interface StreakUpdateDTO { usageFrequency?: UsageFrequency; usageTime?: UsageTime; }

// --- RATING & PURCHASE & NOTIFICATION ---
export interface RatingResponseDTO {
  id: number;
  productId: number;
  rating: number;
  comment?: string;
  userName?: string;
  review?: string;
  verifiedPurchase?: boolean;
}
export interface RatingCreateDTO { productId: number; rating: number; comment?: string; }
export interface RatingUpdateDTO { rating: number; comment?: string; }
export interface ProductRatingStatsDTO { averageRating: number; totalRatings: number; }

export interface PurchaseResponseDTO { id: number; purchaseDate: string; totalAmount: number; }
export interface PurchaseCreateDTO { productIds: string[]; totalAmount: number; }
export interface PurchaseUpdateDTO { status: string; }
export interface PurchaseDetailDTO extends PurchaseResponseDTO { items: any[]; }
export interface PurchaseStatsDTO { totalPurchases: number; totalSpent: number; }

export interface NotificationResponseDTO { id: number; message: string; isRead: boolean; createdAt: string; }
export interface NotificationUnreadCountDTO { count: number; }

// --- API CONFIGURATION ---
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const apiClient = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' } });

// --- INTERCEPTORS ---
// Request Interceptor: Basic Auth header'ı ekle
apiClient.interceptors.request.use(
  (config) => {
    if (config.url === '/api/users' && config.method === 'post') {
      return config;
    }

    const authHeader = localStorage.getItem('authHeader');
    if (authHeader) {
      config.headers['Authorization'] = authHeader;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Hata yönetimi
apiClient.interceptors.response.use(
  (response) => response,
  (error: any) => {

    const errorData = error.response?.data;

    let errorMessage = 'Bir hata oluştu';

    if (typeof errorData === 'string') {
      errorMessage = errorData;
    } else if (errorData?.errorMessages?.[0]?.message) {
      errorMessage = errorData.errorMessages[0].message;
    } else if (errorData?.message) {
      errorMessage = errorData.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return Promise.reject(new ApiError(errorMessage, error.response?.status));
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
  getAllProducts: async () => (await apiClient.get<ProductResponseDTO[]>('/api/products')).data,
  searchProducts: async (query: string) => (await apiClient.get<ProductResponseDTO[]>(`/api/products/search?query=${query}`)).data,
};

export const streakApi = {
  getMyStreaks: async () => (await apiClient.get<StreakResponseDTO[]>('/api/streaks/my-streaks')).data,
  createStreak: async (data: StreakCreateDTO) => (await apiClient.post<StreakResponseDTO>('/api/streaks', data)).data,
  recordUsage: async (id: number) => (await apiClient.post(`/api/streaks/${id}/usage`)).data,
  deleteStreak: async (id: number) => (await apiClient.delete(`/api/streaks/${id}`)).data,
};

export const ratingApi = {
  getRatingsByProductId: async (id: number) => (await apiClient.get<RatingResponseDTO[]>(`/api/ratings/product/${id}`)).data,
  getProductRatingStats: async (id: number) => (await apiClient.get<ProductRatingStatsDTO>(`/api/ratings/product/${id}/stats`)).data,
};