import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateUserProfile, logoutUser, fetchCurrentUser } from '../store/slices/authSlice';
import { Link, useNavigate } from 'react-router-dom';

const Profile = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    skinType: user?.skinType || '',
    allergies: user?.allergies?.join(', ') || '',
  });

  const skinTypeLabels: Record<string, string> = {
    'dry': 'Kuru',
    'oily': 'Yağlı',
    'combination': 'Karma',
    'normal': 'Normal',
  };

  const skinTypes = Object.keys(skinTypeLabels);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Fetch current user on mount
  useEffect(() => {
    if (user) {
      // User already loaded from Redux persist
      return;
    }
    // Try to fetch from API (for OAuth users)
    dispatch(fetchCurrentUser());
  }, [dispatch, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const allergies = formData.allergies
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    try {
      await dispatch(updateUserProfile({
        id: user.id,
        name: formData.name,
        skinType: formData.skinType,
        allergies,
      })).unwrap();
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/');
  };

  if (!user) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="auth-required">
            <h2>Profil Sayfası İçin Giriş Yapın</h2>
            <p>Profilinizi görüntülemek için lütfen giriş yapın.</p>
            <Link to="/login" className="btn btn-primary">
              Giriş Yap
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        <h1>Profilim</h1>

        <div className="profile-content">
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="profile-info-header">
                <h2>{user.name}</h2>
                <p className="profile-email">{user.email}</p>
              </div>
            </div>

            {!isEditing ? (
              <div className="profile-info">
                <div className="info-item">
                  <label>Ad Soyad</label>
                  <p>{user.name}</p>
                </div>
                <div className="info-item">
                  <label>E-posta</label>
                  <p>{user.email}</p>
                </div>
                <div className="info-item">
                  <label>Cilt Tipi</label>
                  <p>{user.skinType ? (skinTypeLabels[user.skinType] || user.skinType) : 'Belirtilmemiş'}</p>
                </div>
                <div className="info-item">
                  <label>Alerjiler</label>
                  <p>
                    {user.allergies && user.allergies.length > 0
                      ? user.allergies.join(', ')
                      : 'Belirtilmemiş'}
                  </p>
                </div>

                <div className="profile-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => setIsEditing(true)}
                  >
                    Düzenle
                  </button>
                  <button className="btn btn-danger" onClick={handleLogout}>
                    Çıkış Yap
                  </button>
                </div>
              </div>
            ) : (
              <form className="profile-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Ad Soyad</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">E-posta</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled
                    className="disabled-input"
                  />
                  <small>E-posta adresi değiştirilemez</small>
                </div>

                <div className="form-group">
                  <label htmlFor="skinType">Cilt Tipi</label>
                  <select
                    id="skinType"
                    name="skinType"
                    value={formData.skinType}
                    onChange={handleChange}
                  >
                    <option value="">Seçiniz</option>
                    {skinTypes.map((type) => (
                      <option key={type} value={type}>
                        {skinTypeLabels[type]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="allergies">Alerjiler</label>
                  <input
                    type="text"
                    id="allergies"
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleChange}
                    placeholder="Örn: Paraben, Sülfat, Parfüm (virgülle ayırın)"
                  />
                  <small>Birden fazla alerjiyi virgülle ayırın</small>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    Kaydet
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsEditing(false);
                      if (user) {
                        setFormData({
                          name: user.name,
                          email: user.email,
                          skinType: user.skinType || '',
                          allergies: user.allergies?.join(', ') || '',
                        });
                      }
                    }}
                  >
                    İptal
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="profile-stats">
            <div className="stat-card">
              <h3>Rutinlerim</h3>
              <Link to="/routine" className="stat-link">
                Rutinlerimi Görüntüle →
              </Link>
            </div>
            <div className="stat-card">
              <h3>Siparişlerim</h3>
              <Link to="/orders" className="stat-link">
                Siparişlerimi Görüntüle →
              </Link>
            </div>
            <div className="stat-card">
              <h3>Favorilerim</h3>
              <Link to="/favorites" className="stat-link">
                Favorilerimi Görüntüle →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

