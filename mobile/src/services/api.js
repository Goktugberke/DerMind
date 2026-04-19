import axios from 'axios';
import { Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuth, getIdToken } from '@react-native-firebase/auth';
import { API_URL_ANDROID, API_URL_IOS } from '@env';

const BASE_URL = Platform.OS === 'android' ? API_URL_ANDROID : API_URL_IOS;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
});

api.interceptors.request.use(async (config) => {
  const user = getAuth().currentUser;

  if (user) {
    const idToken = await getIdToken(user);
    config.headers.Authorization = `Bearer ${idToken}`;
  }

  return config;
});

export const authService = {
  // Standart Kayıt (POST /api/users)
  register: (userData) => api.post('/api/users', userData),

  // Google/Firebase Senkronizasyonu (POST /api/users/firebase)
  firebaseLogin: (firebaseData) => api.post('/api/users/firebase', firebaseData),

  // Kullanıcı Detayı Çekme (GET /api/users/me)
  getCurrentUser: () => api.get('/api/users/me'),
};

export const productService = {
  getAllProducts: (page = 0, size = 15) => api.get(`/api/products?page=${page}&size=${size}`),
  searchProducts: (query, page = 0, size = 15) => api.get(`/api/products/search?query=${query}&page=${page}&size=${size}`),
  getProductById: (id) => api.get(`/api/products/${id}`),
};

export const purchaseService = {
  getPurchasesByUser: (userId) => api.get(`/api/purchases/user/${userId}`),
};

export const cartService = {
  getCart: () => api.get('/api/cart'),
  addItem: (productId, quantity = 1) => api.post('/api/cart/add', { productId, quantity }),
  updateQuantity: (productId, quantity) => api.put(`/api/cart/item/${productId}?quantity=${quantity}`),
  removeItem: (productId) => api.delete(`/api/cart/item/${productId}`),
  clearCart: () => api.delete('/api/cart')
};

export const favoriteService = {
  getFavorites: () => api.get('/api/favorites/my-favorites'),
  addFavorite: (productId) => api.post(`/api/favorites/${productId}`),
  removeFavorite: (productId) => api.delete(`/api/favorites/${productId}`),
  checkFavorite: (productId) => api.get(`/api/favorites/check/${productId}`),
};

export const ratingsService = {
  getProductRatings: (productId) => api.get(`/api/ratings/product/${productId}`),
};

// ============ TanStack Query Hooks ============

// Products
export const useGetAllProducts = (page = 0, size = 15) => {
  return useQuery({
    queryKey: ['products', page, size],
    queryFn: () => productService.getAllProducts(page, size).then(res => res.data),
  });
};

export const useSearchProducts = (query, page = 0, size = 15, enabled = true) => {
  return useQuery({
    queryKey: ['searchProducts', query, page, size],
    queryFn: () => productService.searchProducts(query, page, size).then(res => res.data),
    enabled: !!query && enabled,
  });
};

export const useGetProductById = (id, enabled = true) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productService.getProductById(id).then(res => res.data),
    enabled: !!id && enabled,
  });
};

// Auth
export const useGetCurrentUser = (enabled = true) => {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authService.getCurrentUser().then(res => res.data),
    enabled,
  });
};

export const useRegister = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userData) => authService.register(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
};

export const useFirebaseLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (firebaseData) => authService.firebaseLogin(firebaseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
};

// Favorites
export const useGetFavorites = (enabled = true) => {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoriteService.getFavorites().then(res => res.data),
    enabled,
  });
};

export const useCheckFavorite = (productId, enabled = true) => {
  return useQuery({
    queryKey: ['favorite', productId],
    queryFn: () => favoriteService.checkFavorite(productId).then(res => res.data),
    enabled: !!productId && enabled,
  });
};

export const useAddFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId) => favoriteService.addFavorite(productId),
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: ['favorite', productId] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
};

export const useRemoveFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId) => favoriteService.removeFavorite(productId),
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: ['favorite', productId] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
};

// Cart
export const useGetCart = (enabled = true) => {
  return useQuery({
    queryKey: ['cart'],
    queryFn: () => cartService.getCart().then(res => res.data),
    enabled,
  });
};

export const useAddToCart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity }) => cartService.addItem(productId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

export const useUpdateCartQuantity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity }) => cartService.updateQuantity(productId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

export const useRemoveFromCart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId) => cartService.removeItem(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

export const useClearCart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartService.clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

// Ratings
export const useGetProductRatings = (productId, enabled = true) => {
  return useQuery({
    queryKey: ['ratings', productId],
    queryFn: () => ratingsService.getProductRatings(productId).then(res => res.data),
    enabled: !!productId && enabled,
  });
};

export default api;