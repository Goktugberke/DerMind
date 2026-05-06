import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addToCartAsync } from '../store/slices/cartSlice';
import type { Product } from '../store/slices/cartSlice';
import SearchBar from '../components/SearchBar';
import ProductFilters from '../components/ProductFilters';
import { productApi, favoriteApi } from '../types/api';
import type { ProductResponseDTO, PageResponse } from '../types/api';

// Convert ProductResponseDTO to Product (for cart)
const convertToProduct = (dto: ProductResponseDTO): Product => {
  return {
    id: dto.id.toString(),
    name: dto.name,
    brand: dto.brand,
    price: dto.price || (dto as any).price_usd || 0,
    description: dto.ingredients || '',
    rating: dto.qualityScore || 0,
    category: dto.category,
    image: dto.imageUrl,
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
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: 0,
    maxPrice: 1000,
    minRating: 0,
    category: '',
    skinType: '',
    sortBy: 'rating-desc',
  });
  
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(0);
  const loader = useRef<HTMLDivElement>(null);
  
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

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
  const fetchProducts = useCallback(async (pageNum: number, isInitial = false, explicitQuery?: string) => {
    const currentQuery = explicitQuery !== undefined ? explicitQuery : searchQuery;
    if (!hasMore && !isInitial) return;
    if (loading || loadingMore) return; // Prevent parallel fetches

    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      setError(null);
      
      const response: PageResponse<ProductResponseDTO> = await productApi.filterProducts({
        query: currentQuery,
        minPrice: filters.minPrice > 0 ? filters.minPrice : undefined,
        maxPrice: filters.maxPrice < 1000 ? filters.maxPrice : undefined,
        minQuality: filters.minRating > 0 ? filters.minRating : undefined, 
        page: pageNum,
        size: 12,
        sort: getSortString(filters.sortBy)
      });

      console.log(`[Products] Page ${pageNum} received. Total elements: ${response.page.totalElements}, Total pages: ${response.page.totalPages}`);

      const convertedProducts = response.content.map(convertToProduct);
      
      if (isInitial) {
        setProducts(convertedProducts);
      } else {
        setProducts(prev => {
          // Deduplicate based on product ID to prevent React "duplicate key" warnings
          const existingIds = new Set(prev.map(p => p.id));
          const newOnes = convertedProducts.filter(p => !existingIds.has(p.id));
          return [...prev, ...newOnes];
        });
      }
      
      const more = response.page.number + 1 < response.page.totalPages;
      setHasMore(more);
    } catch (err) {
      setError('Ürünler yüklenirken bir hata oluştu');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, filters, hasMore, loading, loadingMore]);

  // Handle Search and Filter changes
  useEffect(() => {
    setProducts([]);
    pageRef.current = 0;
    setHasMore(true);
    
    const query = searchParams.get('search') || '';
    setSearchQuery(query);
    fetchProducts(0, true, query);
  }, [searchParams, filters.sortBy, filters.minPrice, filters.maxPrice, filters.minRating]);

  // Loader Intersection Observer
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !loading && !loadingMore) {
      pageRef.current += 1;
      fetchProducts(pageRef.current);
    }
  }, [hasMore, loading, loadingMore, fetchProducts]);

  useEffect(() => {
    const loadingRef = loader.current;
    const option = {
      root: null,
      rootMargin: '20px',
      threshold: 0
    };
    const observer = new IntersectionObserver(handleObserver, option);
    if (loadingRef) observer.observe(loadingRef);
    
    return () => {
      if (loadingRef) observer.unobserve(loadingRef);
    };
  }, [handleObserver]);

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

  // Server-side filtering is used now, client-side filtering removed
  useEffect(() => {
    setFilteredProducts(products);
  }, [products]);

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
                onChange={(e) => handleFilterChange({...filters, sortBy: e.target.value as FilterOptions['sortBy']})}
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
          onFilterChange={(newFilters) => handleFilterChange(newFilters as FilterOptions)}
          onReset={handleFilterReset}
        />

        {filteredProducts.length === 0 ? (
          <div className="no-products">
            <p>Aradığınız kriterlere uygun ürün bulunamadı. Filtreleri temizlemeyi deneyin.</p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <div 
                key={product.id} 
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
                        className={`add-favorite-btn ${favoriteIds.has(String(product.id)) ? 'active' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite(product.id);
                        }}
                      >
                        {favoriteIds.has(String(product.id)) ? '❤️' : '🤍'}
                      </button>
                    )}
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    {product.brand && <p className="product-brand" style={{ fontSize: '0.85em', color: '#666' }}>{product.brand}</p>}
                    {product.description && (
                      <p className="product-description" style={{ maxHeight: '40px', overflow: 'hidden' }}>{product.description}</p>
                    )}
                    {product.rating !== undefined && (
                      <div className="product-rating">
                        ⭐ {product.rating.toFixed(1)}/10
                      </div>
                    )}
                  </div>
                </Link>
                <div className="product-footer">
                  <span className="product-price">${product.price.toFixed(2)}</span>
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
        
        {/* Infinite Scroll Loader */}
        <div ref={loader} className="scroll-loader" style={{ height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px' }}>
          {loadingMore && <p>Daha fazla ürün yükleniyor...</p>}
          {!hasMore && products.length > 0 && <p>Tüm ürünler yüklendi.</p>}
        </div>
      </div>
    </div>
  );
};

export default Products;
