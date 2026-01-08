import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { removeFromCart, updateQuantity, clearCart, selectCartItems, selectTotalPrice } from '../store/slices/cartSlice';

const Cart = () => {
  const dispatch = useAppDispatch();
  const cart = useAppSelector(selectCartItems);
  const totalPrice = useAppSelector(selectTotalPrice);

  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <h1>Sepetim</h1>
          <div className="empty-cart">
            <p>Sepetiniz boş</p>
            <Link to="/products" className="btn btn-primary">
              Alışverişe Başla
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <div className="cart-header">
          <h1>Sepetim</h1>
          <button className="btn btn-secondary" onClick={() => dispatch(clearCart())}>
            Sepeti Temizle
          </button>
        </div>

        <div className="cart-content">
          <div className="cart-items">
            {cart.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-image">
                  {item.image ? (
                    <img src={item.image} alt={item.name} />
                  ) : (
                    <div className="product-placeholder">📦</div>
                  )}
                </div>
                <div className="cart-item-info">
                  <h3>{item.name}</h3>
                  {item.description && <p>{item.description}</p>}
                  <div className="cart-item-price">
                    {(item.price * item.quantity).toFixed(2)} ₺
                  </div>
                </div>
                <div className="cart-item-controls">
                  <div className="quantity-controls">
                    <button
                      onClick={() => dispatch(updateQuantity({ productId: item.id, quantity: item.quantity - 1 }))}
                      className="quantity-btn"
                    >
                      -
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button
                      onClick={() => dispatch(updateQuantity({ productId: item.id, quantity: item.quantity + 1 }))}
                      className="quantity-btn"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => dispatch(removeFromCart(item.id))}
                    className="btn btn-danger btn-sm"
                  >
                    Kaldır
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="summary-card">
              <h2>Sipariş Özeti</h2>
              <div className="summary-row">
                <span>Ara Toplam:</span>
                <span>{totalPrice.toFixed(2)} ₺</span>
              </div>
              <div className="summary-row">
                <span>Kargo:</span>
                <span>Ücretsiz</span>
              </div>
              <div className="summary-row summary-total">
                <span>Toplam:</span>
                <span>{totalPrice.toFixed(2)} ₺</span>
              </div>
              <Link to="/checkout" className="btn btn-primary btn-block">
                Satın Al
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;

