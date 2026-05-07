import axios from 'axios';
import { auth } from '../firebase';


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
  allergens?: string[];
  skinType?: string;
  picture?: string;
  isAdmin?: boolean;
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
  allergens?: string[];
  skinType?: string;
}

// --- PRODUCT TYPES ---
export interface ProductResponseDTO {
  id: string;
  name: string;
  brand: string;
  price?: number;
  category?: string;
  hiddenStatus?: boolean;
  ingredients?: string;
  qualityScore?: number;
  imageUrl?: string;
}
export interface PageResponse<T> {
  content: T[];
  page: {
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
  };
}
export interface ProductDetailDTO extends ProductResponseDTO {
  description?: string;
  averageUserRating?: number;
  totalRatings?: number;
  totalPurchases?: number;
  personalScore?: number;
}
export interface ProductCreateDTO { name: string; brand: string; price: number; }
export type ProductUpdateDTO = Partial<ProductCreateDTO>;
export interface ProductRecommendationDTO {
  id: number;
  name: string;
  brand: string;
  qualityScore: number;
  matchScore: number;
  recommendation: string;
  reason: string;
}

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
export interface StreakUpdateDTO {
  usageFrequency?: UsageFrequency;
  customTimes?: string[];
  daysOfWeek?: string[];
  isActive?: boolean;
}

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


export interface PurchaseResponseDTO {
  id: number;
  userId: string;
  userName?: string;
  productId: number;
  productName: string;
  productBrand: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress: string;
  trackingNumber?: string;
  notes?: string;
  purchasedAt: string;
  deliveredAt?: string;
}
export interface PurchaseCreateDTO {
  productId: number;
  quantity: number;
  unitPrice: number;
  paymentMethod: string;
  shippingAddress: string;
  notes?: string;
}
export interface PurchaseUpdateDTO { status: string; }
export interface PurchaseDetailDTO extends PurchaseResponseDTO { items: unknown[]; }
export interface PurchaseStatsDTO { totalPurchases: number; totalSpent: number; }

export interface NotificationResponseDTO { id: number; message: string; isRead: boolean; createdAt: string; }
export interface NotificationUnreadCountDTO { count: number; }

// --- AI TYPES ---
export interface AiRecommendItemDTO {
  product_id: string;
  product_name: string;
  brand: string;
  category: string;
  base_score: number;
  similarity: number;
  rating: number;
  price_usd: number;
  image_url?: string;
}

export interface AiRecommendResponseDTO {
  user_skin_type: string;
  category_filter: string;
  recommendations: AiRecommendItemDTO[];
}

export interface AiExplainResponseDTO {
  product_id: string;
  product_name: string;
  brand: string;
  base_score: number;
  personal_score: number;
  explanation: string;
  skin_type: string;
  allergen_warnings: string[];
}

// --- API CONFIGURATION ---
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const apiClient = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' } });


// --- INTERCEPTORS ---
// Request Interceptor: Auth header'ı ekle
apiClient.interceptors.request.use(
  async (config) => {
    let token = localStorage.getItem('authHeader');

    // Firebase kullanıcısı varsa güncel token al
    if (auth.currentUser) {
      try {
        const firebaseToken = await auth.currentUser.getIdToken();
        token = `Bearer ${firebaseToken}`;
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
  getAllProducts: async (page = 0, size = 12, sort = 'qualityScore,desc') =>
    (await apiClient.get<PageResponse<ProductResponseDTO>>(`/api/products?page=${page}&size=${size}&sort=${sort}`)).data,
  searchProducts: async (query: string, page = 0, size = 12) =>
    (await apiClient.get<PageResponse<ProductResponseDTO>>(`/api/products/search?query=${query}&page=${page}&size=${size}`)).data,
  filterProducts: async (params: { query?: string; minPrice?: number; maxPrice?: number; minQuality?: number; page?: number; size?: number; sort?: string }) => {
    const { query, minPrice, maxPrice, minQuality, page = 0, size = 12, sort = 'qualityScore,desc' } = params;
    let url = `/api/products/filter?page=${page}&size=${size}&sort=${sort}`;
    if (query) url += `&query=${encodeURIComponent(query)}`;
    if (minPrice !== undefined) url += `&minPrice=${minPrice}`;
    if (maxPrice !== undefined) url += `&maxPrice=${maxPrice}`;
    if (minQuality !== undefined) url += `&minQuality=${minQuality}`;
    return (await apiClient.get<PageResponse<ProductResponseDTO>>(url)).data;
  },
  getTopQualityProducts: async (limit = 10) => (await apiClient.get<ProductDetailDTO[]>(`/api/products/top/quality?limit=${limit}`)).data,
  getRecommendationsForUser: async () => (await apiClient.get<ProductRecommendationDTO[]>('/api/products/recommendations/me')).data,
  getSimilarProducts: async (id: number) => {
    try {
      // Use the new AI-based similarity endpoint
      const aiResponse = await apiClient.get<AiRecommendResponseDTO>(`/api/ai/similar/${id}`);
      
      if (!aiResponse.data || !aiResponse.data.recommendations) {
        console.warn("[API] AI similar products returned null or empty");
        return [];
      }

      return aiResponse.data.recommendations;
    } catch (error) {
      console.error("Similar products AI fetch error:", error);
      return [];
    }
  },
};

export const aiApi = {
  getRecommendations: async (category?: string, secondaryCategory?: string, topK: number = 5) => {
    let url = `/api/ai/recommend?topK=${topK}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (secondaryCategory) url += `&secondaryCategory=${encodeURIComponent(secondaryCategory)}`;
    return (await apiClient.get<AiRecommendResponseDTO>(url)).data;
  },
  getExplanation: async (productId: number, language: string = 'tr') => {
    return (await apiClient.get<AiExplainResponseDTO>(`/api/ai/explain/${productId}?language=${language}`)).data;
  },
};

export const streakApi = {
  getMyStreaks: async () => (await apiClient.get<StreakResponseDTO[]>('/api/streaks/my-streaks')).data,
  createStreak: async (data: StreakCreateDTO) => (await apiClient.post<StreakResponseDTO>('/api/streaks', data)).data,
  updateStreak: async (id: number, data: StreakUpdateDTO) => (await apiClient.put<StreakResponseDTO>(`/api/streaks/${id}`, data)).data,
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

export const purchaseApi = {
  createPurchase: async (data: PurchaseCreateDTO) => (await apiClient.post<PurchaseResponseDTO>('/api/purchases', data)).data,
  getPurchasesByUserId: async () => (await apiClient.get<PurchaseResponseDTO[]>('/api/purchases/my-purchases')).data,
};

export const adminApi = {
  getAllProductsAdmin: async () => (await apiClient.get<ProductResponseDTO[]>('/api/admin/products')).data,
  deleteProduct: async (productId: number | string) => await apiClient.delete(`/api/admin/products/${productId}`),
  toggleHideProduct: async (productId: number | string) => (await apiClient.put<ProductResponseDTO>(`/api/admin/products/${productId}/hide`)).data,
  getAllReviewsAdmin: async () => (await apiClient.get<RatingResponseDTO[]>('/api/admin/reviews')).data,
  deleteReview: async (reviewId: number | string) => await apiClient.delete(`/api/admin/reviews/${reviewId}`),
};

