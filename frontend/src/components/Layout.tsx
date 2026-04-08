import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCurrentUser } from '../store/slices/authSlice';

const Layout = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);


  useEffect(() => {
    // Sadece kullanıcı daha önce giriş yapmışsa (isLoggedIn varsa) sor
    if (localStorage.getItem('isLoggedIn') === 'true' && !isAuthenticated) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, isAuthenticated]);

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">
          <p>&copy; 2024 DerMind. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

