import { useState, useEffect } from 'react';

interface FilterOptions {
  minPrice: number;
  maxPrice: number;
  minRating: number;
  category: string;
  skinType: string;
}

interface ProductFiltersProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onReset: () => void;
}

const ProductFilters = ({
  filters,
  onFilterChange,
  onReset,
}: ProductFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localMin, setLocalMin] = useState(filters.minPrice.toString());
  const [localMax, setLocalMax] = useState(filters.maxPrice.toString());
  const [localRating, setLocalRating] = useState(filters.minRating);

  // Sync with parent when filters are reset or changed externally
  useEffect(() => {
    setLocalMin(filters.minPrice.toString());
    setLocalMax(filters.maxPrice.toString());
    setLocalRating(filters.minRating);
  }, [filters.minPrice, filters.maxPrice, filters.minRating]);

  const handleApply = () => {
    onFilterChange({
      ...filters,
      minPrice: parseInt(localMin) || 0,
      maxPrice: parseInt(localMax) || 1000,
      minRating: localRating
    });
  };

  const handleRatingChange = (rating: number) => {
    setLocalRating(localRating === rating ? 0 : rating);
  };

  return (
    <div className="product-filters" style={{ marginBottom: '20px' }}>
      <button
        className="filter-toggle"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '10px 20px',
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#374151',
          transition: 'all 0.2s'
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
        Filtrele {isOpen ? '▲' : '▼'}
      </button>

      {isOpen && (
        <div className="filter-panel">
          <div className="filter-section">
            <h3>Fiyat Aralığı</h3>
            <div className="range-inputs">
              <input
                type="number"
                placeholder="Min"
                value={localMin}
                onChange={(e) => setLocalMin(e.target.value)}
                className="range-input"
                min="0"
              />
              <span style={{ color: '#9ca3af', flexShrink: 0 }}>-</span>
              <input
                type="number"
                placeholder="Max"
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                className="range-input"
                min="0"
              />
            </div>
          </div>

          <div className="filter-section">
            <h3>Minimum Puan</h3>
            <div className="rating-filter">
              {[2, 4, 6, 8, 10].map((rating) => (
                <button
                  key={rating}
                  className={`rating-btn ${localRating === rating ? 'active' : ''}`}
                  onClick={() => handleRatingChange(rating)}
                >
                  <span>★</span>
                  <span>{rating}+</span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-actions">
            <button 
              className="btn-reset" 
              onClick={onReset}
            >
              Temizle
            </button>
            <button 
              className="btn-apply" 
              onClick={handleApply}
            >
              Filtreleri Uygula
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductFilters;
