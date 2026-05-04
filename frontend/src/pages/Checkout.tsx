import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearCart, selectCartItems, selectTotalPrice } from '../store/slices/cartSlice';
import { purchaseApi, type PurchaseCreateDTO } from '../types/api';

const Checkout = () => {
  const dispatch = useAppDispatch();
  const cart = useAppSelector(selectCartItems);
  const totalPrice = useAppSelector(selectTotalPrice);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Backend expects individual purchase items. We will create a purchase for each item in the cart.
      const addressString = `${formData.address}, ${formData.city}, ${formData.postalCode}`;
      
      for (const item of cart) {
        const purchaseData: PurchaseCreateDTO = {
          productId: Number(item.id),
          quantity: item.quantity,
          unitPrice: item.price || 0,
          paymentMethod: 'CREDIT_CARD', // Defaulting since we only accept card info on UI
          shippingAddress: addressString,
          notes: ''
        };
        await purchaseApi.createPurchase(purchaseData);
      }

      alert('Siparişiniz alındı! E-posta ile bilgilendirme yapılmıştır.');
      dispatch(clearCart());
      navigate('/orders'); // Siparişlerim sayfasına yönlendir
    } catch (error) {
      console.error("Sipariş oluşturulurken hata:", error);
      alert('Sipariş oluşturulurken bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="checkout-page">
        <div className="container">
          <h1>Ödeme</h1>
          <p>Sepetiniz boş. Lütfen önce ürün ekleyin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <h1>Ödeme</h1>
        <div className="checkout-content">
          <form className="checkout-form" onSubmit={handleSubmit}>
            <section className="form-section">
              <h2>İletişim Bilgileri</h2>
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
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Telefon</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </section>

            <section className="form-section">
              <h2>Adres Bilgileri</h2>
              <div className="form-group">
                <label htmlFor="address">Adres</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">Şehir</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="postalCode">Posta Kodu</label>
                  <input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </section>

            <section className="form-section">
              <h2>Ödeme Bilgileri</h2>
              <div className="form-group">
                <label htmlFor="cardNumber">Kart Numarası</label>
                <input
                  type="text"
                  id="cardNumber"
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleChange}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="cardName">Kart Üzerindeki İsim</label>
                <input
                  type="text"
                  id="cardName"
                  name="cardName"
                  value={formData.cardName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expiryDate">Son Kullanma Tarihi</label>
                  <input
                    type="text"
                    id="expiryDate"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleChange}
                    placeholder="MM/YY"
                    maxLength={5}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cvv">CVV</label>
                  <input
                    type="text"
                    id="cvv"
                    name="cvv"
                    value={formData.cvv}
                    onChange={handleChange}
                    placeholder="123"
                    maxLength={3}
                    required
                  />
                </div>
              </div>
            </section>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'İşleniyor...' : `Siparişi Tamamla (${totalPrice.toFixed(2)} ₺)`}
            </button>
          </form>

          <div className="checkout-summary">
            <div className="summary-card">
              <h2>Sipariş Özeti</h2>
              <div className="order-items">
                {cart.map((item) => (
                  <div key={item.id} className="order-item">
                    <span>{item.name} x {item.quantity}</span>
                    <span>{(item.price * item.quantity).toFixed(2)} ₺</span>
                  </div>
                ))}
              </div>
              <div className="summary-row summary-total">
                <span>Toplam:</span>
                <span>{totalPrice.toFixed(2)} ₺</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

