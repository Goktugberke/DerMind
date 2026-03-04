import React, { useState, useMemo } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Modal, 
  StatusBar,
  Image,
  Dimensions
} from 'react-native';
import { SearchBar } from '@components/SearchBar';
import { theme } from '@constants/theme';
import { ListFilter, X, Check, Heart, ShoppingCart, Ghost } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 50) / 2; // Yanlardaki boşlukları düşüp 2'ye bölüyoruz

export const FavoritesScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSortModalVisible, setSortModalVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState('newest');

  // Dummy Favori Verisi
  const [favorites, setFavorites] = useState([
    { id: '1', brand: 'Nivea', name: 'Sun Cream', price: '24.95', image: 'https://via.placeholder.com/150' },
    { id: '2', brand: 'Bioderma', name: 'Sebium Foaming Gel', price: '55.10', image: 'https://via.placeholder.com/150' },
    { id: '3', brand: 'La Roche', name: 'Effaclar Duo', price: '32.50', image: 'https://via.placeholder.com/150' },
    { id: '4', brand: 'Cerave', name: 'Hydrating Cleanser', price: '64.00', image: 'https://via.placeholder.com/150' },
  ]);

  const sortOptions = [
    { id: 'newest', label: 'Date: Newest' },
    { id: 'priceLowHigh', label: 'Price: Low to High' },
    { id: 'priceHighLow', label: 'Price: High to Low' },
  ];

  // API Bağlantısı İçin Not: Favoriden çıkarma
  const handleRemoveFavorite = (id: string) => {
    // API: DELETE /api/favorites/{productId}
    setFavorites(prev => prev.filter(item => item.id !== id));
  };

  // API Bağlantısı İçin Not: Sepete ekleme
  const handleAddToCart = (item: any) => {
    // API: POST /api/cart/add { productId: item.id }
    console.log(`${item.name} sepete eklendi`);
  };

  // Arama filtresi (Frontend tarafında basit filtreleme)
  const filteredData = useMemo(() => {
    return favorites.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, favorites]);

  // --- ÜRÜN KARTI BİLEŞENİ ---
  const FavoriteCard = ({ item }: any) => (
    <View style={styles.card}>
      <TouchableOpacity style={styles.heartButton} onPress={() => handleRemoveFavorite(item.id)}>
        <Heart size={20} color="#FF4D4D" fill="#FF4D4D" />
      </TouchableOpacity>
      
      <Image source={{ uri: item.image }} style={styles.productImage} />
      
      <View style={styles.cardDetails}>
        <Text style={styles.brandText}>{item.brand}</Text>
        <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.priceText}>{item.price} TL</Text>
      </View>

      <TouchableOpacity style={styles.addToCartBtn} onPress={() => handleAddToCart(item)}>
        <ShoppingCart size={18} color="white" />
        <Text style={styles.addToCartText}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. HEADER (Diğer sayfalarla birebir aynı) */}
      <View style={styles.headerContainer}>
        <View style={styles.titleSection}>
          <Text style={styles.headerTitle}>Favorites</Text>
        </View>
      </View>

      {/* 2. SEARCH & SORT */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrapper}>
          <SearchBar 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
            placeholder="Search in favorites..."
          />
        </View>
        <TouchableOpacity 
          style={styles.sortIconButton}
          onPress={() => setSortModalVisible(true)}
        >
          <ListFilter size={24} color={theme.colors.gray} />
        </TouchableOpacity>
      </View>

      {/* 3. LİSTE VEYA BOŞ DURUM */}
      {favorites.length > 0 ? (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FavoriteCard item={item} />}
          numColumns={2} // İKİLİ GRID YAPISI
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listPadding}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ghost size={80} color={theme.colors.gray} strokeWidth={1} />
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySubtitle}>Tap the heart icon on products to see them here.</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.shopBtnText}>Explore Products</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 4. SORT MODAL (ProductsScreen'deki ile aynı) */}
      <Modal visible={isSortModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            {sortOptions.map((option) => (
              <TouchableOpacity 
                key={option.id} 
                style={styles.sortOption}
                onPress={() => { setSelectedSort(option.id); setSortModalVisible(false); }}
              >
                <Text style={[styles.optionText, selectedSort === option.id && { color: theme.colors.primary, fontWeight: 'bold' }]}>
                  {option.label}
                </Text>
                {selectedSort === option.id && <Check size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.deepbackground },
  // Header Stilleri
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, zIndex: 10,
  },
  titleSection: { paddingHorizontal: 30, marginVertical: 5 },
  headerTitle: { fontSize: 24, fontWeight: '400', color: theme.colors.text },
  
  // Search & Sort Row
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 15 },
  searchWrapper: { flex: 1, marginRight: 6 },
  sortIconButton: {
    width: 50, height: 50, backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center',
  },

  // Grid Stilleri
  listPadding: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between' },
  card: {
    backgroundColor: 'white',
    width: COLUMN_WIDTH,
    borderRadius: 20,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
    // Shadow
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
  },
  heartButton: { alignSelf: 'flex-end', padding: 4 },
  productImage: { width: COLUMN_WIDTH * 0.7, height: 100, resizeMode: 'contain', marginVertical: 10 },
  cardDetails: { width: '100%', marginBottom: 10 },
  brandText: { fontSize: 11, fontWeight: 'bold', color: theme.colors.gray, textTransform: 'uppercase' },
  nameText: { fontSize: 13, color: theme.colors.text, marginVertical: 2 },
  priceText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.primary },
  
  addToCartBtn: {
    flexDirection: 'row', backgroundColor: theme.colors.primary, 
    width: '100%', paddingVertical: 10, borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center'
  },
  addToCartText: { color: 'white', fontWeight: 'bold', fontSize: 13, marginLeft: 6 },

  // Modal (Common Styles)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 25, width: '85%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  sortOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  optionText: { fontSize: 16, color: '#475569' },

  // Empty State
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text, marginTop: 20 },
  emptySubtitle: { fontSize: 14, color: theme.colors.gray, textAlign: 'center', marginTop: 10, marginBottom: 30 },
  shopBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 25, paddingVertical: 15, borderRadius: 15 },
  shopBtnText: { color: 'white', fontWeight: 'bold' }
});