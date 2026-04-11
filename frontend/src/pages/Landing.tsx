import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { addToCartAsync } from '../store/slices/cartSlice';
import type { Product } from '../store/slices/cartSlice';
import SearchBar from '../components/SearchBar';
import { productApi } from '../types/api';

const Landing = () => {
  const dispatch = useAppDispatch();
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        setLoading(true);
        const data = await productApi.getTopQualityProducts(6);
        
        // Convert DTO to UI Product type
        const converted = data.map(dto => ({
          id: dto.id.toString(),
          name: dto.name,
          price: dto.price || (100 + (parseInt(dto.id.toString(), 10) * 12345 % 400)),
          description: dto.ingredients 
            ? (dto.ingredients.length > 60 ? dto.ingredients.substring(0, 57) + '...' : dto.ingredients)
            : '',
          rating: dto.qualityScore || 0,
          image: undefined
        }));
        
        setTopProducts(converted);
      } catch (error) {
        console.error('Anasayfa ürünleri yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopProducts();
  }, []);

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
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Ürünler yükleniyor...</p>
            </div>
          ) : (
            <div className="products-grid">
              {topProducts.map((product) => (
                <div key={product.id} className="product-card">
                  <Link to={`/products/${product.id}`} className="product-link">
                    <div className="product-image">
                      {product.image ? (
                        <img src={product.image} alt={product.name} />
                      ) : (
                        <div className="product-placeholder">📦</div>
                      )}
                      {product.rating && product.rating >= 8.0 && (
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
                          {'⭐'.repeat(Math.round(product.rating / 2))} {(product.rating / 2).toFixed(1)}
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
          )}

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
