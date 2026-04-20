export interface User {
  id: string;
  email: string;
  name: string;
  skinType?: string;
  allergens?: string;
  picture?: string;
}

export interface UserProfileData {
  name?: string;
  skinType?: string;
  allergens?: string;
  picture?: string;
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