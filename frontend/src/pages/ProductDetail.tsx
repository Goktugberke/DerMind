import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addToCart } from '../store/slices/cartSlice';
import type { Product } from '../store/slices/cartSlice';

// Mock ürün verileri - gerçek projede API'den gelecek
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Yüz Temizleme Jeli',
    price: 149.99,
    description: 'Hassas ciltler için özel formül. Gözenekleri temizler ve cildi yumuşatır.',
    rating: 4.5,
  },
  {
    id: '2',
    name: 'Nemlendirici Krem',
    price: 199.99,
    description: '24 saat nemlendirme garantisi. Cildi besler ve korur.',
    rating: 4.8,
  },
  {
    id: '3',
    name: 'Güneş Koruyucu SPF 50',
    price: 179.99,
    description: 'UVA/UVB koruması. Güneşin zararlı etkilerine karşı koruma sağlar.',
    rating: 4.7,
  },
  {
    id: '4',
    name: 'Göz Çevresi Kremi',
    price: 249.99,
    description: 'Kırışıklık önleyici. Göz çevresindeki ince çizgileri azaltır.',
    rating: 4.6,
  },
  {
    id: '5',
    name: 'Tonik',
    price: 129.99,
    description: 'Gözenek sıkılaştırıcı. Cildi temizler ve canlandırır.',
    rating: 4.4,
  },
  {
    id: '6',
    name: 'Serum C Vitamini',
    price: 299.99,
    description: 'Parlaklık ve canlılık. Cildi aydınlatır ve eşit ton sağlar.',
    rating: 4.9,
  },
];

interface ProductScore {
  overallScore: number;
  skinTypeMatch: number;
  allergySafe: number;
  ingredientQuality: number;
  userRating: number;
  mlScore: number; // ML modelinden gelen puan
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [product, setProduct] = useState<Product | null>(null);
  const [score, setScore] = useState<ProductScore | null>(null);
  // const [userRating, setUserRating] = useState(0);

  useEffect(() => {
    const foundProduct = mockProducts.find((p) => p.id === id);
    if (foundProduct) {
      setProduct(foundProduct);
      // Mock ML scoring - gerçek projede API'den gelecek
      calculateMLScore(foundProduct);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const calculateMLScore = (prod: Product) => {
    // Mock ML scoring algoritması
    // Gerçek projede bu backend'de ML modeli ile hesaplanacak
    const baseScore = prod.rating || 4.0;
    
    // Kullanıcının cilt tipine göre puanlama (mock)
    const skinTypeMatch = user?.skinType 
      ? Math.random() * 0.3 + 0.7 // 0.7-1.0 arası
      : 0.5;

    // Alerji güvenliği (mock)
    const allergySafe = user?.allergies && user.allergies.length > 0
      ? Math.random() * 0.2 + 0.8 // 0.8-1.0 arası
      : 1.0;

    // İçerik kalitesi (mock)
    const ingredientQuality = Math.random() * 0.2 + 0.8; // 0.8-1.0 arası

    // ML modelinden gelen puan (mock)
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

  // const handleRating = (rating: number) => {
  //   setUserRating(rating);
  //   // Gerçek projede API'ye gönderilecek
  // };

  if (!product) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <p>Ürün bulunamadı.</p>
          <Link to="/products">Ürünlere Dön</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <div className="container">
        <Link to="/products" className="back-link">
          ← Ürünlere Dön
        </Link>

        <div className="product-detail-content">
          <div className="product-detail-image">
            {product.image ? (
              <img src={product.image} alt={product.name} />
            ) : (
              <div className="product-placeholder-large">📦</div>
            )}
          </div>

          <div className="product-detail-info">
            <h1>{product.name}</h1>
            {product.description && (
              <p className="product-description">{product.description}</p>
            )}

            <div className="product-price-large">
              {product.price.toFixed(2)} ₺
            </div>

            {score && (
              <div className="product-scoring">
                <h2>Ürün Puanlaması</h2>
                <div className="score-overall">
                  <div className="score-circle">
                    <div className="score-value">{score.overallScore.toFixed(1)}</div>
                    <div className="score-label">Genel Puan</div>
                  </div>
                </div>

                <div className="score-breakdown">
                  <div className="score-item">
                    <div className="score-item-label">Cilt Tipi Uyumu</div>
                    <div className="score-bar">
                      <div
                        className="score-bar-fill"
                        style={{ width: `${score.skinTypeMatch}%` }}
                      />
                      <span className="score-bar-value">
                        {score.skinTypeMatch.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="score-item">
                    <div className="score-item-label">Alerji Güvenliği</div>
                    <div className="score-bar">
                      <div
                        className="score-bar-fill"
                        style={{ width: `${score.allergySafe}%` }}
                      />
                      <span className="score-bar-value">
                        {score.allergySafe.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="score-item">
                    <div className="score-item-label">İçerik Kalitesi</div>
                    <div className="score-bar">
                      <div
                        className="score-bar-fill"
                        style={{ width: `${score.ingredientQuality}%` }}
                      />
                      <span className="score-bar-value">
                        {score.ingredientQuality.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="score-item">
                    <div className="score-item-label">Kullanıcı Puanı</div>
                    <div className="score-bar">
                      <div
                        className="score-bar-fill"
                        style={{ width: `${score.userRating}%` }}
                      />
                      <span className="score-bar-value">
                        {score.userRating.toFixed(0)}/100
                      </span>
                    </div>
                  </div>

                  <div className="score-item ml-score">
                    <div className="score-item-label">
                      🤖 ML Model Puanı
                    </div>
                    <div className="ml-score-value">
                      {score.mlScore.toFixed(1)}/100
                    </div>
                    <p className="ml-score-description">
                      Bu puan, cilt tipiniz, alerjileriniz ve ürün içeriği analiz edilerek
                      makine öğrenmesi modeli tarafından hesaplanmıştır.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="product-actions">
              <button
                className="btn btn-primary btn-large"
                onClick={() => dispatch(addToCart(product))}
              >
                Sepete Ekle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;

