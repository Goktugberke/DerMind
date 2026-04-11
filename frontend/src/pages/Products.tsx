import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addToCartAsync } from '../store/slices/cartSlice';
import type { Product } from '../store/slices/cartSlice';
import SearchBar from '../components/SearchBar';
import ProductFilters from '../components/ProductFilters';
import { productApi, favoriteApi } from '../types/api';
import type { ProductResponseDTO, PageResponse } from '../types/api';
import { useRef, useCallback } from 'react';

// Convert ProductResponseDTO to Product (for cart)
const convertToProduct = (dto: ProductResponseDTO): Product => {
  const mockPrice = dto.price || (100 + (parseInt(dto.id.toString(), 10) * 12345 % 400));

  return {
    id: dto.id.toString(),
    name: dto.name,
    brand: dto.brand,
    price: mockPrice,
    description: dto.ingredients || '',
    rating: dto.qualityScore || 0,
    category: dto.category,
    secondaryCategory: dto.secondaryCategory,
    image: undefined,
  };
};

interface FilterOptions {
  minPrice: number;
  maxPrice: number;
  minRating: number;
  category: string;
  skinType: string;
  sortBy: 'rating-desc' | 'rating-asc' | 'price-desc' | 'price-asc';
}

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastProductElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: 0,
    maxPrice: 1000,
    minRating: 0,
    category: '',
    skinType: '',
    sortBy: 'rating-desc',
  });
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Reset when sort or search changes
  useEffect(() => {
    setProducts([]);
    setPage(0);
    setHasMore(true);
    const query = searchParams.get('search') || '';
    setSearchQuery(query);
  }, [searchParams, filters.sortBy]);

  // Map sortBy to backend sort string
  const getSortString = (sortBy: string) => {
    switch (sortBy) {
      case 'rating-desc': return 'qualityScore,desc';
      case 'rating-asc': return 'qualityScore,asc';
      case 'price-desc': return 'price,desc';
      case 'price-asc': return 'price,asc';
      default: return 'qualityScore,desc';
    }
  };

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        let productsPage: PageResponse<ProductResponseDTO>;
        const sortString = getSortString(filters.sortBy);

        if (searchQuery) {
          productsPage = await productApi.searchProducts(searchQuery, page, 20, sortString);
        } else {
          productsPage = await productApi.getAllProducts(page, 20, sortString);
        }

        const convertedProducts = productsPage.content.map(convertToProduct);
        setProducts(prev => {
          // If it's first page, replace. Otherwise append.
          if (page === 0) return convertedProducts;
          return [...prev, ...convertedProducts];
        });
        setHasMore(page < productsPage.totalPages - 1);
      } catch (err) {
        setError('Ürünler yüklenirken bir hata oluştu');
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchQuery, page, filters.sortBy]);

  // Fetch Favorites
  useEffect(() => {
    const fetchFavorites = async () => {
      if (isAuthenticated) {
        try {
          const favs = await favoriteApi.getMyFavorites();
          setFavoriteIds(new Set(favs.map(f => f.product.id.toString())));
        } catch (err) {
          console.error('Error fetching favorites:', err);
        }
      } else {
        setFavoriteIds(new Set());
      }
    };
    fetchFavorites();
  }, [isAuthenticated]);

  const toggleFavorite = async (productId: string | number) => {
    if (!isAuthenticated) {
      alert('Favorilere eklemek için giriş yapmalısınız');
      return;
    }

    const idStr = productId.toString();
    const isFav = favoriteIds.has(idStr);
    try {
      if (isFav) {
        await favoriteApi.removeFavorite(productId);
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(idStr);
          return next;
        });
      } else {
        await favoriteApi.addFavorite(productId);
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.add(idStr);
          return next;
        });
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  // Apply basic client-side filtering (Rating & Price)
  useEffect(() => {
    let result = [...products];

    // Filter by Price
    if (filters.minPrice > 0) {
      result = result.filter((product) => product.price >= filters.minPrice);
    }
    if (filters.maxPrice < 1000) {
      result = result.filter((product) => product.price <= filters.maxPrice);
    }

    // Filter by Rating (5-star scale)
    if (filters.minRating > 0) {
      result = result.filter(
        (product) => (product.rating / 2) >= filters.minRating
      );
    }

    setFilteredProducts(result);
  }, [products, filters.minPrice, filters.maxPrice, filters.minRating]);

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
      sortBy: 'rating-desc',
    });
  };

  if (loading && products.length === 0) {
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
          <div className="products-controls" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="products-search" style={{ flex: 1, minWidth: '250px' }}>
              <SearchBar onSearch={handleSearch} initialValue={searchQuery} />
            </div>
            <div className="products-sort">
              <select 
                className="filter-select"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                value={filters.sortBy}
                onChange={(e) => handleFilterChange({...filters, sortBy: e.target.value as any})}
              >
                <option value="rating-desc">Puan (Yüksekten Düşüğe)</option>
                <option value="rating-asc">Puan (Düşükten Yükseğe)</option>
                <option value="price-desc">Fiyat (Yüksekten Düşüğe)</option>
                <option value="price-asc">Fiyat (Düşükten Yükseğe)</option>
              </select>
            </div>
          </div>
        </div>

        <ProductFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleFilterReset}
        />

        {filteredProducts.length === 0 ? (
          <div className="no-products">
            <p>Aradığınız kriterlere uygun ürün bulunamadı. Filtreleri temizlemeyi deneyin.</p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map((product, index) => {
              const isLastElement = filteredProducts.length === index + 1;
              return (
                <div 
                  key={`${product.id}-${index}`} 
                  ref={isLastElement ? lastProductElementRef : null} 
                  className="product-card"
                >
                  <Link to={`/products/${product.id}`} className="product-link">
                    <div className="product-image">
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          loading="lazy"
                        />
                      ) : (
                        <div className="product-placeholder">📦</div>
                      )}
                      {isAuthenticated && (
                        <button 
                          className={`add-favorite-btn ${favoriteIds.has(product.id.toString()) ? 'active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(product.id);
                          }}
                        >
                          {favoriteIds.has(product.id.toString()) ? '❤️' : '🤍'}
                        </button>
                      )}
                    </div>
                    <div className="product-info">
                      <h3 className="product-name">{product.name}</h3>
                      {product.brand && <p className="product-brand" style={{ fontSize: '0.85em', color: '#666' }}>{product.brand}</p>}
                      {product.description && (
                        <p className="product-description" style={{ maxHeight: '40px', overflow: 'hidden' }}>{product.description}</p>
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
              );
            })}
            {loading && <div className="loading-more">Daha fazla ürün yükleniyor...</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
