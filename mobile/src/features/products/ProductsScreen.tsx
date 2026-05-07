import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, StatusBar, LayoutAnimation, Platform, UIManager, ActivityIndicator } from 'react-native';
import { PurchasedProductCard } from '@components/PurchasedProductCard';
import { theme } from '@constants/theme';
import { SlidersHorizontal, Edit3, Eye } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { PageHeader } from '@components/PageHeader';
import { SearchBar } from '@components/SearchBar';
import { FilterActions } from '@components/FilterActions';
import { SortModal } from '@components/SortModal';
import { FilterModal } from '@components/FilterModal';
import { getAuth } from '@react-native-firebase/auth';
import { purchaseService, useMyStreaks, useMyReviews } from '@services/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const ProductsScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSortModalVisible, setSortModalVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState('newest');
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const navigation = useNavigation<any>();
  const [showFilterRow, setShowFilterRow] = useState(false);

  const [purchases, setPurchases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: myStreaks } = useMyStreaks();
  const { data: myReviews } = useMyReviews();

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        setIsLoading(true);
        const user = getAuth().currentUser;
        if (user) {
          const res = await purchaseService.getPurchasesByUser(user.uid);
          if (res.data && Array.isArray(res.data)) {
            const productMap = new Map();

            res.data.forEach((p: any) => {
              // Ürünü unique yapan ID (productId yoksa p.id'yi fallback kullanırız)
              const pid = p.productId || p.id;
              if (!productMap.has(pid)) {
                productMap.set(pid, {
                  id: pid.toString(),
                  brand: p.productBrand != null ? p.productBrand : 'null',
                  name: p.productName != null ? p.productName : 'null',
                  orderStatus: p.orderStatus != null ? p.orderStatus : 'null',
                  price: p.totalPrice != null ? p.totalPrice.toString() : 'null',
                  date: p.purchasedAt != null ? p.purchasedAt : 'null',
                  image: p.image || p.imageUrl || p.productImageUrl || p.product?.imageUrl || p.product?.image || null
                });
              }
            });

            setPurchases(Array.from(productMap.values()));
          } else {
            setPurchases([]);
          }
        }
      } catch (err) {
        console.error('Error fetching purchases:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurchases();
  }, []);

  const sortOptions = [
    { id: 'newest', label: 'Date: Newest' },
    { id: 'oldest', label: 'Date: Oldest' },
    { id: 'az', label: 'Brand: A - Z' },
    { id: 'za', label: 'Brand: Z - A' },
    { id: 'priceLowHigh', label: 'Price: Low to High' },
    { id: 'priceHighLow', label: 'Price: High to Low' },
  ];

  const filterOptions = [
    { id: 'all', label: 'All Products' },
    { id: 'routine', label: 'In Active Routine' },
    { id: 'rated', label: 'Rated by Me' },
    { id: 'unrated', label: 'Not Rated Yet' },
  ];

  const toggleFilter = () => {
    LayoutAnimation.configureNext({
      duration: 500, // milisaniye cinsinden hız
      create: { type: 'linear', property: 'opacity' },
      update: { type: 'spring', springDamping: 0.7 }, // Hafif bir yaylanma efekti
      delete: { type: 'linear', property: 'opacity' }
    });
    setShowFilterRow(!showFilterRow);
  };

  const getProcessedData = () => {
    // 1. Önce Arama Filtresi
    let filtered = purchases.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 2. Filtreleme
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(item => {
        const hasStreak = myStreaks?.some((s: any) => String(s.productId) === String(item.id) || String(s.product_id) === String(item.id));
        const hasReview = myReviews?.some((r: any) => String(r.productId) === String(item.id) || String(r.product_id) === String(item.id));

        switch (selectedFilter) {
          case 'routine': return hasStreak;
          case 'rated': return hasReview;
          case 'unrated': return !hasReview;
          default: return true;
        }
      });
    }

    // 3. Sonra Sıralama
    return filtered.sort((a, b) => {
      switch (selectedSort) {
        case 'newest':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'oldest':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'az':
          return a.brand.localeCompare(b.brand);
        case 'za':
          return b.brand.localeCompare(a.brand);
        case 'priceLowHigh':
          return Number(a.price) - Number(b.price);
        case 'priceHighLow':
          return Number(b.price) - Number(a.price);
        default:
          return 0;
      }
    });
  };

  const processedData = getProcessedData();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER BLOGU */}
      <PageHeader
        title="Products"
        fontSize={24}
        fontWeight="400"
        align="center"
      />
      <View style={styles.listHeader}>
        <Text style={styles.title}>Your Products</Text>
        <Text style={styles.subtitle}>Track your skincare journey</Text>
      </View>

      {/* ARAMA VE SIRALAMA */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrapper}>
          <SearchBar
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Bu buton senin row'u açıp kapatacak */}
        <TouchableOpacity
          style={[
            styles.toggleButton,
            showFilterRow && { backgroundColor: theme.colors.primary }
          ]}
          onPress={toggleFilter}
        >
          <SlidersHorizontal
            size={24}
            color={showFilterRow ? '#FFFFFF' : theme.colors.gray}
          />
        </TouchableOpacity>
      </View>

      {/* SENİN BİLEŞENİN: Sadece showFilterRow true ise görünür */}
      {showFilterRow && (
        <View style={styles.filterRowWrapper}>
          <FilterActions
            onSort={() => setSortModalVisible(true)}
            onFilter={() => setFilterModalVisible(true)}
          />
        </View>
      )}

      {/* ÜRÜN LİSTESİ */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={processedData}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptySubtitle}>You don't have any products down here yet.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const activeStreak = myStreaks?.find((s: any) => String(s.productId) === String(item.id) || String(s.product_id) === String(item.id));
            const activeReview = myReviews?.find((r: any) => String(r.productId) === String(item.id) || String(r.product_id) === String(item.id));
            return (
              <PurchasedProductCard
                item={item}
                primaryAction={
                  activeReview
                    ? {
                      label: 'Edit Rate',
                      icon: <Edit3 size={18} color={theme.colors.primary} />,
                      onPress: () => navigation.navigate('EditReview', {
                        product: {
                          ...activeReview,
                          name: item.name,
                          brand: item.brand,
                          image: item.image
                        }
                      })
                    }
                    : undefined
                }
                onRate={
                  !activeReview
                    ? () => {
                      navigation.navigate('RateScreen', { product: item });
                    }
                    : undefined
                }
                secondaryAction={
                  activeStreak
                    ? {
                      label: 'Your Routine',
                      icon: <Eye size={18} color={theme.colors.primary} />,
                      onPress: () => navigation.navigate('RoutineDetail', { streak: activeStreak })
                    }
                    : undefined
                }
                onStartStreak={
                  !activeStreak
                    ? () => {
                      navigation.navigate('StartRoutine', { product: item });
                    }
                    : undefined
                }
              />
            );
          }}
          contentContainerStyle={styles.listPadding}
          showsVerticalScrollIndicator={false}
        />
      )}

      <SortModal
        visible={isSortModalVisible}
        onClose={() => setSortModalVisible(false)}
        options={sortOptions}
        selectedOption={selectedSort}
        onSelect={(id) => setSelectedSort(id)}
        theme={theme}
      />

      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        options={filterOptions}
        selectedOption={selectedFilter}
        onSelect={(id) => setSelectedFilter(id)}
        theme={theme}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.deepbackground
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    zIndex: 10,
  },
  headerControls: {
    paddingHorizontal: 20, // Kenarlardan boşluk
    marginTop: 15,
    gap: 10, // Arama çubuğu ve butonlar arasına dikey boşluk koyar
  },
  listHeader: { marginTop: 20, alignItems: 'flex-start', paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 15,
  },
  searchWrapper: {
    flex: 1,
    marginRight: 6,
  },
  toggleButton: {
    width: 50,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    // Hafif gölge
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  filterRowWrapper: {
    marginTop: 10,
    // Senin FilterActions zaten paddingHorizontal: 15 içerdiği için 
    // buraya ekstra padding gerekmez, ama istersen animasyon ekleyebilirsin.
  },
  listPadding: {
    paddingTop: 15,
    paddingBottom: 100
  },
  optionText: { fontSize: 16, color: '#475569' },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.gray,
    textAlign: 'center',
  }
});