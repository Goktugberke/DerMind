import { useState } from 'react';

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

  const handleChange = (key: keyof FilterOptions, value: string | number) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="product-filters">
      <button
        className="filter-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        🔍 Filtrele {isOpen ? '▲' : '▼'}
      </button>

      {isOpen && (
        <div className="filter-panel">
          <div className="filter-section">
            <h3>Fiyat Aralığı</h3>
            <div className="filter-range">
              <div className="range-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                    handleChange('minPrice', val);
                  }}
                  className="range-input"
                  min="0"
                />
                <span>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 1000 : parseInt(e.target.value);
                    handleChange('maxPrice', val);
                  }}
                  className="range-input"
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h3>Minimum Puan</h3>
            <div className="rating-filter">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  className={`rating-btn ${
                    filters.minRating >= rating ? 'active' : ''
                  }`}
                  onClick={() =>
                    handleChange(
                      'minRating',
                      filters.minRating === rating ? 0 : rating
                    )
                  }
                >
                  {'⭐'.repeat(rating)}
                </button>
              ))}
            </div>
          </div>

          {/* Unused Category and Skin Type filters removed as requested */}

          <div className="filter-actions">
            <button className="btn btn-secondary" onClick={onReset}>
              Filtreleri Temizle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductFilters;
