import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { registerUser, loginUser, clearError } from '../store/slices/authSlice';
import { mergeCartAsync } from '../store/slices/cartSlice';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((state) => state.auth);

  const handleGoogleLogin = async () => {
    try {
      dispatch(clearError());
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const token = await user.getIdToken();

      await dispatch(loginUser({
        token,
        email: user.email || '',
        name: user.displayName || 'Google User',
        picture: user.photoURL || '',
        uid: user.uid
      })).unwrap();
      
      // Giriş sonrası sepeti senkronize et
      dispatch(mergeCartAsync());
      
      navigate('/');
    } catch (err: any) {
      console.error('Google Auth error:', err);
      // Firebase popup-closed-by-user etc.
      if (err.code === 'auth/popup-closed-by-user') {
        // No need to show error if user just closed the popup
        return;
      }
      // For other errors, we can use a generic message
      alert('Google ile giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    setPasswordError('');

    try {
      if (isRegister) {
        if (!name.trim() || !password) {
          return;
        }

        if (password.length < 8) {
          setPasswordError('Şifre en az 8 karakter olmalıdır.');
          return;
        }
        if (!/[A-Z]/.test(password)) {
          setPasswordError('Şifre en az 1 büyük harf içermelidir.');
          return;
        }
        if (!/[a-z]/.test(password)) {
          setPasswordError('Şifre en az 1 küçük harf içermelidir.');
          return;
        }
        if (!/[0-9]/.test(password)) {
          setPasswordError('Şifre en az 1 rakam içermelidir.');
          return;
        }

        await dispatch(registerUser({ email, name, password })).unwrap();
        dispatch(mergeCartAsync());
        navigate('/');
      } else {
        await dispatch(loginUser({ email, password })).unwrap();
        dispatch(mergeCartAsync());
        navigate('/');
      }
    } catch (err) {
      console.error('Auth error:', err);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1>{isRegister ? 'Kayıt Ol' : 'Giriş Yap'}</h1>
          <p className="auth-subtitle">
            {isRegister
              ? 'DerMind ailesine katılın'
              : 'Hesabınıza giriş yapın'}
          </p>

          {error && <div className="error-message">{error}</div>}
          {passwordError && <div className="error-message">{passwordError}</div>}

          <div className="social-auth">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              Google ile devam et
            </button>
          </div>

          <div className="auth-divider">
            <span>veya e-posta ile devam et</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {isRegister && (
              <div className="form-group">
                <label htmlFor="name">Ad Soyad</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Adınız ve soyadınız"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">E-posta</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Şifre</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={isRegister ? 8 : 6}
              />
              {!isRegister && (
                <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                  <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: 'var(--text-light)', textDecoration: 'none' }} className="forgot-password-link">
                    Şifremi unuttum
                  </Link>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'İşleniyor...' : isRegister ? 'Kayıt Ol' : 'Giriş Yap'}
            </button>
          </form>

          <div className="auth-switch">
            <p>
              {isRegister ? 'Zaten hesabınız var mı? ' : 'Hesabınız yok mu? '}
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  dispatch(clearError());
                  setPasswordError('');
                }}
              >
                {isRegister ? 'Giriş yap' : 'Kayıt ol'}
              </button>
            </p>
          </div>

          <div className="auth-footer">
            <Link to="/" className="back-link">
              ← Ana sayfaya dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;