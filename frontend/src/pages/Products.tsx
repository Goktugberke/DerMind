import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { addToCart } from '../store/slices/cartSlice';
import type { Product } from '../store/slices/cartSlice';
import SearchBar from '../components/SearchBar';
import ProductFilters from '../components/ProductFilters';
import { productApi } from '../types/api';
import type { ProductResponseDTO } from '../types/api';

// Convert ProductResponseDTO to Product (for cart)
const convertToProduct = (dto: ProductResponseDTO): Product => {
  // Mock price based on ID if missing (between 100 and 500)
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
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: 0,
    maxPrice: 1000,
    minRating: 0,
    category: '',
    skinType: '',
  });
  const dispatch = useAppDispatch();

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        let productsData: ProductResponseDTO[];

        if (searchQuery) {
          productsData = await productApi.searchProducts(searchQuery);
        } else {
          productsData = await productApi.getAllProducts();
        }

        const convertedProducts = productsData.map(convertToProduct);
        setProducts(convertedProducts);
      } catch (err) {
        setError('Ürünler yüklenirken bir hata oluştu');
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchQuery]);

  // Apply filters
  useEffect(() => {
    let filtered = [...products];

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

    setFilteredProducts(filtered);
  }, [products, filters]);

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

  if (loading) {
    return (
      <div className="products-page">
        <div className="container">
          <p>Ürünler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="products-page">
        <div className="container">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

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

