import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addToCart } from '../store/slices/cartSlice';
import type { Product } from '../store/slices/cartSlice';
import { productApi, ratingApi } from '../types/api';
import type { ProductDetailDTO, RatingResponseDTO} from '../types/api';

const convertToProduct = (dto: ProductDetailDTO): Product => {
  return {
    id: dto.id.toString(),
    name: dto.name,
    price: dto.price || 0,
    description: dto.ingredients || '',
    rating: dto.averageUserRating || dto.qualityScore || 0,
    image: dto.imageUrl
  };
};

interface ProductScore {
  overallScore: number;
  skinTypeMatch: number;
  allergySafe: number;
  ingredientQuality: number;
  userRating: number;
  mlScore: number;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [product, setProduct] = useState<Product | null>(null);
  const [productDetail, setProductDetail] = useState<ProductDetailDTO | null>(null);
  const [ratings, setRatings] = useState<RatingResponseDTO[]>([]);
  // const [ratingStats, setRatingStats] = useState<ProductRatingStatsDTO | null>(null);
  const [score, setScore] = useState<ProductScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateMLScore = (productData: ProductDetailDTO) => {
    const baseScore = productData.averageUserRating || productData.qualityScore || 4.0;
    const skinTypeMatch = user?.skinType ? Math.random() * 0.3 + 0.7 : 0.5;
    const allergySafe = user?.allergies && user.allergies.length > 0 ? Math.random() * 0.2 + 0.8 : 1.0;
    const ingredientQuality = (productData.qualityScore || 0) / 10;
    const mlScore = (baseScore * 0.3 + skinTypeMatch * 0.3 + allergySafe * 0.2 + ingredientQuality * 0.2) * 20;

    setScore({
      overallScore: mlScore,
      skinTypeMatch: skinTypeMatch * 100,
      allergySafe: allergySafe * 100,
      ingredientQuality: ingredientQuality * 100,
      userRating: baseScore * 20,
      mlScore: mlScore,
    });
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const productId = parseInt(id, 10);
        if (isNaN(productId)) {
          setError('Geçersiz ürün ID');
          return;
        }

        const productData = await productApi.getProductById(productId);
        setProductDetail(productData);
        setProduct(convertToProduct(productData));

        try {
          const [ratingsData] = await Promise.all([
            ratingApi.getRatingsByProductId(productId)
          ]);
          setRatings(ratingsData);
        } catch (e) { console.error("Rating fetch error", e); }

        calculateMLScore(productData);
      } catch (err) {
        setError('Ürün yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, user]);

  if (loading) return <div className="container"><p>Ürün yükleniyor...</p></div>;
  if (error || !product) return <div className="container"><p>{error || 'Ürün bulunamadı.'}</p><Link to="/products">Dön</Link></div>;

  return (
    <div className="product-detail-page">
      <div className="container">
        <Link to="/products" className="back-link">← Ürünlere Dön</Link>
        <div className="product-detail-content">
          <div className="product-detail-image">
            {product.image ? <img src={product.image} alt={product.name} /> : <div className="product-placeholder-large">📦</div>}
          </div>
          <div className="product-detail-info">
            <h1>{product.name}</h1>
            {productDetail?.brand && <div className="product-brand">Marka: {productDetail.brand}</div>}
            {productDetail?.qualityScore && <div>Kalite Puanı: {productDetail.qualityScore.toFixed(1)}/10</div>}
            <div className="product-price-large">{product.price > 0 ? `${product.price.toFixed(2)} ₺` : 'Fiyat bilgisi yok'}</div>
            
            {score && (
              <div className="product-scoring">
                <h3>ML Analizi</h3>
                <div className="score-value">Puan: {score.overallScore.toFixed(1)}</div>
              </div>
            )}

            <button className="btn btn-primary" onClick={() => dispatch(addToCart(product))}>Sepete Ekle</button>

            <div className="product-ratings">
              {ratings.map((rating) => (
                <div key={rating.id} className="rating-item">
                  <strong>{rating.userName || 'Anonim'}</strong>: {rating.rating}/10
                  <p>{rating.comment || rating.review}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;