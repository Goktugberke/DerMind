import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addToCart } from '../store/slices/cartSlice';
import type { Product } from '../store/slices/cartSlice';
import { productApi, ratingApi, streakApi, favoriteApi, UsageFrequency } from '../types/api';
import type { ProductDetailDTO, RatingResponseDTO } from '../types/api';

const convertToProduct = (dto: ProductDetailDTO): Product => {
  const mockPrice = dto.price || (100 + (parseInt(dto.id, 10) * 12345 % 400));
  return {
    id: dto.id.toString(),
    name: dto.name,
    price: mockPrice,
    description: dto.ingredients || '',
    rating: dto.averageUserRating || dto.qualityScore || 0,
    image: dto.imageUrl || 'https://via.placeholder.com/300'
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
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const [product, setProduct] = useState<Product | null>(null);
  const [productDetail, setProductDetail] = useState<ProductDetailDTO | null>(null);
  const [ratings, setRatings] = useState<RatingResponseDTO[]>([]);
  const [score, setScore] = useState<ProductScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Routine Modal State
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [usageFrequency, setUsageFrequency] = useState<UsageFrequency>(UsageFrequency.DAILY);
  const [usageTime, setUsageTime] = useState<string>('08:00');
  const [routineLoading, setRoutineLoading] = useState(false);

  const calculateMLScore = useCallback((productData: ProductDetailDTO) => {
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
  }, [user]);

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
          const ratingsData = await ratingApi.getRatingsByProductId(productId);
          setRatings(ratingsData);
        } catch (e) { console.error("Rating fetch error", e); }

        if (isAuthenticated) {
          try {
            const isFav = await favoriteApi.checkIsFavorite(productId);
            setIsFavorite(isFav);
          } catch (e) { console.error("Favorite check error", e); }
        }

        calculateMLScore(productData);
      } catch {
        setError('Ürün yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, user, calculateMLScore]);

  const handleAddToRoutine = async () => {
    if (!isAuthenticated) {
      alert('Rutin oluşturmak için giriş yapmalısınız.');
      navigate('/login');
      return;
    }

    if (product && id) {
      try {
        setRoutineLoading(true);
        await streakApi.createStreak({
          productId: parseInt(id),
          usageFrequency,
          customTimes: [usageTime]
        });
        alert('Ürün rutine eklendi!');
        setShowRoutineModal(false);
      } catch (err: unknown) {
        console.error(err);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((err as any).response?.status === 409) {
          alert('Bu ürün zaten rutininizde var.');
        } else {
          alert('Rutin eklenirken bir hata oluştu.');
        }
      } finally {
        setRoutineLoading(false);
      }
    }
  };

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      alert('Favorilere eklemek için giriş yapmalısınız.');
      navigate('/login');
      return;
    }

    if (!id) return;

    try {
      setFavLoading(true);
      if (isFavorite) {
        await favoriteApi.removeFavorite(id);
        setIsFavorite(false);
      } else {
        await favoriteApi.addFavorite(id);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      alert('Favori işlemi sırasında bir hata oluştu.');
    } finally {
      setFavLoading(false);
    }
  };

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
            <div className="product-price-large">{product.price.toFixed(2)} ₺</div>

            {score && (
              <div className="product-scoring">
                <h3>ML Analizi</h3>
                <div className="score-value">Puan: {score.overallScore.toFixed(1)}</div>
              </div>
            )}

            <div className="product-actions" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button className="btn btn-primary" onClick={() => dispatch(addToCart(product))}>Sepete Ekle</button>
              <button
                onClick={() => setShowRoutineModal(true)}
                className="btn btn-secondary"
                style={{ backgroundColor: '#6c757d', color: 'white' }}
              >
                📅 Rutine Ekle
              </button>
              <button
                className={`btn ${isFavorite ? 'btn-danger' : 'btn-outline'}`}
                onClick={toggleFavorite}
                disabled={favLoading}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  backgroundColor: isFavorite ? '#ef4444' : 'transparent',
                  color: isFavorite ? 'white' : '#1f2937',
                  border: '1px solid #d1d5db'
                }}
              >
                {isFavorite ? '❤️ Favorilerde' : '🤍 Favorilere Ekle'}
              </button>
            </div>

            {/* ROUTINE MODAL */}
            {showRoutineModal && (
              <div className="routine-modal-overlay" style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
              }}>
                <div className="routine-modal" style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  width: '90%',
                  maxWidth: '400px',
                  color: 'black' // Ensure text is visible if dark mode
                }}>
                  <h3>Rutine Ekle</h3>
                  <p style={{ marginBottom: '10px' }}><strong>{product.name}</strong></p>

                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Kullanım Sıklığı</label>
                    <select
                      className="form-select"
                      style={{ width: '100%', padding: '8px' }}
                      value={usageFrequency}
                      onChange={(e) => setUsageFrequency(e.target.value as UsageFrequency)}
                    >
                      <option value="DAILY">Günde 1 Kez</option>
                      <option value="TWICE_DAILY">Günde 2 Kez</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Kullanım Zamanı</label>
                    <input
                      type="time"
                      className="form-control"
                      style={{ width: '100%', padding: '8px' }}
                      value={usageTime}
                      onChange={(e) => setUsageTime(e.target.value)}
                    />
                  </div>

                  <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      className="btn"
                      onClick={() => setShowRoutineModal(false)}
                      style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#e0e0e0', border: 'none' }}
                    >
                      İptal
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleAddToRoutine}
                      disabled={routineLoading}
                      style={{ padding: '8px 15px', cursor: 'pointer' }}
                    >
                      {routineLoading ? 'Ekleniyor...' : 'Onayla'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="product-ratings">
              <h3>Yorumlar</h3>
              {ratings.length === 0 ? <p>Henüz yorum yapılmamış.</p> : (
                ratings.map((rating) => (
                  <div key={rating.id} className="rating-item" style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{rating.userName || 'Kullanıcı'}</strong>
                      <span>{rating.rating}/5</span>
                    </div>
                    <p>{rating.comment || rating.review}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;