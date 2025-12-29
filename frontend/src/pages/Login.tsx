import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError('Lütfen adınızı girin');
          return;
        }
        const success = await register(email, password, name);
        if (success) {
          navigate('/');
        }
      } else {
        const success = await login(email, password);
        if (success) {
          navigate('/');
        } else {
          setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
        }
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
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

          <form onSubmit={handleSubmit} className="auth-form">
            {isRegister && (
              <div className="form-group">
                <label htmlFor="name">Ad Soyad</label>
                <input
                  type="text"
                  id="name"
                  name="name"
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
                name="email"
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
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block">
              {isRegister ? 'Kayıt Ol' : 'Giriş Yap'}
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
                  setError('');
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

