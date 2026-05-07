export interface User {
  id: string;
  email: string;
  name: string;
  skinType?: string;
  allergens?: string[];
  picture?: string;
  notificationPreferences?: NotificationPreference;
}

export interface UserProfileData {
  name?: string;
  skinType?: string;
  allergens?: string[];
  picture?: string;
  notificationPreferences?: NotificationPreference;
}

export interface UpdateUserProfilePayload {
  userId: string;
  profileData: UserProfileData;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  ingredients?: string | any[];  // backend string (CSV) veya dizi olarak dönebilir
  brand?: string;
  category?: string;
  secondaryCategory?: string;
  rating?: number;
  averageUserRating?: number;
  reviewsCount?: number;
  totalRatings?: number;
  [key: string]: any;
}

export interface CartItem {
  id?: number;
  productId: number;
  productName?: string;
  productImage?: string;
  price?: number;
  quantity: number;
  subtotal?: number;
}

// Backend List<CartItemResponseDTO> döndürüyor
export type Cart = CartItem[];

export interface Favorite {
  productId: number;
  [key: string]: any;
}

export interface Rating {
  id: number;
  productId: number;
  [key: string]: any;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type?: string;
  [key: string]: any;
}

export interface NotificationPreference {
  push: boolean;
  email: boolean;
  sms: boolean;
}