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
    <form onSubmit={handleSubmit} style={{ 
      position: 'relative', 
      display: 'flex', 
      width: '100%',
      height: '48px',
      backgroundColor: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      overflow: 'hidden',
      border: '1px solid #e5e7eb',
      transition: 'all 0.3s ease'
    }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        style={{ 
          flex: 1,
          height: '100%',
          padding: '0 16px',
          paddingRight: query ? '100px' : '16px',
          border: 'none',
          outline: 'none',
          fontSize: '1rem',
          color: '#374151',
          background: 'transparent'
        }}
      />
      <div style={{ 
        position: 'absolute', 
        right: '60px', 
        top: '0', 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {query && (
          <button 
            type="button" 
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              padding: '0',
              transition: 'all 0.2s ease',
              opacity: 0.6
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '0.6';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Temizle"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>
      <button 
        type="submit" 
        style={{
          width: '56px',
          height: '100%',
          flexShrink: 0,
          backgroundColor: '#6366f1',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0'
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </button>
    </form>
  );
};

export default SearchBar;
