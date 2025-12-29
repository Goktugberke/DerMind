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

  const categories = [
    'Tümü',
    'Temizleme',
    'Nemlendirme',
    'Güneş Koruyucu',
    'Serum',
    'Tonik',
    'Göz Bakımı',
  ];

  const skinTypes = [
    'Tümü',
    'Kuru',
    'Yağlı',
    'Karma',
    'Hassas',
    'Normal',
  ];

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
                  onChange={(e) =>
                    handleChange('minPrice', parseInt(e.target.value) || 0)
                  }
                  className="range-input"
                />
                <span>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice || ''}
                  onChange={(e) =>
                    handleChange('maxPrice', parseInt(e.target.value) || 1000)
                  }
                  className="range-input"
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

          <div className="filter-section">
            <h3>Kategori</h3>
            <select
              value={filters.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="filter-select"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat === 'Tümü' ? '' : cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-section">
            <h3>Cilt Tipi</h3>
            <select
              value={filters.skinType}
              onChange={(e) => handleChange('skinType', e.target.value)}
              className="filter-select"
            >
              {skinTypes.map((type) => (
                <option key={type} value={type === 'Tümü' ? '' : type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

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

