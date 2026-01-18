import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCartItems } from '../store/slices/cartSlice';
import { 
  selectTasks, 
  selectStreak, 
  selectTodayTasks,
  addTask,
  removeTask,
  completeTask,
} from '../store/slices/routineSlice';
import { Link } from 'react-router-dom';

const Routine = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const tasks = useAppSelector(selectTasks);
  const streak = useAppSelector(selectStreak);
  const todayTasks = useAppSelector(selectTodayTasks);
  const cart = useAppSelector(selectCartItems);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [taskTime, setTaskTime] = useState('09:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  // Redux Persist otomatik olarak localStorage'a kaydediyor

  // Sepetteki ürünlerden rutin oluştur
  const cartProducts = cart.map((item) => ({
    id: item.id,
    name: item.name,
  }));

  const handleAddTask = () => {
    if (!selectedProduct || selectedDays.length === 0) {
      alert('Lütfen ürün ve günleri seçin');
      return;
    }

    const product = cart.find((item) => item.id === selectedProduct);
    if (product) {
      dispatch(addTask({
        productId: product.id,
        productName: product.name,
        time: taskTime,
        days: selectedDays,
      }));
      setShowAddTask(false);
      setSelectedProduct('');
      setSelectedDays([]);
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
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
              <div className="streak-number">{streak}</div>
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
                  <label>Saat</label>
                  <input
                    type="time"
                    value={taskTime}
                    onChange={(e) => setTaskTime(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Günler</label>
                  <div className="days-selector">
                    {dayNames.map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`day-button ${
                          selectedDays.includes(index) ? 'active' : ''
                        }`}
                        onClick={() => toggleDay(index)}
                      >
                        {day.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="btn btn-primary" onClick={handleAddTask}>
                  Rutin Ekle
                </button>
              </div>
            )}

            <div className="routine-content">
              <div className="today-tasks">
                <h2>Bugünkü Görevler</h2>
                {todayTasks.length === 0 ? (
                  <div className="no-tasks">
                    <p>Bugün için görev yok! 🎉</p>
                  </div>
                ) : (
                  <div className="tasks-list">
                    {todayTasks.map((task) => (
                      <div key={task.id} className="task-card">
                        <div className="task-info">
                          <h3>{task.productName}</h3>
                          <p className="task-time">⏰ {task.time}</p>
                        </div>
                        <button
                          className="btn btn-success"
                          onClick={() => dispatch(completeTask(task.id))}
                        >
                          Tamamla ✓
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="all-tasks">
                <h2>Tüm Rutinler</h2>
                {tasks.length === 0 ? (
                  <div className="no-tasks">
                    <p>Henüz rutin eklenmemiş.</p>
                  </div>
                ) : (
                  <div className="tasks-list">
                    {tasks.map((task) => {
                      const taskDays = task.days
                        .map((d) => dayNames[d].substring(0, 3))
                        .join(', ');
                      return (
                        <div key={task.id} className="task-card">
                          <div className="task-info">
                            <h3>{task.productName}</h3>
                            <p className="task-time">⏰ {task.time}</p>
                            <p className="task-days">📅 {taskDays}</p>
                            {task.completed && (
                              <span className="task-completed">
                                ✓ {task.completedDate}
                              </span>
                            )}
                          </div>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => dispatch(removeTask(task.id))}
                          >
                            Sil
                          </button>
                        </div>
                      );
                    })}
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

