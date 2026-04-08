import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppSelector } from './store/hooks';
import { selectTheme } from './store/slices/themeSlice';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Routine from './pages/Routine';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import ForgotPassword from './pages/ForgotPassword';
import './App.css';

function App() {
  const theme = useAppSelector(selectTheme);

  // Theme'i document'e uygula
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="home" element={<Landing />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="login" element={<Login />} />
          <Route path="routine" element={<Routine />} />
          <Route path="profile" element={<Profile />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
