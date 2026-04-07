import { Link } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { addToCartAsync } from '../store/slices/cartSlice';
import type { Product } from '../store/slices/cartSlice';
import SearchBar from '../components/SearchBar';

// Mock data - gerçek projede API'den gelecek
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Yüz Temizleme Jeli',
    price: 149.99,
    description: 'Hassas ciltler için özel formül',
    rating: 4.5,
  },
  {
    id: '2',
    name: 'Nemlendirici Krem',
    price: 199.99,
    description: '24 saat nemlendirme garantisi',
    rating: 4.8,
  },
  {
    id: '3',
    name: 'Güneş Koruyucu SPF 50',
    price: 179.99,
    description: 'UVA/UVB koruması',
    rating: 4.7,
  },
  {
    id: '4',
    name: 'Göz Çevresi Kremi',
    price: 249.99,
    description: 'Kırışıklık önleyici',
    rating: 4.6,
  },
  {
    id: '5',
    name: 'Tonik',
    price: 129.99,
    description: 'Gözenek sıkılaştırıcı',
    rating: 4.4,
  },
  {
    id: '6',
    name: 'Serum C Vitamini',
    price: 299.99,
    description: 'Parlaklık ve canlılık',
    rating: 4.9,
  },
];

const Landing = () => {
  const dispatch = useAppDispatch();
  
  // En yüksek puanlı ürünleri sırala (en fazla 6 ürün göster)
  const topRatedProducts = [...mockProducts]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 6);

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">DerMind ile Cildinizi Keşfedin</h1>
          <p className="hero-subtitle">
            Cilt tipinize ve ihtiyaçlarınıza özel kozmetik ürünleri bulun.
            Yapay zeka destekli önerilerimizle size en uygun ürünleri keşfedin.
          </p>
          <div className="hero-search">
            <SearchBar placeholder="Hangi ürünü arıyorsunuz?" />
          </div>
          <div className="hero-actions">
            <Link to="/products" className="btn btn-primary">
              Ürünleri Keşfet
            </Link>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2 className="section-title">Neden DerMind?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Kişiselleştirilmiş Öneriler</h3>
              <p>
                Cilt tipiniz, alerjileriniz ve tercihlerinize göre size özel
                ürün önerileri sunuyoruz.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⭐</div>
              <h3>Yapay Zeka Destekli Puanlama</h3>
              <p>
                ML teknikleriyle ürünleri analiz edip size en uygun olanları
                önceliklendiriyoruz.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Rutin Takibi</h3>
              <p>
                Mobil uygulamamızla rutinlerinizi takip edin ve cilt bakımınızı
                düzenli hale getirin.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="top-products">
        <div className="container">
          <h2 className="section-title">En Yüksek Puanlı Ürünler</h2>
          <p className="section-subtitle">
            Kullanıcılarımızın en çok beğendiği ve ML modelimizin en yüksek puan verdiği ürünler
          </p>
          <div className="products-grid">
            {topRatedProducts.map((product) => (
              <div key={product.id} className="product-card">
                <Link to={`/products/${product.id}`} className="product-link">
                  <div className="product-image">
                    {product.image ? (
                      <img src={product.image} alt={product.name} />
                    ) : (
                      <div className="product-placeholder">📦</div>
                    )}
                    {product.rating && product.rating >= 4.5 && (
                      <div className="product-badge">Top Rated</div>
                    )}
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    {product.description && (
                      <p className="product-description">{product.description}</p>
                    )}
                    {product.rating && (
                      <div className="product-rating">
                        {'⭐'.repeat(Math.floor(product.rating))} {product.rating}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="product-footer">
                  <span className="product-price">{product.price.toFixed(2)} ₺</span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => dispatch(addToCartAsync(product))}
                  >
                    Sepete Ekle
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="section-actions">
            <Link to="/products" className="btn btn-secondary">
              Tüm Ürünleri Gör
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
