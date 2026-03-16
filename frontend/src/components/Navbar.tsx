import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectTotalItems } from '../store/slices/cartSlice';
import { logoutUser } from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { selectTheme, toggleTheme } from '../store/slices/themeSlice';

const Navbar = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const totalItems = useAppSelector(selectTotalItems);
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const theme = useAppSelector(selectTheme);

  const handleLogout = async () => {
    await dispatch(logoutUser() as any);
    navigate('/');
  };

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

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
              <Link to="/profile" className="user-name">
                {user?.name}
              </Link>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
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