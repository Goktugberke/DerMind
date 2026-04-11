import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
}

const SearchBar = ({ onSearch, placeholder = 'Ürün ara...', initialValue = '' }: SearchBarProps) => {
  const [query, setQuery] = useState(initialValue);
  const navigate = useNavigate();

  // Keep query in sync with external initialValue (e.g. from URL or filter reset)
  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (onSearch) {
        onSearch(query.trim());
      } else {
        navigate(`/products?search=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const handleClear = () => {
    setQuery('');
    if (onSearch) {
      onSearch('');
    } else {
      navigate('/products');
    }
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit} style={{ position: 'relative', display: 'flex', width: '100%' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="search-input"
        style={{ paddingRight: query ? '40px' : '10px' }}
      />
      {query && (
        <button 
          type="button" 
          onClick={handleClear}
          style={{
            position: 'absolute',
            right: '45px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: '#999',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '5px'
          }}
        >
          ✕
        </button>
      )}
      <button type="submit" className="search-button">
        🔍
      </button>
    </form>
  );
};

export default SearchBar;
