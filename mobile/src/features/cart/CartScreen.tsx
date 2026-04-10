import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Image,
  TextInput,
  StatusBar,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {
  ShoppingBag, Trash2, Plus, Minus, ChevronUp, ChevronDown,
  Ticket, X, MapPin, ChevronRight
} from 'lucide-react-native';
import { theme } from '@constants/theme';
import { CustomButton } from '@components/CustomButton'; // İŞTE BURADA!

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const dummyAddresses = [
  { id: '1', title: 'Evim', address: 'Atatürk Mah. Sedef Cad. No:12 D:5 Ataşehir/İstanbul' },
  { id: '2', title: 'İş Yerim', address: 'Levent Plaza K:10 Beşiktaş/İstanbul' }
];

export const CartScreen = ({ navigation }: any) => {
  const [cartItems, setCartItems] = useState([
    { id: '1', name: 'Effaclar Gel', brand: 'La Roche Posay', price: 250.00, quantity: 1, image: 'https://via.placeholder.com/100' },
    { id: '2', name: 'Moisturizing Cream', brand: 'CeraVe', price: 320.00, quantity: 1, image: 'https://via.placeholder.com/100' },
  ]);

  const [selectedAddress, setSelectedAddress] = useState(dummyAddresses[0]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Ödeme yükleniyor durumu için

  // --- HESAPLAMALAR ---
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 500 ? 0 : 29.99;
  const discount = appliedCoupon ? 50 : 0;
  const total = subtotal + shipping - discount;

  const toggleSummary = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSummaryExpanded(!isSummaryExpanded);
  };

  // --- ACTIONS ---
  const handleUpdateQuantity = (id: string, type: 'inc' | 'dec') => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = type === 'inc' ? item.quantity + 1 : item.quantity - 1;
        return { ...item, quantity: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleApplyCoupon = () => {
    if (couponCode.trim().toUpperCase() === 'HELLO50') {
      setAppliedCoupon('HELLO50');
      setCouponCode('');
    }
  };

  const handleCheckout = () => {
    navigation.navigate('Checkout', {
      subtotal: subtotal,
      shipping: shipping,
      total: total,
      items: cartItems,
      appliedCoupon: appliedCoupon, // "HELLO50" gibi kupon ismi
      discount: discount            // 50.00 gibi sayısal değer
    });
  };

  // --- BİLEŞENLER ---
  const AddressSection = () => (
    <View style={styles.addressContainer}>
      <View style={styles.addressHeader}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <TouchableOpacity onPress={() => console.log("Adres Değiştir")}>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.addressCard} activeOpacity={0.7}>
        <View style={styles.addressIconWrapper}>
          <MapPin size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.addressInfo}>
          <Text style={styles.addressTitle}>{selectedAddress.title}</Text>
          <Text style={styles.addressDetail} numberOfLines={1}>{selectedAddress.address}</Text>
        </View>
        <ChevronRight size={20} color={theme.colors.gray} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.headerContainer}>
        <View style={styles.titleSection}>
          <Text style={styles.headerTitle}>My Cart</Text>
        </View>
      </View>

      {cartItems.length > 0 ? (
        <>
          <FlatList
            data={cartItems}
            keyExtractor={item => item.id}
            ListHeaderComponent={<AddressSection />}
            renderItem={({ item }) => (
              <View style={styles.cartCard}>
                <Image source={{ uri: item.image }} style={styles.productImage} />
                <View style={styles.detailsContainer}>
                  <Text style={styles.brandText}>{item.brand}</Text>
                  <Text style={styles.nameText}>{item.name}</Text>
                  <Text style={styles.priceText}>{item.price} TL</Text>
                </View>
                <View style={styles.quantityControl}>
                  <TouchableOpacity onPress={() => handleUpdateQuantity(item.id, 'dec')} style={styles.qtyBtn}>
                    <Minus size={14} color={theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => handleUpdateQuantity(item.id, 'inc')} style={styles.qtyBtn}>
                    <Plus size={14} color={theme.colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRemoveItem(item.id)} style={styles.deleteBtn}>
                    <Trash2 size={18} color="#FF4D4D" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={styles.listPadding}
            ListFooterComponent={
              <View style={styles.couponSection}>
                <Text style={styles.sectionTitle}>Promo Code</Text>
                <View style={styles.couponInputWrapper}>
                  <Ticket size={20} color={theme.colors.gray} style={{ marginLeft: 10 }} />
                  <TextInput
                    style={styles.couponInput}
                    placeholder="Enter code"
                    value={couponCode}
                    onChangeText={setCouponCode}
                  />
                  <TouchableOpacity onPress={handleApplyCoupon} style={styles.couponApplyBtn}>
                    <Text style={styles.couponApplyText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            }
          />

          {/* GENİŞLEYEN FOOTER */}
          <View style={[styles.summaryFooter, isSummaryExpanded && styles.summaryExpanded]}>
            <TouchableOpacity onPress={toggleSummary} activeOpacity={0.9} style={styles.summaryHeader}>
              <View style={styles.totalSummaryRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.totalValue}>{total.toFixed(2)} TL</Text>
                  {isSummaryExpanded ? <ChevronDown size={20} color={theme.colors.text} /> : <ChevronUp size={20} color={theme.colors.text} />}
                </View>
              </View>
            </TouchableOpacity>

            {isSummaryExpanded && (
              <View style={styles.expandedContent}>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Subtotal</Text><Text style={styles.detailValue}>{subtotal.toFixed(2)} TL</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Shipping</Text><Text style={styles.detailValue}>{shipping === 0 ? 'Free' : `${shipping} TL`}</Text></View>
                {appliedCoupon && (
                  <View style={styles.detailRow}><Text style={[styles.detailLabel, { color: '#22C55E' }]}>Discount</Text><Text style={[styles.detailValue, { color: '#22C55E' }]}>-50.00 TL</Text></View>
                )}
                <View style={styles.divider} />

                {/* CUSTOM BUTTON KULLANIMI 1: ÖDEME BUTONU */}
                <CustomButton
                  title="Confirm and Pay"
                  onPress={handleCheckout}
                  isLoading={isProcessing}
                />
              </View>
            )}
          </View>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <ShoppingBag size={80} color={theme.colors.gray} strokeWidth={1} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>

          {/* CUSTOM BUTTON KULLANIMI 2: BOŞ SEPET BUTONU */}
          <CustomButton
            title="Alışverişe Başla"
            onPress={() => navigation.navigate('Home')}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.deepbackground },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, zIndex: 10,
  },
  titleSection: { paddingHorizontal: 30, marginVertical: 5 },
  headerTitle: { fontSize: 24, fontWeight: '400', color: theme.colors.text, letterSpacing: -0.5 },
  addressContainer: { marginBottom: 25 },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  changeText: { color: theme.colors.primary, fontSize: 14, fontWeight: '600' },
  addressCard: {
    flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#F1F5F9', elevation: 2,
  },
  addressIconWrapper: {
    width: 40, height: 40, backgroundColor: '#F0F9FF', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12
  },
  addressInfo: { flex: 1 },
  addressTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  addressDetail: { fontSize: 13, color: theme.colors.gray, marginTop: 2 },
  listPadding: { padding: 20, paddingBottom: 150 },
  cartCard: {
    flexDirection: 'row', backgroundColor: 'white', borderRadius: 15, padding: 12, marginBottom: 15, alignItems: 'center', elevation: 2,
  },
  productImage: { width: 60, height: 60, borderRadius: 10, backgroundColor: theme.colors.deepbackground },
  detailsContainer: { flex: 1, marginLeft: 12 },
  brandText: { fontSize: 11, color: theme.colors.gray, fontWeight: 'bold' },
  nameText: { fontSize: 13, color: theme.colors.text },
  priceText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.primary, marginTop: 2 },
  quantityControl: { alignItems: 'center', flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 5 },
  qtyBtn: { padding: 4 },
  qtyText: { marginHorizontal: 8, fontWeight: 'bold', fontSize: 14 },
  deleteBtn: { marginLeft: 10 },
  couponSection: { marginTop: 10 },
  couponInputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: theme.colors.primary,
  },
  couponInput: { flex: 1, padding: 12 },
  couponApplyBtn: { paddingRight: 15 },
  couponApplyText: { color: theme.colors.primary, fontWeight: 'bold' },
  summaryFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25,
    padding: 20, elevation: 20, shadowColor: '#000', shadowOpacity: 0.1,
  },
  summaryHeader: { paddingVertical: 5 },
  totalSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, color: theme.colors.gray },
  totalValue: { fontSize: 18, fontWeight: 'bold', marginRight: 10 },
  expandedContent: { marginTop: 15 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  detailLabel: { color: theme.colors.gray, fontSize: 14 },
  detailValue: { fontWeight: '500', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  summaryExpanded: {},
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginTop: 15, marginBottom: 20 },
});