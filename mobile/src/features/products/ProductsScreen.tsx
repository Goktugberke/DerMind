import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, StatusBar, LayoutAnimation, Platform, UIManager } from 'react-native';
import { PurchasedProductCard } from '@components/PurchasedProductCard';
import { theme } from '@constants/theme';
import { ListFilter, X, Check, SlidersHorizontal } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { PageHeader } from '@components/PageHeader';
import { SearchBar } from '@components/SearchBar';
import { FilterActions } from '@components/FilterActions';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const ProductsScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSortModalVisible, setSortModalVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState('newest');
  const navigation = useNavigation<any>();
  const [showFilterRow, setShowFilterRow] = useState(false);

  // Backend'den (GET /api/purchases/user/{userId}) gelecek örnek veri
  const dummyPurchases = [
    { id: '1', brand: 'La Roche Posay', name: 'Effaclar Gel', orderStatus: 'TESLİM EDİLDİ', price: '250', date: '2024-02-10' },
    { id: '2', brand: 'CeraVe', name: 'Moisturizing Cream', orderStatus: 'YOLDA', price: '320', date: '2024-02-15' },
    { id: '3', brand: 'Vichy', name: 'Mineral 89', orderStatus: 'TESLİM EDİLDİ', price: '450', date: '2024-01-20' },
    { id: '4', brand: 'La Roche Posay', name: 'Effaclar Gel', orderStatus: 'TESLİM EDİLDİ', price: '250', date: '2024-02-10' },
    { id: '5', brand: 'CeraVe', name: 'Moisturizing Cream', orderStatus: 'YOLDA', price: '320', date: '2024-02-15' },
    { id: '6', brand: 'Vichy', name: 'Mineral 89', orderStatus: 'TESLİM EDİLDİ', price: '450', date: '2024-01-20' },
  ];

  const sortOptions = [
    { id: 'newest', label: 'Date: Newest' },
    { id: 'oldest', label: 'Date: Oldest' },
    { id: 'az', label: 'Brand: A - Z' },
    { id: 'za', label: 'Brand: Z - A' },
    { id: 'priceLowHigh', label: 'Price: Low to High' },
    { id: 'priceHighLow', label: 'Price: High to Low' },
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
    let filtered = dummyPurchases.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 2. Sonra Sıralama
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
        title="My Products"
        fontSize={24}
        fontWeight="400"
        align="center"
      />

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
            showFilterRow && { backgroundColor: theme.colors.primary } // Açıkken rengi değişsin
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
            onFilter={() => console.log("Filtreleme açıldı")}
          />
        </View>
      )}

      {/* ÜRÜN LİSTESİ */}
      <FlatList
        data={processedData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PurchasedProductCard
            item={item}
            onRate={() => console.log("Yorum yap: POST /api/ratings")} //
            onStartStreak={() => {
              navigation.navigate('StartRoutine', { product: item });
            }}
          />
        )}
        contentContainerStyle={styles.listPadding}
        showsVerticalScrollIndicator={false}
      />

      {/* SIRALAMA MODAL'I */}
      <Modal
        visible={isSortModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.sortOption}
                onPress={() => {
                  setSelectedSort(option.id);
                  setSortModalVisible(false);
                }}
              >
                <Text style={[
                  styles.optionText,
                  selectedSort === option.id && { color: theme.colors.secondary, fontWeight: 'bold' }
                ]}>
                  {option.label}
                </Text>
                {selectedSort === option.id && <Check size={20} color={theme.colors.secondary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
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
  titleSection: {
    paddingHorizontal: 30,
    marginVertical: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '400',
    color: theme.colors.text,
    letterSpacing: -0.5
  },
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
  sortIconButton: {
    width: 50,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listPadding: {
    paddingTop: 15,
    paddingBottom: 100
  },
  // Modal Stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    width: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  optionText: { fontSize: 16, color: '#475569' }
});