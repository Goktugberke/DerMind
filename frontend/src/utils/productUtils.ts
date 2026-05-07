import type { Product } from '../store/slices/cartSlice';
import type { ProductResponseDTO, ProductDetailDTO, AiRecommendItemDTO } from '../types/api';

/**
 * Standardized function to convert various Product DTOs to the UI Product interface.
 * Prioritizes the database image URL (imageUrl) and provides fallback logic.
 */
export const convertToProduct = (dto: any): Product => {
  const id = dto.id || dto.product_id;
  const name = dto.name || dto.product_name;

  // Real data prioritization for price
  const price = dto.price || dto.price_usd || dto.priceUsd || 0;

  // Image prioritization: database imageUrl -> AI server image_url -> null (placeholder)
  let image = dto.imageUrl || dto.image_url;

  // Clean up common "null" or empty string scenarios
  if (image === 'null' || image === '' || image === undefined) {
    image = undefined;
  }

  return {
    id: id.toString(),
    name: name,
    brand: dto.brand,
    price: price,
    description: dto.ingredients || dto.description || '',
    rating: dto.qualityScore || dto.base_score || dto.averageUserRating || dto.rating || 0,
    personalScore: dto.personalScore,
    category: dto.category,
    image: image,
  };
};
