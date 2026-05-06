import { useState, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { streakApi, productApi } from '../types/api';
import { UsageFrequency } from '../types/api';
import type { StreakResponseDTO, ProductResponseDTO } from '../types/api';
import { Link } from 'react-router-dom';
import { auth } from '../firebase'; // Import auth directly

// Helper for days removed as it was unused

const Routine = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  // State
  const [showAddTask, setShowAddTask] = useState(false);
  const [allProducts, setAllProducts] = useState<ProductResponseDTO[]>([]);
  const [backendStreaks, setBackendStreaks] = useState<StreakResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [selectedProduct, setSelectedProduct] = useState('');
  const [dailyFrequency, setDailyFrequency] = useState<1 | 2>(1); // 1 or 2 times daily
  const [customTimes, setCustomTimes] = useState<string[]>(['08:00']); // Default 1 time
  const [editingStreakId, setEditingStreakId] = useState<number | null>(null);

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
        const data = await productApi.getAllProducts(0, 500); // Fetch a large batch for selection
        setAllProducts(data.content);
      } catch (err) {
        console.error('Error fetching products:', err);
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

  const handleEditClick = (streak: StreakResponseDTO) => {
    setEditingStreakId(streak.id);
    setSelectedProduct(streak.productId.toString());
    setDailyFrequency(streak.usageFrequency === 'TWICE_DAILY' ? 2 : 1);
    setCustomTimes(streak.customTimes && streak.customTimes.length > 0 ? streak.customTimes : (streak.usageFrequency === 'TWICE_DAILY' ? ['08:00', '20:00'] : ['08:00']));
    setShowAddTask(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddTask = async () => {
    if (!selectedProduct) {
      alert('Lütfen bir ürün seçin');
      return;
    }

    let finalFrequency: UsageFrequency = UsageFrequency.DAILY;
    if (dailyFrequency === 2) finalFrequency = UsageFrequency.TWICE_DAILY;

    try {
      if (editingStreakId) {
        // Update existing
        await streakApi.updateStreak(editingStreakId, {
          usageFrequency: finalFrequency,
          customTimes: customTimes,
        });
      } else {
        // Create new
        await streakApi.createStreak({
          productId: parseInt(selectedProduct),
          usageFrequency: finalFrequency,
          customTimes: customTimes,
        });
      }

      // Reset form
      setShowAddTask(false);
      setEditingStreakId(null);
      setSelectedProduct('');
      setDailyFrequency(1);
      setCustomTimes(['08:00']);

      // Refresh
      fetchStreaks();
    } catch (err) {
      console.error('Error saving routine:', err);
      alert('Rutin kaydedilirken bir hata oluştu.');
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

  // Helper to check if used today (using local date to match backend)
  const isUsedToday = (streak: StreakResponseDTO) => {
    if (!streak.lastUsedDate) return false;
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format in local time
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
            <h3>{editingStreakId ? 'Rutin Düzenle' : 'Yeni Rutin Oluştur'}</h3>

            {/* 1. Ürün Seçimi */}
            <div className="form-group">
              <label>Ürün Seç</label>
              <select
                className="form-select"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                disabled={!!editingStreakId}
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
              {editingStreakId ? 'Güncelle' : 'Rutin Ekle'}
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
              const usedOnce = (streak.dailyUsageCounter || 0) >= 1;
              const usedTwice = (streak.dailyUsageCounter || 0) >= 2;
              
              return (
                <div key={streak.id} className="task-card">
                  <div className="task-card-header">
                    <div className="product-info-mini">
                      <span className="product-brand-tag">{streak.productBrand || 'Marka'}</span>
                      <h3 className="product-name-heading">{streak.productName || 'Ürün İsmi'}</h3>
                    </div>
                    <div className="status-badge-container">
                      {streak.isActive ? (
                        <span className="status-badge active">Aktif</span>
                      ) : (
                        <span className="status-badge inactive">Pasif</span>
                      )}
                    </div>
                  </div>

                  <div className="task-card-body">
                    <div className="routine-stats-grid">
                      <div className="routine-stat-item current">
                        <span className="stat-icon">🔥</span>
                        <div className="stat-text">
                          <span className="stat-value">{streak.currentStreak}</span>
                          <span className="stat-label">Gün Seri</span>
                        </div>
                      </div>
                      <div className="routine-stat-item record">
                        <span className="stat-icon">🏆</span>
                        <div className="stat-text">
                          <span className="stat-value">{streak.longestStreak}</span>
                          <span className="stat-label">Rekor</span>
                        </div>
                      </div>
                    </div>

                    <div className="routine-schedule-section">
                      <div className="schedule-item">
                        <span className="schedule-icon">📅</span>
                        <span className="schedule-text">
                          <strong>Sıklık:</strong> {streak.usageFrequency === 'TWICE_DAILY' ? 'Günde 2 Kez' : 'Günde 1 Kez'}
                        </span>
                      </div>
                      {streak.customTimes && streak.customTimes.length > 0 && (
                        <div className="schedule-item">
                          <span className="schedule-icon">⏰</span>
                          <span className="schedule-text">
                            <strong>Saatler:</strong> {streak.customTimes.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="task-card-actions">
                    <button
                      className={`usage-action-btn ${usedOnce ? 'completed' : 'pending'}`}
                      onClick={() => !usedOnce && handleRecordUsage(streak.id)}
                      disabled={usedOnce}
                    >
                      <span className="btn-time-label">
                        {streak.customTimes?.[0] || '1. Kullanım'}
                      </span>
                      <span className="btn-status-label">
                        {usedOnce ? '✓ Kullanıldı' : 'Kullan'}
                      </span>
                    </button>

                    {streak.usageFrequency === 'TWICE_DAILY' && (
                      <button
                        className={`usage-action-btn ${usedTwice ? 'completed' : 'pending'}`}
                        onClick={() => !usedTwice && handleRecordUsage(streak.id)}
                        disabled={usedTwice}
                      >
                        <span className="btn-time-label">
                          {streak.customTimes?.[1] || '2. Kullanım'}
                        </span>
                        <span className="btn-status-label">
                          {usedTwice ? '✓ Kullanıldı' : 'Kullan'}
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="task-card-footer">
                    <button className="edit-link" onClick={() => handleEditClick(streak)}>
                      📝 Düzenle
                    </button>
                    <button className="delete-link" onClick={() => handleDeleteStreak(streak.id)}>
                      🗑️ Sil
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        .frequency-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        .freq-btn {
          padding: 10px 20px;
          border: 2px solid var(--border-color);
          background: var(--bg-color);
          border-radius: 50px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        .freq-btn.active {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }
        
        /* Task Card Styles */
        .routine-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }

        .task-card {
          background: var(--bg-color);
          border-radius: 16px;
          padding: 20px;
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .task-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }

        .task-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .product-info-mini {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .product-brand-tag {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--primary-color);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .product-name-heading {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-color);
          margin: 0;
          line-height: 1.4;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.active {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge.inactive {
          background: #f3f4f6;
          color: #4b5563;
        }

        .task-card-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .routine-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .routine-stat-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          background: var(--bg-light);
        }

        .routine-stat-item.current { border-left: 4px solid #f59e0b; }
        .routine-stat-item.record { border-left: 4px solid #6366f1; }

        .stat-icon { font-size: 1.5rem; }
        
        .stat-text {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-color);
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-light);
        }

        .routine-schedule-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 12px;
          font-size: 0.9rem;
        }
        
        [data-theme='dark'] .routine-schedule-section {
          background: #374151;
        }

        .schedule-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-color);
        }

        .task-card-actions {
          display: flex;
          gap: 12px;
          margin-top: auto;
        }

        .usage-action-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px;
          border-radius: 12px;
          border: 2px solid;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .usage-action-btn.pending {
          background: white;
          border-color: var(--primary-color);
          color: var(--primary-color);
        }

        .usage-action-btn.pending:hover {
          background: var(--primary-color);
          color: white;
        }

        .usage-action-btn.completed {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #64748b;
          cursor: not-allowed;
        }
        
        [data-theme='dark'] .usage-action-btn.completed {
           background: #1f2937;
           border-color: #374151;
           color: #9ca3af;
        }

        .btn-time-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          opacity: 0.8;
        }

        .btn-status-label {
          font-size: 0.95rem;
          font-weight: 600;
        }

        .task-card-footer {
          display: flex;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px solid var(--border-color);
        }

        .edit-link, .delete-link {
          background: none;
          border: none;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .edit-link { color: var(--primary-color); }
        .edit-link:hover { background: #eef2ff; }
        
        .delete-link { color: #ef4444; }
        .delete-link:hover { background: #fef2f2; }

        .full-width { width: 100%; }
        
        @media (max-width: 640px) {
          .routine-list { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default Routine;