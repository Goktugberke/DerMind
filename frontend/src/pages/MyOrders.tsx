import { useEffect, useState } from 'react';
import { purchaseApi, type PurchaseResponseDTO } from '../types/api';
import { useAppSelector } from '../store/hooks';
import { Link, Navigate } from 'react-router-dom';

const MyOrders = () => {
  const [orders, setOrders] = useState<PurchaseResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const fetchOrders = async () => {
        try {
          const data = await purchaseApi.getPurchasesByUserId(user.id);
          // Sort by purchase date descending
          const sorted = data.sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
          setOrders(sorted);
        } catch (err) {
          console.error("Siparişler yüklenirken hata oluştu:", err);
          setError("Siparişler yüklenirken bir hata oluştu.");
        } finally {
          setLoading(false);
        }
      };
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated && !loading) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px 0', textAlign: 'center' }}>
        <div className="loading-spinner">Yükleniyor...</div>
      </div>
    );
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING': return 'badge-warning';
      case 'PROCESSING': return 'badge-info';
      case 'SHIPPED': return 'badge-primary';
      case 'DELIVERED': return 'badge-success';
      case 'CANCELLED': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Beklemede';
      case 'PROCESSING': return 'İşleniyor';
      case 'SHIPPED': return 'Kargoya Verildi';
      case 'DELIVERED': return 'Teslim Edildi';
      case 'CANCELLED': return 'İptal Edildi';
      default: return status;
    }
  };

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <h1 style={{ marginBottom: '30px', color: '#1f2937' }}>Siparişlerim</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}

      {orders.length === 0 && !error ? (
        <div style={{ textAlign: 'center', padding: '50px 0', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <p style={{ fontSize: '1.2em', color: '#6b7280', marginBottom: '20px' }}>Henüz bir siparişiniz bulunmuyor.</p>
          <Link to="/products" className="btn btn-primary">Alışverişe Başla</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {orders.map((order) => (
            <div key={order.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '15px', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ color: '#6b7280', fontSize: '0.9em' }}>Sipariş Tarihi</div>
                  <div style={{ fontWeight: '500' }}>{new Date(order.purchasedAt).toLocaleDateString('tr-TR')}</div>
                </div>
                <div>
                  <div style={{ color: '#6b7280', fontSize: '0.9em' }}>Toplam Tutar</div>
                  <div style={{ fontWeight: '500' }}>{order.totalPrice.toFixed(2)} ₺</div>
                </div>
                <div>
                  <div style={{ color: '#6b7280', fontSize: '0.9em' }}>Sipariş No</div>
                  <div style={{ fontWeight: '500' }}>#{order.id}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className={`badge ${getStatusBadgeClass(order.orderStatus)}`} style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.85em', fontWeight: 'bold' }}>
                    {translateStatus(order.orderStatus)}
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1em' }}>
                    <Link to={`/products/${order.productId}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                      {order.productName}
                    </Link>
                  </h3>
                  <div style={{ color: '#6b7280', fontSize: '0.9em', marginBottom: '5px' }}>{order.productBrand}</div>
                  <div style={{ fontSize: '0.95em' }}>Adet: {order.quantity} | Birim Fiyat: {order.unitPrice.toFixed(2)} ₺</div>
                </div>
                
                {order.trackingNumber && (
                  <div style={{ backgroundColor: '#f3f4f6', padding: '10px 15px', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85em', color: '#4b5563', marginBottom: '4px' }}>Kargo Takip No</div>
                    <div style={{ fontWeight: 'bold', letterSpacing: '1px' }}>{order.trackingNumber}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
