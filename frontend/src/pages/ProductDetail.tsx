import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addToCartAsync } from '../store/slices/cartSlice';
import type { Product } from '../store/slices/cartSlice';
import { productApi, ratingApi, streakApi, favoriteApi, aiApi, UsageFrequency } from '../types/api';
import type { ProductDetailDTO, RatingResponseDTO, AiExplainResponseDTO } from '../types/api';

const convertToProduct = (dto: any): Product => {
  const id = dto.id || dto.product_id;
  const name = dto.name || dto.product_name;

  // REAL DATA ONLY: Use database price or AI-provided price_usd
  const realPrice = dto.price || dto.price_usd || dto.priceUsd || 0;

  return {
    id: id.toString(),
    name: name,
    brand: dto.brand,
    price: realPrice,
    description: dto.ingredients || '',
    rating: dto.averageUserRating || dto.qualityScore || dto.base_score || dto.rating || 0,
    category: dto.category,
    image: dto.imageUrl || dto.image_url
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
  const [similarProducts, setSimilarProducts] = useState<import('../types/api').AiRecommendItemDTO[]>([]);

  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [editingRatingId, setEditingRatingId] = useState<number | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // AI Explanation State
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // Routine Modal State
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [usageFrequency, setUsageFrequency] = useState<UsageFrequency>(UsageFrequency.DAILY);
  const [usageTimes, setUsageTimes] = useState<string[]>(['08:00']);
  const [routineLoading, setRoutineLoading] = useState(false);

  const calculateMLScore = useCallback((productData: ProductDetailDTO) => {
    // Quality score mapping to 0-100 baseline
    const qualityBase = (productData.qualityScore ?? 0) * 10;

    // AI Personalized score (0-100)
    // Backend/AI returns 1-10, so we scale it.
    const personalScore = productData.personalScore ? (productData.personalScore * 10) : qualityBase;

    setScore({
      overallScore: personalScore,
      skinTypeMatch: productData.personalScore ? (productData.personalScore > 7 ? 95 : 75) : (productData.qualityScore && productData.qualityScore > 7 ? 90 : 60),
      allergySafe: 100, // This is calculated by backend usually but for now placeholder
      ingredientQuality: qualityBase,
      userRating: (productData.averageUserRating || 5.0) * 10,
      mlScore: personalScore,
    });
  }, []);

  useEffect(() => {
    // Reset states when ID changes to avoid showing stale data from previous product
    setProduct(null);
    setProductDetail(null);
    setScore(null);
    setError(null);
    setExplanation(null);
    setIsExplaining(false);

    const fetchProduct = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const productId = parseInt(id, 10);
        if (isNaN(productId)) {
          setError('Geçersiz ürün ID');
          setLoading(false);
          return;
        }

        const currentToken = localStorage.getItem('authHeader');
        console.log(`[ProductDetail] Fetching product ${productId}. Auth status: ${isAuthenticated}, Profile exists: ${!!user}, Header present: ${!!currentToken}`);

        const productData = await productApi.getProductById(productId);
        console.log("[ProductDetail] Product data received:", productData);
        setProductDetail(productData);
        setProduct(convertToProduct(productData));

        try {
          const ratingsData = await ratingApi.getRatingsByProductId(productId);
          setRatings(ratingsData);
        } catch (e) { console.error("Rating fetch error", e); }

        try {
          const similarData = await productApi.getSimilarProducts(productId);
          setSimilarProducts(similarData);
        } catch (e) { console.error("Similar products fetch error", e); }

        if (isAuthenticated) {
          try {
            const isFav = await favoriteApi.checkIsFavorite(productId);
            setIsFavorite(isFav);
          } catch (e) { console.error("Favorite check error", e); }
        }

        calculateMLScore(productData);
      } catch (err) {
        console.error("Fetch product error", err);
        setError('Ürün yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    // Strict Auth Sync: Wait if we suspect the user is logged in but profile hasn't loaded yet
    const hasLoginHint = localStorage.getItem('isLoggedIn') === 'true';
    const shouldWait = (hasLoginHint && !user);

    if (shouldWait) {
      return;
    }

    fetchProduct();
  }, [id, user, calculateMLScore, isAuthenticated]);

  const handleFetchExplanation = async () => {
    if (!id || isExplaining) return;
    try {
      setIsExplaining(true);
      const res = await aiApi.getExplanation(parseInt(id, 10));
      setExplanation(res.explanation);
    } catch (err) {
      console.error("Explanation error", err);
      setExplanation("Analiz alınırken bir hata oluştu. Lütfen Ollama sunucusunun çalıştığından emin olun.");
    } finally {
      setIsExplaining(false);
    }
  };

  const handleAddToRoutine = async () => {
    if (!isAuthenticated) {
      alert('Rutin oluşturmak için giriş yapmalısınız.');
      navigate('/login');
      return;
    }

    if (product && id) {
      try {
        setRoutineLoading(true);
        const finalTimes = usageFrequency === UsageFrequency.DAILY ? [usageTimes[0]] : usageTimes;
        await streakApi.createStreak({
          productId: parseInt(id),
          usageFrequency,
          customTimes: finalTimes
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

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      alert('Yorum yapmak için giriş yapmalısınız.');
      navigate('/login');
      return;
    }
    if (!id) return;

    try {
      setReviewLoading(true);
      if (editingRatingId) {
        const updated = await ratingApi.updateRating(editingRatingId, {
          rating: reviewRating,
          review: reviewText
        });
        setRatings(ratings.map(r => r.id === updated.id ? updated : r));
        setEditingRatingId(null);
      } else {
        const created = await ratingApi.addRating({
          userId: user.id,
          productId: parseInt(id),
          rating: reviewRating,
          review: reviewText
        });
        setRatings([...ratings, created]);
      }
      setReviewText('');
      setReviewRating(5);
    } catch (err) {
      console.error(err);
      alert('Yorum kaydedilirken bir hata oluştu');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDeleteReview = async (ratingId: number) => {
    if (!window.confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
    try {
      setReviewLoading(true);
      await ratingApi.deleteRating(ratingId);
      setRatings(ratings.filter(r => r.id !== ratingId));
    } catch (err) {
      console.error(err);
      alert('Yorum silinirken bir hata oluştu');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleEditReview = (rating: RatingResponseDTO) => {
    setEditingRatingId(rating.id);
    setReviewText(rating.review || rating.comment || '');
    setReviewRating(rating.rating);
  };

  const handleCancelEdit = () => {
    setEditingRatingId(null);
    setReviewText('');
    setReviewRating(5);
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
            <div className="product-price-large">${product.price.toFixed(2)}</div>

            {score && (
              <div className="product-scoring" style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '12px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ML Analizi
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div className="score-main" style={{
                    fontSize: '2.5em',
                    fontWeight: 'bold',
                    color: score.overallScore > 70 ? '#10b981' : score.overallScore > 30 ? '#f59e0b' : '#ef4444'
                  }}>
                    {(score.overallScore / 10).toFixed(1)}<span style={{ fontSize: '0.5em', color: '#9ca3af' }}>/10</span>
                  </div>
                  <div className="score-desc" style={{ fontSize: '0.95em', color: '#4b5563' }}>
                    Bu ürün cilt tipin ve tercihlerine göre <strong>{score.overallScore > 70 ? 'yüksek' : score.overallScore > 30 ? 'orta' : 'düşük'}</strong> uyumluluk gösteriyor.
                  </div>
                </div>

                {/* AI Explanation Button/Text */}
                <div style={{ marginTop: '15px', borderTop: '1px solid #e5e7eb', paddingTop: '15px' }}>
                  {!explanation ? (
                    <button
                      onClick={handleFetchExplanation}
                      disabled={isExplaining}
                      className="btn"
                      style={{
                        width: '100%',
                        backgroundColor: '#6366f1',
                        color: 'white',
                        padding: '10px',
                        borderRadius: '8px',
                        fontSize: '0.9em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {isExplaining ? (
                        <>
                          <span className="loader-dots">Analiz Ediliyor...</span>
                        </>
                      ) : (
                        <>✨ DerMind AI Analizi Al</>
                      )}
                    </button>
                  ) : (
                    <div style={{
                      backgroundColor: '#ffffff',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '0.9em',
                      lineHeight: '1.6',
                      color: '#374151',
                      borderLeft: '4px solid #6366f1'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>✨ AI Analizi:</span>
                      </div>
                      {explanation}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="product-ingredients-section" style={{ marginTop: '20px', marginBottom: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1.1em', margin: 0, color: '#1f2937' }}>İçerik Analizi</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {productDetail?.safeIngredientCount !== undefined && (
                    <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75em', fontWeight: 'bold', border: '1px solid #a7f3d0' }}>
                      {productDetail.safeIngredientCount} Güvenli
                    </div>
                  )}
                  {productDetail?.cautionIngredientCount !== undefined && productDetail.cautionIngredientCount > 0 && (
                    <div style={{ backgroundColor: '#fffbeb', color: '#92400e', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75em', fontWeight: 'bold', border: '1px solid #fde68a' }}>
                      {productDetail.cautionIngredientCount} Dikkat
                    </div>
                  )}
                  {productDetail?.riskyIngredientCount !== undefined && productDetail.riskyIngredientCount > 0 && (
                    <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75em', fontWeight: 'bold', border: '1px solid #fecaca' }}>
                      {productDetail.riskyIngredientCount} Riskli
                    </div>
                  )}
                </div>
              </div>

              {/* Visual Progress Bar Breakdown */}
              {(productDetail?.safeIngredientCount !== undefined || productDetail?.cautionIngredientCount !== undefined || productDetail?.riskyIngredientCount !== undefined) && (
                <div style={{ height: '8px', width: '100%', display: 'flex', borderRadius: '4px', overflow: 'hidden', marginBottom: '15px', backgroundColor: '#f3f4f6' }}>
                  {(() => {
                    const safe = productDetail?.safeIngredientCount || 0;
                    const caution = productDetail?.cautionIngredientCount || 0;
                    const risky = productDetail?.riskyIngredientCount || 0;
                    const total = safe + caution + risky;
                    if (total === 0) return null;
                    return (
                      <>
                        <div style={{ width: `${(safe / total) * 100}%`, backgroundColor: '#10b981' }} title="Safe" />
                        <div style={{ width: `${(caution / total) * 100}%`, backgroundColor: '#f59e0b' }} title="Caution" />
                        <div style={{ width: `${(risky / total) * 100}%`, backgroundColor: '#ef4444' }} title="Risky" />
                      </>
                    );
                  })()}
                </div>
              )}

              <div style={{
                padding: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.9em',
                lineHeight: '1.6',
                color: productDetail?.ingredients ? '#4b5563' : '#9ca3af',
                maxHeight: '150px',
                overflowY: 'auto',
                fontStyle: productDetail?.ingredients ? 'normal' : 'italic'
              }}>
                {productDetail?.ingredients || 'Bu ürün için içerik bilgisi henüz eklenmemiştir.'}
              </div>
            </div>

            <div className="product-actions" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button className="btn btn-primary" onClick={() => dispatch(addToCartAsync(product))}>Sepete Ekle</button>
              <button
                onClick={() => setShowRoutineModal(true)}
                className="btn btn-secondary"
                style={{ backgroundColor: '#6c757d', color: 'white' }}
              >
                Rutine Ekle
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

            {similarProducts.length > 0 && (
              <div className="similar-products-section" style={{ marginTop: '30px', marginBottom: '30px' }}>
                <h3 style={{ fontSize: '1.2em', marginBottom: '15px', color: '#1f2937' }}>Benzer Ürün Önerileri</h3>
                <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
                  {similarProducts.map((simDto) => {
                    const simProd = convertToProduct(simDto);
                    return (
                      <Link
                        key={simProd.id}
                        to={`/products/${simProd.id}`}
                        style={{
                          minWidth: '200px',
                          maxWidth: '200px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '10px',
                          textDecoration: 'none',
                          color: 'inherit',
                          backgroundColor: '#fff',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        <div style={{ height: '150px', backgroundColor: '#f3f4f6', borderRadius: '4px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {simProd.image ? <img src={simProd.image} alt={simProd.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: '2em' }}>📦</span>}
                        </div>
                        <strong style={{ fontSize: '0.95em', marginBottom: '5px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '40px' }}>{simProd.name}</strong>
                        <span style={{ fontSize: '0.85em', color: '#6b7280', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{simProd.brand}</span>
                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', color: '#10b981' }}>${simProd.price.toFixed(2)}</span>
                          {simProd.rating > 0 && <span style={{ fontSize: '0.8em', backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>⭐ {simProd.rating.toFixed(1)}/10</span>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

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
                    <label style={{ display: 'block', marginBottom: '5px' }}>Kullanım Zamanları</label>
                    {usageFrequency === UsageFrequency.TWICE_DAILY ? (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                          type="time"
                          className="form-control"
                          style={{ width: '100%', padding: '8px' }}
                          value={usageTimes[0] || '08:00'}
                          onChange={(e) => setUsageTimes([e.target.value, usageTimes[1] || '20:00'])}
                        />
                        <input
                          type="time"
                          className="form-control"
                          style={{ width: '100%', padding: '8px' }}
                          value={usageTimes[1] || '20:00'}
                          onChange={(e) => setUsageTimes([usageTimes[0] || '08:00', e.target.value])}
                        />
                      </div>
                    ) : (
                      <input
                        type="time"
                        className="form-control"
                        style={{ width: '100%', padding: '8px' }}
                        value={usageTimes[0] || '08:00'}
                        onChange={(e) => setUsageTimes([e.target.value])}
                      />
                    )}
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

            <div className="product-ratings" style={{ marginTop: '30px', color: 'black' }}>
              <h3>Yorumlar</h3>

              {/* Add/Edit Review Form */}
              {isAuthenticated ? (
                <form onSubmit={handleReviewSubmit} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>{editingRatingId ? 'Yorumu Düzenle' : 'Yorum Yap'}</h4>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', color: '#374151', fontWeight: '600', fontSize: '0.95em' }}>Ürün Puanı:</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starIdx) => {
                        const isSelected = reviewRating >= starIdx;
                        return (
                          <button
                            key={starIdx}
                            type="button"
                            onClick={() => setReviewRating(starIdx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              fontSize: '1.5rem',
                              color: isSelected ? '#fbbf24' : '#d1d5db',
                              transition: 'transform 0.1s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                          >
                            ★
                          </button>
                        );
                      })}
                      <span style={{ marginLeft: '10px', fontSize: '1.1em', fontWeight: 'bold', color: '#f59e0b', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '6px' }}>
                        {reviewRating}/10
                      </span>
                    </div>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#555' }}>Yorumunuz:</label>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '100px',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#f9fafb',
                        color: '#1f2937',
                        fontSize: '0.95em',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
                      placeholder="Ürün hakkındaki düşüncelerinizi paylaşın (isteğe bağlı)..."
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary" disabled={reviewLoading}>
                      {reviewLoading ? 'Kaydediliyor...' : 'Gönder'}
                    </button>
                    {editingRatingId && (
                      <button type="button" onClick={handleCancelEdit} className="btn" style={{ backgroundColor: '#e0e0e0', color: '#333' }} disabled={reviewLoading}>
                        İptal
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px', color: '#333' }}>
                  <p style={{ margin: 0 }}>Yorum yapmak için <Link to="/login" style={{ color: '#007bff' }}>giriş yapmalısınız</Link>.</p>
                </div>
              )}

              {ratings.length === 0 ? <p style={{ color: 'black' }}>Henüz yorum yapılmamış.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {ratings.map((rating) => (
                    <div key={rating.id} className="rating-item" style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', backgroundColor: '#fff', color: 'black' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div>
                          <strong style={{ fontSize: '1.1em', color: '#333' }}>{rating.userName || 'Kullanıcı'}</strong>
                          <span style={{ marginLeft: '10px', color: '#ffb400', fontWeight: 'bold' }}>⭐ {rating.rating}/10</span>
                        </div>
                        {user && rating.userId === user.id && (
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={() => handleEditReview(rating)}
                              style={{ border: 'none', background: 'none', color: '#007bff', cursor: 'pointer', padding: 0 }}
                              disabled={reviewLoading}
                            >
                              Düzenle
                            </button>
                            <button
                              onClick={() => handleDeleteReview(rating.id)}
                              style={{ border: 'none', background: 'none', color: '#dc3545', cursor: 'pointer', padding: 0 }}
                              disabled={reviewLoading}
                            >
                              Sil
                            </button>
                          </div>
                        )}
                      </div>
                      <p style={{ margin: 0, color: '#444', lineHeight: '1.5' }}>{rating.comment || rating.review}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;