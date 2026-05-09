import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../types/api';
import type { ProductResponseDTO, RatingResponseDTO } from '../types/api';
import './AdminPanel.css';

const AdminPanel: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products');
  const [products, setProducts] = useState<ProductResponseDTO[]>([]);
  const [reviews, setReviews] = useState<RatingResponseDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      navigate('/');
    } else {
      fetchData();
    }
  }, [isAuthenticated, user, activeTab, navigate]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'products') {
        const data = await adminApi.getAllProductsAdmin();
        setProducts(data);
      } else {
        const data = await adminApi.getAllReviewsAdmin();
        setReviews(data);
      }
    } catch (err: any) {
      setError(err.message || 'Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string | number) => {
    if (window.confirm('Bu ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
      try {
        await adminApi.deleteProduct(id);
        setProducts(products.filter(p => String(p.id) !== String(id)));
      } catch (err: any) {
        alert('Ürün silinemedi: ' + (err.message || 'Bilinmeyen hata'));
      }
    }
  };

  const handleToggleHideProduct = async (id: string | number) => {
    console.log("[AdminPanel] Toggling hide for product:", id);
    try {
      const updatedProduct = await adminApi.toggleHideProduct(id);
      console.log("[AdminPanel] Hide toggle success:", updatedProduct);
      setProducts(products.map(p => 
        String(p.id) === String(id) ? updatedProduct : p
      ));
      alert(`Ürün durumu "${updatedProduct.hiddenStatus ? 'Gizli' : 'Görünür'}" olarak güncellendi.`);
    } catch (err: any) {
      console.error("[AdminPanel] Hide toggle error:", err);
      alert('Ürün durumu değiştirilemedi: ' + (err.message || 'Bilinmeyen hata'));
    }
  };

  const handleDeleteReview = async (id: string | number) => {
    if (window.confirm('Bu yorumu silmek istediğinize emin misiniz?')) {
      try {
        await adminApi.deleteReview(id);
        setReviews(reviews.filter(r => String(r.id) !== String(id)));
      } catch (err: any) {
        alert('Yorum silinemedi: ' + (err.message || 'Bilinmeyen hata'));
      }
    }
  };

  if (loading && products.length === 0 && reviews.length === 0) {
    return <div className="admin-loading">Yükleniyor...</div>;
  }

  return (
    <div className="admin-panel-container">
      <div className="admin-header">
        <h1>Admin Paneli</h1>
        <p>DerMind Ürün ve Yorum Yönetim Paneli</p>
      </div>

      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Ürün Yönetimi
        </button>
        <button 
          className={`admin-tab ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Yorum Yönetimi
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-content">
        {activeTab === 'products' && (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Marka</th>
                  <th>Ürün Adı</th>
                  <th>Kalite Puanı</th>
                  <th>Durum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id} className={product.hiddenStatus ? 'row-hidden' : ''}>
                    <td>{product.id}</td>
                    <td>{product.brand}</td>
                    <td>{product.name}</td>
                    <td>{product.qualityScore?.toFixed(2)}</td>
                    <td>
                      {product.hiddenStatus ? (
                        <span className="status-badge hidden">Gizli</span>
                      ) : (
                        <span className="status-badge visible">Görünür</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      <button 
                        className="btn-hide"
                        onClick={() => handleToggleHideProduct(product.id)}
                      >
                        {product.hiddenStatus ? 'Göster' : 'Gizle'}
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && !loading && (
                  <tr><td colSpan={6} className="empty-state">Hiç ürün bulunamadı.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Kullanıcı</th>
                  <th>Ürün ID</th>
                  <th>Puan</th>
                  <th>Yorum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map(review => (
                  <tr key={review.id}>
                    <td>{review.id}</td>
                    <td>{review.userName || review.userId}</td>
                    <td>{review.productId}</td>
                    <td>{review.rating} / 10</td>
                    <td className="review-text">{review.review || review.comment || '-'}</td>
                    <td className="actions-cell">
                      <button 
                        className="btn-delete"
                        onClick={() => handleDeleteReview(review.id)}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
                {reviews.length === 0 && !loading && (
                  <tr><td colSpan={6} className="empty-state">Hiç yorum bulunamadı.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
