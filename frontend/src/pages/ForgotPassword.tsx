import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { userApi } from '../types/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Lütfen e-posta adresinizi girin.');
      return;
    }

    setLoading(true);
    try {
      // Backend'den kullanıcının var olup olmadığını kontrol et
      await userApi.getUserByEmail(email);
      
      // Kullanıcı mevcutsa, Firebase şifre sıfırlama mailini gönder
      await sendPasswordResetEmail(auth, email);
      setMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.');
      setTimeout(() => navigate('/login'), 5000);
    } catch (err: unknown) {
      console.error('Password reset error:', err);
      const firebaseErr = err as { code?: string, status?: number };
      
      if (firebaseErr.status === 404) {
          setError('Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı.');
      } else if (firebaseErr.code === 'auth/user-not-found') {
        setError('Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı.');
      } else if (firebaseErr.code === 'auth/invalid-email') {
        setError('Geçersiz bir e-posta adresi girdiniz.');
      } else {
        setError('Şifre sıfırlama işlemini gerçekleştirirken bir hata oluştu. Lütfen bağlantınızı veya bilgilerinizi kontrol edip tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1>Şifremi Unuttum</h1>
          <p className="auth-subtitle">
            Şifrenizi sıfırlamak için e-posta adresinizi girin
          </p>

          {error && <div className="error-message">{error}</div>}
          {message && <div style={{ backgroundColor: '#d1e7dd', color: '#0f5132', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{message}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
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

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ marginTop: '1rem' }}
            >
              {loading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Bağlantısı Gönder'}
            </button>
          </form>

          <div className="auth-footer" style={{ marginTop: '2rem' }}>
            <Link to="/login" className="back-link">
              ← Giriş sayfasına dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
