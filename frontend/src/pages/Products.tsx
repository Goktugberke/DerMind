import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { addToCart } from '../store/slices/cartSlice';
import type { Product } from '../store/slices/cartSlice';
import SearchBar from '../components/SearchBar';
import ProductFilters from '../components/ProductFilters';

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

interface FilterOptions {
  minPrice: number;
  maxPrice: number;
  minRating: number;
  category: string;
  skinType: string;
}

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(mockProducts);
  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: 0,
    maxPrice: 1000,
    minRating: 0,
    category: '',
    skinType: '',
  });
  const dispatch = useAppDispatch();

  useEffect(() => {
    let filtered = [...mockProducts];

    // Arama filtresi
    if (searchQuery) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Fiyat filtresi
    if (filters.minPrice > 0) {
      filtered = filtered.filter((product) => product.price >= filters.minPrice);
    }
    if (filters.maxPrice < 1000) {
      filtered = filtered.filter((product) => product.price <= filters.maxPrice);
    }

    // Puan filtresi
    if (filters.minRating > 0) {
      filtered = filtered.filter(
        (product) => (product.rating || 0) >= filters.minRating
      );
    }

    // Kategori filtresi (mock - gerçek projede ürünlerde kategori olacak)
    // Şimdilik sadece isim bazlı filtreleme yapıyoruz

    setFilteredProducts(filtered);
  }, [searchQuery, filters]);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setSearchParams({ search: query.trim() });
    } else {
      setSearchParams({});
    }
  };

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const handleFilterReset = () => {
    setFilters({
      minPrice: 0,
      maxPrice: 1000,
      minRating: 0,
      category: '',
      skinType: '',
    });
  };

  return (
    <div className="products-page">
      <div className="container">
        <div className="products-header">
          <h1>Ürünler</h1>
          <div className="products-search">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>

        <ProductFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleFilterReset}
        />

        {filteredProducts.length === 0 ? (
          <div className="no-products">
            <p>Aradığınız kriterlere uygun ürün bulunamadı.</p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <div key={product.id} className="product-card">
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
                    onClick={() => dispatch(addToCart(product))}
                  >
                    Sepete Ekle
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;

