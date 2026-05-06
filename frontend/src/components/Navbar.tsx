import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectTotalItems } from '../store/slices/cartSlice';
import { logoutUser } from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { selectTheme, toggleTheme } from '../store/slices/themeSlice';
import { useState } from 'react';

const Navbar = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const totalItems = useAppSelector(selectTotalItems);
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const theme = useAppSelector(selectTheme);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    setIsMenuOpen(false);
    navigate('/');
  };

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          DerMind
        </Link>
        
        <button className="navbar-toggle" onClick={toggleMenu} aria-label="Menüyü aç/kapat">
          {isMenuOpen ? '✕' : '☰'}
        </button>

        <div className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/" onClick={closeMenu}>Ana Sayfa</Link>
          <Link to="/products" onClick={closeMenu}>Ürünler</Link>
          <Link to="/routine" onClick={closeMenu}>Rutinler</Link>
          <Link to="/cart" className="cart-link" onClick={closeMenu}>
            Sepet
            {totalItems > 0 && (
              <span className="cart-badge">{totalItems}</span>
            )}
          </Link>
          <button
            className="theme-toggle"
            onClick={handleToggleTheme}
            title={theme === 'light' ? 'Karanlık moda geç' : 'Aydınlık moda geç'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="user-name" onClick={closeMenu}>
                <span className="user-text">{user?.name}</span>
              </Link>
              <Link to="/orders" onClick={closeMenu}>Siparişlerim</Link>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                Çıkış
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm" onClick={closeMenu}>
              Giriş
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;