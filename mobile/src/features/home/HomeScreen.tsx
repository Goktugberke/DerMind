import React from 'react';
import { SafeAreaView, ScrollView, Text, StyleSheet, View, TouchableOpacity, FlatList } from 'react-native';
import { SearchBar } from '@components/SearchBar';
import { ProductCard } from '@components/ProductCard';
import { CategoryItem } from '@components/CategoryItem';
import { theme } from '@constants/theme';
import { authService } from '@services/api';

const categories = [
  { id: '1', name: 'Sun Protection' },
  { id: '2', name: 'Face Cleansing' },
  { id: '3', name: 'Moisturizer' },
  { id: '4', name: 'Mask' },
  { id: '5', name: 'Peeling' },
  { id: '6', name: 'Tonic' },
];

const initialProducts = [
  { id: '1', brand: 'Nivea', name: 'Sun Cream', volume: 40, generalScore: '7.3', aiScore: '8.5', price: '24.95' },
  { id: '2', brand: 'Bioderma', name: 'Sun Cream', volume: 50, generalScore: '9.1', aiScore: '8.9', price: '55.10' },
  { id: '3', brand: 'La Roche', name: 'Moisturizer', volume: 75, generalScore: '8.2', aiScore: '9.0', price: '32.50' },
  { id: '4', brand: 'Vichy', name: 'Tonic', volume: 200, generalScore: '7.8', aiScore: '8.4', price: '41.00' },
  { id: '5', brand: 'Garnier', name: 'Face Wash', volume: 150, generalScore: '7.0', aiScore: '7.9', price: '18.90' },
  { id: '6', brand: 'Cerave', name: 'Cleanser', volume: 236, generalScore: '9.3', aiScore: '9.5', price: '64.00' },
];

export const HomeScreen = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [userName, setUserName] = React.useState('Ayşe');
  const [products, setProducts] = React.useState(initialProducts);

  // const [userName, setUserName] = React.useState('');
  // const [loadingUser, setLoadingUser] = React.useState(true);

  // React.useEffect(() => {
  //   const fetchUser = async () => {
  //     try {
  //       const response = await authService.getCurrentUser();
  //       setUserName(response.data.name); // backend field neyse onu yaz
  //     } catch (error) {
  //       console.log('User fetch error:', error);
  //     } finally {
  //       setLoadingUser(false);
  //     }
  //   };

  //   fetchUser();
  // }, []);

  const renderHeader = () => (
    <>
      <SearchBar value={searchQuery} />

      <Text style={styles.welcomeText}>
        {userName ? `Welcome ${userName}` : 'Welcome Guest'}
      </Text>

      <View style={styles.categoryGrid}>
        {categories.map((cat) => (
          <CategoryItem
            key={cat.id}
            name={cat.name}
            onPress={() => console.log(`${cat.name} seçildi`)}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>
        For You
      </Text>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard item={item} />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.deepbackground,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'regular',
    paddingHorizontal: 20,
    marginTop: 15,
    color: theme.colors.text,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 10,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '400',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
    color: theme.colors.text,
  },
  productList: {
    paddingBottom: 20,
  },
});
