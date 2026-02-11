import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCartItems } from '../store/slices/cartSlice';
import { 
  selectStreak,
  addTask,
} from '../store/slices/routineSlice';
import { streakApi } from '../types/api';
import { UsageFrequency, UsageTime } from '../types/api';
import type { StreakResponseDTO } from '../types/api';
import { Link } from 'react-router-dom';

const Routine = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const streak = useAppSelector(selectStreak);
  const cart = useAppSelector(selectCartItems);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [backendStreaks, setBackendStreaks] = useState<StreakResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [usageFrequency, setUsageFrequency] = useState<UsageFrequency>('DAILY');
  const [usageTime, setUsageTime] = useState<UsageTime>('MORNING');

  // Fetch streaks from backend
  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchStreaks = async () => {
        try {
          setLoading(true);
          const streaks = await streakApi.getMyStreaks();
          setBackendStreaks(streaks);
        } catch (err) {
          console.error('Error fetching streaks:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchStreaks();
    }
  }, [isAuthenticated, user]);

  // Sepetteki ürünlerden rutin oluştur
  const cartProducts = cart.map((item) => ({
    id: item.id,
    name: item.name,
  }));

  const handleAddTask = async () => {
    if (!selectedProduct) {
      alert('Lütfen ürün seçin');
      return;
    }

    const product = cart.find((item) => item.id === selectedProduct);
    if (product) {
      try {
        // Create streak in backend
        const productId = parseInt(product.id, 10);
        if (!isNaN(productId)) {
          await streakApi.createStreak({
            productId,
            usageFrequency,
            usageTime,
          });
          
          // Refresh streaks
          const streaks = await streakApi.getMyStreaks();
          setBackendStreaks(streaks);
        }

        // Also add to local state (for backward compatibility)
        dispatch(addTask({
          productId: product.id,
          productName: product.name,
          time: '09:00',
          days: [],
        }));
        
        setShowAddTask(false);
        setSelectedProduct('');
      } catch (err) {
        console.error('Error creating streak:', err);
        alert('Rutin oluşturulurken bir hata oluştu');
      }
    }
  };

  const handleRecordUsage = async (streakId: number) => {
    try {
      await streakApi.recordUsage(streakId);
      // Refresh streaks
      const streaks = await streakApi.getMyStreaks();
      setBackendStreaks(streaks);
    } catch (err) {
      console.error('Error recording usage:', err);
      alert('Kullanım kaydedilirken bir hata oluştu');
    }
  };

  const handleDeleteStreak = async (streakId: number) => {
    try {
      await streakApi.deleteStreak(streakId);
      // Refresh streaks
      const streaks = await streakApi.getMyStreaks();
      setBackendStreaks(streaks);
    } catch (err) {
      console.error('Error deleting streak:', err);
      alert('Rutin silinirken bir hata oluştu');
    }
  };


  if (!isAuthenticated) {
    return (
      <div className="routine-page">
        <div className="container">
          <div className="auth-required">
            <h2>Rutin Takibi İçin Giriş Yapın</h2>
            <p>Rutinlerinizi takip etmek için lütfen giriş yapın.</p>
            <Link to="/login" className="btn btn-primary">
              Giriş Yap
            </Link>
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
            <p className="routine-subtitle">
              Cilt bakım rutinlerinizi takip edin ve düzenli kullanım alışkanlığı kazanın
            </p>
          </div>
          <div className="streak-display">
            <div className="streak-icon">🔥</div>
            <div>
              <div className="streak-number">
                {backendStreaks.length > 0 
                  ? Math.max(...backendStreaks.map(s => s.currentStreak))
                  : streak}
              </div>
              <div className="streak-label">Günlük Seri</div>
            </div>
          </div>
        </div>

        {cartProducts.length === 0 ? (
          <div className="no-products-routine">
            <p>Rutin oluşturmak için önce ürünleri sepete ekleyin.</p>
            <Link to="/products" className="btn btn-primary">
              Ürünlere Git
            </Link>
          </div>
        ) : (
          <>
            <div className="routine-actions">
              <button
                className="btn btn-primary"
                onClick={() => setShowAddTask(!showAddTask)}
              >
                {showAddTask ? 'İptal' : '+ Yeni Rutin Ekle'}
              </button>
            </div>

            {showAddTask && (
              <div className="add-task-card">
                <h3>Yeni Rutin Ekle</h3>
                <div className="form-group">
                  <label>Ürün Seç</label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Ürün seçin</option>
                    {cartProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Kullanım Sıklığı</label>
                  <select
                    value={usageFrequency}
                    onChange={(e) => setUsageFrequency(e.target.value as UsageFrequency)}
                    className="form-select"
                  >
                    <option value="DAILY">Günde 1 Kez</option>
                    <option value="TWICE_DAILY">Günde 2 Kez</option>
                    <option value="WEEKLY">Haftada 1 Kez</option>
                    <option value="AS_NEEDED">İhtiyaca Göre</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Kullanım Zamanı</label>
                  <select
                    value={usageTime}
                    onChange={(e) => setUsageTime(e.target.value as UsageTime)}
                    className="form-select"
                  >
                    <option value="MORNING">Sabah</option>
                    <option value="EVENING">Akşam</option>
                    <option value="MORNING_AND_EVENING">Sabah ve Akşam</option>
                    <option value="ANYTIME">Herhangi Bir Zaman</option>
                  </select>
                </div>

                <button className="btn btn-primary" onClick={handleAddTask}>
                  Rutin Ekle
                </button>
              </div>
            )}

            <div className="routine-content">
              <div className="today-tasks">
                <h2>Aktif Serilerim</h2>
                {loading ? (
                  <div className="no-tasks">
                    <p>Yükleniyor...</p>
                  </div>
                ) : backendStreaks.filter(s => s.isActive).length === 0 ? (
                  <div className="no-tasks">
                    <p>Henüz aktif seri yok.</p>
                  </div>
                ) : (
                  <div className="tasks-list">
                    {backendStreaks
                      .filter(s => s.isActive)
                      .map((streak) => (
                        <div key={streak.id} className="task-card">
                          <div className="task-info">
                            <h3>{streak.productName || `Ürün #${streak.productId}`}</h3>
                            <p className="task-time">
                              🔥 Seri: {streak.currentStreak} gün
                            </p>
                            <p className="task-time">
                              📅 En Uzun: {streak.longestStreak} gün
                            </p>
                            <p className="task-time">
                              {streak.usageFrequency === 'DAILY' && 'Günde 1 Kez'}
                              {streak.usageFrequency === 'TWICE_DAILY' && 'Günde 2 Kez'}
                              {streak.usageFrequency === 'WEEKLY' && 'Haftada 1 Kez'}
                              {streak.usageFrequency === 'AS_NEEDED' && 'İhtiyaca Göre'}
                              {' - '}
                              {streak.usageTime === 'MORNING' && 'Sabah'}
                              {streak.usageTime === 'EVENING' && 'Akşam'}
                              {streak.usageTime === 'MORNING_AND_EVENING' && 'Sabah ve Akşam'}
                              {streak.usageTime === 'ANYTIME' && 'Herhangi Bir Zaman'}
                            </p>
                            {streak.lastUsedDate && (
                              <p className="task-time">
                                Son Kullanım: {new Date(streak.lastUsedDate).toLocaleDateString('tr-TR')}
                              </p>
                            )}
                          </div>
                          <div className="task-actions">
                            <button
                              className="btn btn-success"
                              onClick={() => handleRecordUsage(streak.id)}
                            >
                              Bugün Kullandım ✓
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteStreak(streak.id)}
                            >
                              Sil
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="all-tasks">
                <h2>Tüm Serilerim</h2>
                {loading ? (
                  <div className="no-tasks">
                    <p>Yükleniyor...</p>
                  </div>
                ) : backendStreaks.length === 0 ? (
                  <div className="no-tasks">
                    <p>Henüz seri eklenmemiş.</p>
                  </div>
                ) : (
                  <div className="tasks-list">
                    {backendStreaks.map((streak) => (
                      <div key={streak.id} className="task-card">
                        <div className="task-info">
                          <h3>{streak.productName || `Ürün #${streak.productId}`}</h3>
                          <p className="task-time">
                            🔥 Mevcut Seri: {streak.currentStreak} gün
                          </p>
                          <p className="task-time">
                            🏆 En Uzun Seri: {streak.longestStreak} gün
                          </p>
                          <p className="task-time">
                            📊 Toplam Kullanım: {streak.totalUses} kez
                          </p>
                          <p className="task-time">
                            {streak.usageFrequency === 'DAILY' && 'Günde 1 Kez'}
                            {streak.usageFrequency === 'TWICE_DAILY' && 'Günde 2 Kez'}
                            {streak.usageFrequency === 'WEEKLY' && 'Haftada 1 Kez'}
                            {streak.usageFrequency === 'AS_NEEDED' && 'İhtiyaca Göre'}
                            {' - '}
                            {streak.usageTime === 'MORNING' && 'Sabah'}
                            {streak.usageTime === 'EVENING' && 'Akşam'}
                            {streak.usageTime === 'MORNING_AND_EVENING' && 'Sabah ve Akşam'}
                            {streak.usageTime === 'ANYTIME' && 'Herhangi Bir Zaman'}
                          </p>
                          {streak.lastUsedDate && (
                            <p className="task-time">
                              Son Kullanım: {new Date(streak.lastUsedDate).toLocaleDateString('tr-TR')}
                            </p>
                          )}
                        </div>
                        <div className="task-actions">
                          {streak.isActive && (
                            <button
                              className="btn btn-success"
                              onClick={() => handleRecordUsage(streak.id)}
                            >
                              Bugün Kullandım ✓
                            </button>
                          )}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteStreak(streak.id)}
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Routine;