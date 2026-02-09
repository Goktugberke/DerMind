import axios from 'axios';
import { Platform } from 'react-native';

// Emulator tipine göre IP'yi otomatik seçelim
const BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:8080' 
  : 'http://localhost:8080';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
});

export const authService = {
  // Standart Kayıt (POST /api/users)
  register: (userData) => api.post('/api/users', userData),

  // Google/Firebase Senkronizasyonu (POST /api/users/firebase)
  firebaseLogin: (firebaseData) => api.post('/api/users/firebase', firebaseData),

  // Kullanıcı Detayı Çekme (GET /api/users/me)
  getCurrentUser: () => api.get('/api/users/me'),
};

export default api;