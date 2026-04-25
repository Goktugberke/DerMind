import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { PageHeader } from '@components/PageHeader';
import { SearchBar } from '@components/SearchBar';
import { FilterActions } from '@components/FilterActions';
import { SortModal } from '@components/SortModal';
import { ProductCard } from '@components/ProductCard';
import { theme } from '@constants/theme';
import { authService, productService, useGetCurrentUser } from '@services/api';
import { getAuth } from '@react-native-firebase/auth';

const HEADER_SCROLL_DISTANCE = 110;

export const HomeScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userName, setUserName] = useState('Kullanıcı');
  const [products, setProducts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSortModalVisible, setSortModalVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState('newest');

  const headerAnimValue = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const insets = useSafeAreaInsets();
  
  // Get current user from DB - with error handling for new registrations
  const { data: currentUser, error: userError, isLoading: userLoading } = useGetCurrentUser();

  const sortOptions = [
    { id: 'priceLowHigh', label: 'Price: Low to High' },
    { id: 'priceHighLow', label: 'Price: High to Low' },
  ];

  const loadProducts = async (pageNumber: number, currentQuery: string) => {
    if (isLoading || (!hasMore && pageNumber !== 0)) return;
    setIsLoading(true);
    try {
      const fetchCall = currentQuery.trim().length > 0
        ? productService.searchProducts(currentQuery, pageNumber, 15)
        : productService.getAllProducts(pageNumber, 15);

      const prodRes = await fetchCall.catch(() => null);
      if (!prodRes) {
        setIsLoading(false);
        return;
      }
      const productsList = prodRes?.data?.content || (Array.isArray(prodRes?.data) ? prodRes.data : []);
      const totalPages = prodRes?.data?.totalPages || 1;

      if (productsList.length > 0) {
        const apiProducts = productsList.map((p: any) => ({
          id: p.id ? p.id.toString() : Math.random().toString(),
          brand: p.brand != null ? p.brand : 'null',
          name: p.name != null ? p.name : 'null',
          category: p.category || '', // Bunu ekle
          secondaryCategory: p.secondaryCategory || '',
          volume: p.volume != null ? p.volume : 'null',
          generalScore: p.qualityScore != null ? p.qualityScore.toString() : 'null',
          aiScore: p.baseScore != null ? p.baseScore.toString() : 'null',
          price: p.price != null ? p.price.toString() : 'null',
          image: p.image || null
        }));

        if (pageNumber === 0) {
          setProducts(apiProducts);
        } else {
          setProducts(prev => [...prev, ...apiProducts]);
        }

        if (pageNumber + 1 >= totalPages) {
          setHasMore(false);
        }
      } else {
        if (pageNumber === 0) setProducts([]);
        setHasMore(false);
      }
    } catch (error) {
      console.log('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.name) {
      // Backend'den gelen isim
      setUserName(currentUser.name.split(' ')[0]);
    } else if (userError) {
      // Backend başarısız — Firebase displayName'i kullan
      const firebaseUser = getAuth().currentUser;
      if (firebaseUser?.displayName) {
        setUserName(firebaseUser.displayName.split(' ')[0]);
      } else if (firebaseUser?.email) {
        // DisplayName yoksa email'den @ öncesini al
        setUserName(firebaseUser.email.split('@')[0]);
      }
      console.warn('Could not load user profile - using Firebase name. Error:', userError);
    }
  }, [currentUser, userError]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(0);
      setHasMore(true);
      loadProducts(0, searchQuery);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // const onScroll = useAnimatedScrollHandler((event) => {
  //   scrollY.value = event.contentOffset.y;
  // });

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event, ctx: any) => {
      const y = event.contentOffset.y;
      const diff = y - ((ctx.prevY as number) || 0); // Parmak ne kadar hareket etti?

      scrollY.value = y;

      // Aşağı veya yukarı kaydırma farkını (diff) mevcut değere ekle.
      // 0 ile HEADER_SCROLL_DISTANCE arasında sınırla, ancak listenin y pozisyonunu aşmasına da izin verme (min(y)).
      const nextHeaderVal = headerAnimValue.value + diff;
      headerAnimValue.value = Math.max(0, Math.min(nextHeaderVal, y, HEADER_SCROLL_DISTANCE));

      ctx.prevY = y;
    },
  });

  // 1. Search Bar Küçülme Animasyonu
  const animatedSearchStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(headerAnimValue.value, [0, 60], [1, 0.92], 'clamp')
        },
        {
          translateY: interpolate(headerAnimValue.value, [0, 60], [0, 20], 'clamp')
        }
      ],
    };
  });

  // 2. Filtre Satırı Yok Olma Animasyonu
  const animatedFilterStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(headerAnimValue.value, [0, 40], [1, 0], 'clamp'),
      height: interpolate(headerAnimValue.value, [0, 60], [50, 20], 'clamp'),
      transform: [
        {
          translateY: interpolate(headerAnimValue.value, [0, 60], [0, -10], 'clamp')
        }
      ],
    };
  });


  // Welcome yazısının yok olma animasyonu
  const animatedWelcomeStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, 40], [1, 0], 'clamp'),
      height: interpolate(scrollY.value, [0, 50], [30, 0], 'clamp'),
      marginBottom: interpolate(scrollY.value, [0, 50], [0, 0], 'clamp'),
    };
  });

  return (
    <SafeAreaView style={styles.container}>

      <View style={[styles.floatingHeaderGroup, { paddingTop: insets.top }]}>
        <View style={styles.fixedHeaderContainer}>
          <PageHeader title="DerMind" color={theme.colors.primary} fontSize={32} fontWeight="700" align="center" />
        </View>
        <Animated.View style={[styles.stickyWrapper]}>
          <Animated.View style={[animatedWelcomeStyle, { overflow: 'hidden' }]}>
            <Text style={styles.welcomeText}>
              {userName ? `Welcome ${userName}` : 'Welcome Guest'}
            </Text>
          </Animated.View>
          <Animated.View style={[styles.searchRow, animatedSearchStyle]}>
            <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
          </Animated.View>

          <Animated.View style={[animatedFilterStyle, { overflow: 'hidden' }]}>
            <FilterActions
              onSort={() => setSortModalVisible(true)}
              onFilter={() => console.log("Filtreleme açıldı")}
            />
          </Animated.View>
        </Animated.View>
      </View>

      <Animated.FlatList
        onScroll={onScroll}
        scrollEventThrottle={16}
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProductCard item={item} onPress={() => navigation.navigate('ProductDetail', {
          product: {
            id: item.id,
            brand: item.brand,
            name: item.name,
            category: item.category,
            secondaryCategory: item.secondaryCategory,
            image: item.image,
            price: item.price,
            rating: parseFloat(item.generalScore) || 0,
          }
        })} />}
        contentContainerStyle={[styles.listPadding, { paddingTop: insets.top + HEADER_SCROLL_DISTANCE + 115 }]}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (!isLoading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadProducts(nextPage, searchQuery);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoading ? <ActivityIndicator size="small" color={theme.colors.primary} style={{ margin: 20 }} /> : null}
      />

      <SortModal
        visible={isSortModalVisible}
        onClose={() => setSortModalVisible(false)}
        options={sortOptions}
        selectedOption={selectedSort}
        onSelect={(id) => setSelectedSort(id)}
        theme={theme}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.deepbackground,
  },
  floatingHeaderGroup: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  fixedHeaderContainer: {
    backgroundColor: '#ffffff',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    elevation: 5,
  },
  stickyWrapper: {
    zIndex: 10,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 10,
    elevation: 5,
    overflow: 'visible',

  },
  welcomeText: {
    fontSize: 20,
    fontStyle: 'italic',
    color: theme.colors.text,
    paddingHorizontal: 20,
    paddingTop: 5,
  },
  searchRow: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 5,
  },
  listPadding: {
    paddingBottom: 30,
  },
});