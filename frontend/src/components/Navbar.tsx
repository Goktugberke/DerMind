import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Navbar = () => {
  const { getTotalItems } = useCart();
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          DerMind
        </Link>
        <div className="navbar-links">
          <Link to="/">Ana Sayfa</Link>
          <Link to="/products">Ürünler</Link>
          <Link to="/routine">Rutinler</Link>
          <Link to="/cart" className="cart-link">
            Sepet
            {getTotalItems() > 0 && (
              <span className="cart-badge">{getTotalItems()}</span>
            )}
          </Link>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Karanlık moda geç' : 'Aydınlık moda geç'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="user-name">
                {user?.name}
              </Link>
              <button className="btn btn-secondary btn-sm" onClick={logout}>
                Çıkış
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Giriş
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

