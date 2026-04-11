import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCurrentUser } from '../store/slices/authSlice';
import { auth } from '../firebase';

const Layout = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  useEffect(() => {
    // Keep authHeader in sync with Firebase session
    const unsubscribe = auth.onIdTokenChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        localStorage.setItem('authHeader', `Bearer ${token}`);
        localStorage.setItem('isLoggedIn', 'true');
        console.log("AuthHeader synced with Firebase session");
      } else {
        // If no firebase user, we don't necessarily clear localStorage here 
        // to avoid race conditions during logout/login
      }
    });

    return () => unsubscribe();
  }, []);

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
          <p>&copy; 2026 DerMind. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

