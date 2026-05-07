import React, { useState, useMemo, useEffect } from 'react';
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
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { PageHeader } from '@components/PageHeader';
import { SearchBar } from '@components/SearchBar';
import { theme } from '@constants/theme';
import { X, Check, Heart, ShoppingCart, Ghost, SlidersHorizontal } from 'lucide-react-native';
import { favoriteService, cartService } from '@services/api';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 50) / 2; // Yanlardaki boşlukları düşüp 2'ye bölüyoruz

export const FavoritesScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSortModalVisible, setSortModalVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState('newest');

  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const res = await favoriteService.getFavorites();
      if (res.data) {
        const mapped = res.data.map((fav: any) => ({
          date: fav.createdAt, // to match sorting
          id: fav.product?.id?.toString(), // use string id for keyExtractor and navigation
          brand: fav.product?.brand || 'Unknown',
          name: fav.product?.name || 'Product',
          price: fav.product?.price || '0',
          image: fav.product?.image || fav.product?.imageUrl || fav.product?.productImageUrl || fav.image || null
        }));
        setFavorites(mapped);
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const focusListener = navigation.addListener('focus', () => {
      loadFavorites();
    });
    return focusListener;
  }, [navigation]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const sortOptions = [
    { id: 'newest', label: 'Date: Newest' },
    { id: 'priceLowHigh', label: 'Price: Low to High' },
    { id: 'priceHighLow', label: 'Price: High to Low' },
  ];

  const handleRemoveFavorite = async (id: string) => {
    try {
      setFavorites(prev => prev.filter(item => item.id !== id));
      await favoriteService.removeFavorite(id);
    } catch (err) {
      console.error(err);
      loadFavorites();
    }
  };

  const [addingIds, setAddingIds] = useState<string[]>([]);

  const handleAddToCart = async (item: any) => {
    if (addingIds.includes(item.id)) return;
    setAddingIds(prev => [...prev, item.id]);
    try {
      await cartService.addItem(item.id, 1);
    } catch (err) {
      console.error(err);
    } finally {
      setAddingIds(prev => prev.filter(id => id !== item.id));
    }
  };

  // Arama ve Sıralama filtresi
  const filteredData = useMemo(() => {
    let result = [...favorites].filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sorting logic
    if (selectedSort === 'newest') {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (selectedSort === 'priceLowHigh') {
      result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (selectedSort === 'priceHighLow') {
      result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    }

    return result;
  }, [searchQuery, favorites, selectedSort]);

  // --- ÜRÜN KARTI BİLEŞENİ ---
  const FavoriteCard = ({ item }: any) => {
    const isAdding = addingIds.includes(item.id);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ProductDetail', { product: item })}
      >
        <TouchableOpacity style={styles.heartButton} onPress={() => handleRemoveFavorite(item.id)}>
          <Heart size={20} color="#FF4D4D" fill="#FF4D4D" />
        </TouchableOpacity>

        {item.image && item.image !== 'null' ? (
          <Image source={{ uri: item.image }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, { backgroundColor: '#f0f0f0' }]} />
        )}

        <View style={styles.cardDetails}>
          <Text style={styles.brandText}>{item.brand}</Text>
          <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.priceText}>{item.price} TL</Text>
        </View>

        <TouchableOpacity
          style={[styles.addToCartBtn, isAdding && { backgroundColor: '#34C759' }]}
          onPress={() => handleAddToCart(item)}
        >
          {isAdding ? <Check size={18} color="white" /> : <ShoppingCart size={18} color="white" />}
          <Text style={styles.addToCartText}>{isAdding ? 'Added' : 'Add'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 1. HEADER (Diğer sayfalarla birebir aynı) */}
      <PageHeader
        title="Favorites"
        fontSize={24}
        fontWeight="400"
        align="center"
      />

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
          <SlidersHorizontal size={24} color={theme.colors.gray} />
        </TouchableOpacity>
      </View>

      {/* 3. LİSTE VEYA BOŞ DURUM */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : favorites.length > 0 ? (
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