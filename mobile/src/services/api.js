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

export default api;