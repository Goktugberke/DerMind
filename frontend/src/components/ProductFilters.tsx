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
        <div className="filter-panel" style={{
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
          marginTop: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <div className="filter-section">
            <h3 style={{ fontSize: '0.9rem', marginBottom: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fiyat Aralığı</h3>
            <div className="range-inputs" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                placeholder="Min"
                value={localMin}
                onChange={(e) => setLocalMin(e.target.value)}
                className="range-input"
                min="0"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.9rem'
                }}
              />
              <span style={{ color: '#9ca3af' }}>-</span>
              <input
                type="number"
                placeholder="Max"
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                className="range-input"
                min="0"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          <div className="filter-section">
            <h3 style={{ fontSize: '0.9rem', marginBottom: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Minimum Puan</h3>
            <div className="rating-filter" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
              {[2, 4, 6, 8, 10].map((rating) => (
                <button
                  key={rating}
                  className={`rating-btn ${localRating === rating ? 'active' : ''}`}
                  style={{
                    padding: '6px 4px',
                    fontSize: '0.8rem',
                    border: '1px solid',
                    borderColor: localRating === rating ? '#6366f1' : '#e5e7eb',
                    backgroundColor: localRating === rating ? '#eef2ff' : '#fff',
                    color: localRating === rating ? '#6366f1' : '#374151',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => handleRatingChange(rating)}
                >
                  <span style={{ color: filters.minRating === rating ? '#6366f1' : '#fbbf24' }}>★</span>
                  <span>{rating}+</span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-actions" style={{ 
            gridColumn: '1 / -1', 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '10px',
            borderTop: '1px solid #f3f4f6',
            paddingTop: '15px',
            marginTop: '5px'
          }}>
            <button 
              className="btn-reset" 
              onClick={onReset}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '0.9rem',
                padding: '8px 16px',
                textDecoration: 'underline'
              }}
            >
              Temizle
            </button>
            <button 
              className="btn-apply" 
              onClick={handleApply}
              style={{
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 24px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
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
