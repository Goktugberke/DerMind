import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { addToCart } from '../store/slices/cartSlice';
import type { Product } from '../store/slices/cartSlice';
import { favoriteApi } from '../types/api';
import type { FavoriteResponseDTO, ProductResponseDTO } from '../types/api';

const convertToProduct = (dto: ProductResponseDTO): Product => {
  const mockPrice = dto.price || (100 + (parseInt(dto.id, 10) * 12345 % 400));
  return {
    id: dto.id.toString(),
    name: dto.name,
    price: mockPrice,
    description: dto.ingredients || 'Cilt dostu içerik',
    rating: dto.qualityScore || 0,
    image: dto.imageUrl,
  };
};

const Favorites = () => {
  const [favorites, setFavorites] = useState<FavoriteResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await favoriteApi.getMyFavorites();
      setFavorites(data);
    } catch (err) {
      setError('Favoriler yüklenirken bir hata oluştu');
      console.error('Error fetching favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleRemoveFavorite = async (productId: string) => {
    try {
      await favoriteApi.removeFavorite(productId);
      setFavorites(favorites.filter(f => f.product.id !== productId));
    } catch (err) {
      console.error('Error removing favorite:', err);
      alert('Favori silinirken bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="favorites-page">
        <div className="container">
          <p>Favorileriniz yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="favorites-page">
        <div className="container">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <div className="container">
        <div className="favorites-header">
          <h1>Favorilerim</h1>
          <Link to="/products" className="btn btn-outline">
            Alışverişe Devam Et
          </Link>
        </div>

        {favorites.length === 0 ? (
          <div className="no-favorites">
            <div className="empty-state-icon">❤️</div>
            <h2>Henüz favori ürününüz yok</h2>
            <p>Beğendiğiniz ürünleri favorilerinize ekleyerek burada görebilirsiniz.</p>
            <Link to="/products" className="btn btn-primary">
              Ürünleri Keşfet
            </Link>
          </div>
        ) : (
          <div className="products-grid">
            {favorites.map((fav) => {
              const product = convertToProduct(fav.product);
              return (
                <div key={fav.id} className="product-card">
                  <button 
                    className="remove-favorite-btn"
                    onClick={() => handleRemoveFavorite(fav.product.id)}
                    title="Favorilerden Çıkar"
                  >
                    ❤️
                  </button>
                  <Link to={`/products/${product.id}`} className="product-link">
                    <div className="product-image">
                      {product.image ? (
                        <img src={product.image} alt={product.name} />
                      ) : (
                        <div className="product-placeholder">📦</div>
                      )}
                    </div>
                    <div className="product-info">
                      <h3 className="product-name">{product.name}</h3>
                      <p className="product-brand">{fav.product.brand}</p>
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
                      onClick={() => dispatch(addToCart(product))}
                    >
                      Sepete Ekle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
