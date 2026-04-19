import axios from 'axios';
import { Platform } from 'react-native';
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

export default api;