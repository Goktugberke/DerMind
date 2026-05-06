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
          const data = await purchaseApi.getPurchasesByUserId();
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

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'PROCESSING': return 'status-processing';
      case 'SHIPPED': return 'status-shipped';
      case 'DELIVERED': return 'status-delivered';
      case 'CANCELLED': return 'status-cancelled';
      default: return '';
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
    <div className="orders-page container">
      <h1>Siparişlerim</h1>
      
      {error && <div className="error-message">{error}</div>}

      {orders.length === 0 && !error ? (
        <div className="empty-state">
          <p>Henüz bir siparişiniz bulunmuyor.</p>
          <Link to="/products" className="btn btn-primary">Alışverişe Başla</Link>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-card-header">
                <div className="order-meta">
                  <div className="meta-item">
                    <span className="meta-label">Sipariş Tarihi</span>
                    <span className="meta-value">{new Date(order.purchasedAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Toplam Tutar</span>
                    <span className="meta-value">${order.totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Sipariş No</span>
                    <span className="meta-value">#{order.id}</span>
                  </div>
                </div>
                <div className="status-container">
                  <span className={`order-status-badge ${getStatusClass(order.orderStatus)}`}>
                    {translateStatus(order.orderStatus)}
                  </span>
                </div>
              </div>
              
              <div className="order-card-body">
                <div className="order-product-info">
                  <div className="product-detail-main">
                    <Link to={`/products/${order.productId}`} className="order-product-name">
                      {order.productName}
                    </Link>
                    <div className="order-product-brand">{order.productBrand}</div>
                    <div className="order-quantity-info">
                      Adet: <strong>{order.quantity}</strong> | Birim Fiyat: <strong>${order.unitPrice.toFixed(2)}</strong>
                    </div>
                  </div>
                  
                  {order.trackingNumber && (
                    <div className="tracking-info-box">
                      <div className="tracking-label">Kargo Takip No</div>
                      <div className="tracking-number">{order.trackingNumber}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
