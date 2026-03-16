import { useState, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { streakApi, productApi } from '../types/api';
import { UsageFrequency } from '../types/api';
import type { StreakResponseDTO, ProductResponseDTO } from '../types/api';
import { Link } from 'react-router-dom';
import { auth } from '../firebase'; // Import auth directly

// Helper for days
const DAYS = [
  { label: 'Pzt', value: 'MONDAY' },
  { label: 'Sal', value: 'TUESDAY' },
  { label: 'Çar', value: 'WEDNESDAY' },
  { label: 'Per', value: 'THURSDAY' },
  { label: 'Cum', value: 'FRIDAY' },
  { label: 'Cmt', value: 'SATURDAY' },
  { label: 'Paz', value: 'SUNDAY' },
];

const Routine = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  // State
  const [showAddTask, setShowAddTask] = useState(false);
  const [allProducts, setAllProducts] = useState<ProductResponseDTO[]>([]);
  const [backendStreaks, setBackendStreaks] = useState<StreakResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);

  // Form State
  const [selectedProduct, setSelectedProduct] = useState('');
  const [dailyFrequency, setDailyFrequency] = useState<1 | 2>(1); // 1 or 2 times daily
  const [customTimes, setCustomTimes] = useState<string[]>(['08:00']); // Default 1 time

  // Fetch streaks function - simplified to separate loading state
  const fetchStreaks = async (silent = false) => {
    // Only fetch if we have a current user in Firebase to avoid 401
    if (auth.currentUser) {
      try {
        if (!silent) setLoading(true);
        const streaks = await streakApi.getMyStreaks();
        setBackendStreaks(streaks);
      } catch (err) {
        console.error('Error fetching streaks:', err);
      } finally {
        if (!silent) setLoading(false);
      }
    }
  };

  // Auth listener for reliable fetching
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchStreaks();
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch all products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        const data = await productApi.getAllProducts();
        setAllProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Handlers
  const handleFrequencyChange = (freq: 1 | 2) => {
    setDailyFrequency(freq);
    // Adjust time inputs count
    if (freq === 1) {
      setCustomTimes([customTimes[0] || '08:00']);
    } else {
      setCustomTimes([customTimes[0] || '08:00', customTimes[1] || '20:00']);
    }
  };

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...customTimes];
    newTimes[index] = value;
    setCustomTimes(newTimes);
  };

  const handleAddTask = async () => {
    if (!selectedProduct) {
      alert('Lütfen bir ürün seçin');
      return;
    }

    // Map logic to DTO
    let finalFrequency: UsageFrequency = UsageFrequency.DAILY;
    if (dailyFrequency === 2) finalFrequency = UsageFrequency.TWICE_DAILY;

    try {
      await streakApi.createStreak({
        productId: parseInt(selectedProduct),
        usageFrequency: finalFrequency,
        customTimes: customTimes, // Send specific times (HH:mm)
      });

      // Reset form
      setShowAddTask(false);
      setSelectedProduct('');
      setDailyFrequency(1);
      setCustomTimes(['08:00']);

      // Refresh
      fetchStreaks();
    } catch (err) {
      console.error('Error creating routin:', err);
      alert('Rutin oluşturulurken bir hata oluştu.');
    }
  };

  const handleRecordUsage = async (streakId: number) => {
    try {
      await streakApi.recordUsage(streakId);
      // Silent refresh to avoid page flicker or scroll jump
      fetchStreaks(true);
    } catch (err) {
      console.error('Error recording usage:', err);
    }
  };

  const handleDeleteStreak = async (streakId: number) => {
    if (!confirm("Bu rutini silmek istediğinize emin misiniz?")) return;
    try {
      await streakApi.deleteStreak(streakId);
      fetchStreaks();
    } catch (err) {
      console.error('Error deleting streak:', err);
    }
  };

  // Helper to check if used today
  const isUsedToday = (streak: StreakResponseDTO) => {
    if (!streak.lastUsedDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return streak.lastUsedDate === today;
  };

  if (!isAuthenticated) {
    return (
      <div className="routine-page">
        <div className="container">
          <div className="auth-required">
            <h2>Rutin Takibi İçin Giriş Yapın</h2>
            <Link to="/login" className="btn btn-primary">Giriş Yap</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="routine-page">
      <div className="container">
        <div className="routine-header">
          <div>
            <h1>Rutin Takibi</h1>
            <p className="routine-subtitle">Düzenli cilt bakım alışkanlıkları edinin.</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddTask(!showAddTask)}
          >
            {showAddTask ? 'İptal' : '+ Yeni Rutin'}
          </button>
        </div>

        {showAddTask && (
          <div className="add-task-card">
            <h3>Yeni Rutin Oluştur</h3>

            {/* 1. Ürün Seçimi */}
            <div className="form-group">
              <label>Ürün Seç</label>
              <select
                className="form-select"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
              >
                <option value="">Bir ürün seçin...</option>
                {allProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} - ({p.brand})</option>
                ))}
              </select>
            </div>

            {/* 2. Sıklık Seçimi */}
            <div className="form-group">
              <label>Günde Kaç Kez?</label>
              <div className="frequency-tabs">
                <button
                  className={`freq-btn ${dailyFrequency === 1 ? 'active' : ''}`}
                  onClick={() => handleFrequencyChange(1)}
                >
                  Günde 1 Kez
                </button>
                <button
                  className={`freq-btn ${dailyFrequency === 2 ? 'active' : ''}`}
                  onClick={() => handleFrequencyChange(2)}
                >
                  Günde 2 Kez
                </button>
              </div>
            </div>

            {/* 3. Zaman Seçimi */}
            <div className="form-group">
              <label>Kullanım Saatleri</label>
              <div className="time-selector-list">
                {customTimes.map((time, index) => (
                  <div key={index} className="time-input-group">
                    <label>{index + 1}. Kullanım:</label>
                    <input
                      type="time"
                      className="form-control"
                      value={time}
                      onChange={(e) => handleTimeChange(index, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <button className="btn btn-success full-width" onClick={handleAddTask}>
              Rutin Ekle
            </button>
          </div>
        )}

        <div className="routine-list">
          {loading ? <p>Yükleniyor...</p> : backendStreaks.length === 0 ? (
            <div className="empty-state">
              <p>Henüz bir rutin eklemediniz.</p>
            </div>
          ) : (
            backendStreaks.map(streak => {
              const used = isUsedToday(streak);
              return (
                <div key={streak.id} className="task-card">
                  <div className="task-header">
                    <h3>{streak.productName || 'Ürün'}</h3>
                    {streak.isActive ? (
                      <span className="badge success">Aktif</span>
                    ) : <span className="badge">Pasif</span>}
                  </div>

                  <div className="task-details">
                    <div className="streak-stats">
                      <div className="stat">
                        <span className="value">🔥 {streak.currentStreak}</span>
                        <span className="label">Gün Seri</span>
                      </div>
                      <div className="stat">
                        <span className="value">🏆 {streak.longestStreak}</span>
                        <span className="label">Rekor</span>
                      </div>
                    </div>

                    <div className="schedule-info">
                      <p>
                        <strong>Sıklık:</strong> {
                          streak.usageFrequency === 'TWICE_DAILY' ? 'Günde 2 Kez' : 'Günde 1 Kez'
                        }
                      </p>
                      {streak.customTimes && streak.customTimes.length > 0 && (
                        <p><strong>Saatler:</strong> {streak.customTimes.join(', ')}</p>
                      )}
                    </div>
                  </div>

                  <div className="task-actions" style={{ display: 'flex', gap: '10px' }}>
                    {/* Usage Button 1 */}
                    <button
                      className={`btn ${used ? 'btn-secondary' : 'btn-outline-success'}`}
                      onClick={() => !used && handleRecordUsage(streak.id)}
                      disabled={used}
                      style={{ flex: 1 }}
                    >
                      {streak.dailyUsageCounter && streak.dailyUsageCounter >= 1 ? (streak.customTimes && streak.customTimes[0] ? `${streak.customTimes[0]} - Kullanıldı` : '1 kez kullanıldı') : (streak.customTimes && streak.customTimes[0] ? `${streak.customTimes[0]} - Kullan` : '1 kez kullan')}
                    </button>

                    {/* Usage Button 2 (Only for TWICE_DAILY) */}
                    {streak.usageFrequency === 'TWICE_DAILY' && (
                      <button
                        className={`btn ${streak.dailyUsageCounter && streak.dailyUsageCounter >= 2 ? 'btn-secondary' : 'btn-outline-success'}`}
                        onClick={() => !((streak.dailyUsageCounter || 0) >= 2) && handleRecordUsage(streak.id)}
                        disabled={(streak.dailyUsageCounter || 0) >= 2}
                        style={{ flex: 1 }}
                      >
                        {streak.dailyUsageCounter && streak.dailyUsageCounter >= 2 ? (streak.customTimes && streak.customTimes[1] ? `${streak.customTimes[1]} - Kullanıldı` : '2 kez kullanıldı') : (streak.customTimes && streak.customTimes[1] ? `${streak.customTimes[1]} - Kullan` : '2 kez kullan')}
                      </button>
                    )}
                  </div>
                  {/* Separate Delete Button */}
                  <div style={{ marginTop: '10px', textAlign: 'right' }}>
                    <button
                      className="btn btn-text-danger"
                      onClick={() => handleDeleteStreak(streak.id)}
                    >
                      Sil
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        .frequency-tabs, .count-selector, .day-selector {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }
        .freq-btn, .count-btn, .day-btn {
          padding: 8px 16px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 20px;
          cursor: pointer;
        }
        .freq-btn.active, .count-btn.active, .day-btn.active {
          background: #0d6efd;
          color: white;
          border-color: #0d6efd;
        }
        [data-theme='dark'] .freq-btn,
        [data-theme='dark'] .count-btn,
        [data-theme='dark'] .day-btn {
          color: #1f2937;
        }
        [data-theme='dark'] .form-select,
        [data-theme='dark'] .form-control {
          background-color: #ffffff;
          color: #1f2937;
        }
        .time-selector {
          display: flex;
          gap: 15px;
        }
        .time-checkbox {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
        }
        .time-checkbox.active {
          border-color: #0d6efd;
          background-color: #e7f1ff;
        }
        .full-width { width: 100%; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.8em; background: #eee; }
        .badge.success { background: #d1e7dd; color: #0f5132; }
        .streak-stats { display: flex; gap: 20px; margin: 15px 0; }
        .stat { display: flex; flex-direction: column; align-items: center; }
        .stat .value { font-size: 1.2em; font-weight: bold; }
        .stat .label { font-size: 0.8em; color: #666; }
        .btn-text-danger { background: none; border: none; color: #dc3545; cursor: pointer; }
        .btn-outline-success { 
          background: white; border: 1px solid #198754; color: #198754; padding: 8px 16px; border-radius: 6px; cursor: pointer;
        }
        .btn-outline-success:hover { background: #198754; color: white; }
        .btn-secondary {
            background-color: #6c757d;
            border-color: #6c757d;
            color: white;
            cursor: not-allowed;
            padding: 8px 16px; 
            border-radius: 6px; 
        }
      `}</style>
    </div>
  );
};

export default Routine;