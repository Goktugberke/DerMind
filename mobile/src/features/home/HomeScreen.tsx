import React from 'react';
import { Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { PageHeader } from '@components/PageHeader';
import { SearchBar } from '@components/SearchBar';
import { FilterActions } from '@components/FilterActions';
import { ProductCard } from '@components/ProductCard';
import { theme } from '@constants/theme';

const initialProducts = [
  { id: '1', brand: 'Nivea', name: 'Sun Cream', volume: 40, generalScore: '7.3', aiScore: '8.5', price: '24.95' },
  { id: '2', brand: 'Bioderma', name: 'Sun Cream', volume: 50, generalScore: '9.1', aiScore: '8.9', price: '55.10' },
  { id: '3', brand: 'La Roche', name: 'Moisturizer', volume: 75, generalScore: '8.2', aiScore: '2.0', price: '32.50' },
  { id: '4', brand: 'Vichy', name: 'Tonic', volume: 200, generalScore: '3.8', aiScore: '7.4', price: '41.00' },
  { id: '5', brand: 'Garnier', name: 'Face Wash', volume: 150, generalScore: '7.0', aiScore: '7.9', price: '18.90' },
  { id: '6', brand: 'Cerave', name: 'Cleanser', volume: 236, generalScore: '9.3', aiScore: '9.5', price: '64.00' },
  { id: '7', brand: 'Nivea', name: 'Sun Cream', volume: 40, generalScore: '4.3', aiScore: '8.5', price: '24.95' },
  { id: '8', brand: 'Bioderma', name: 'Sun Cream', volume: 50, generalScore: '9.1', aiScore: '8.9', price: '55.10' },
  { id: '9', brand: 'La Roche', name: 'Moisturizer', volume: 75, generalScore: '8.2', aiScore: '2.0', price: '32.50' },
  { id: '10', brand: 'Vichy', name: 'Tonic', volume: 200, generalScore: '7.8', aiScore: '8.4', price: '41.00' },
  { id: '11', brand: 'Garnier', name: 'Face Wash', volume: 150, generalScore: '7.0', aiScore: '7.9', price: '18.90' },
  { id: '12', brand: 'Cerave', name: 'Cleanser', volume: 236, generalScore: '9.3', aiScore: '9.5', price: '64.00' },
];

const HEADER_SCROLL_DISTANCE = 110;

export const HomeScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [userName, setUserName] = React.useState('Ayşe');
  const [products, setProducts] = React.useState(initialProducts);
  const headerAnimValue = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const insets = useSafeAreaInsets();

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

  // ListHeaderComponent is no longer needed since we use padding in contentContainerStyle

  return (
    <View style={styles.container}>

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
            <FilterActions onSort={() => { }} onFilter={() => { }} />
          </Animated.View>
        </Animated.View>
      </View>

      <Animated.FlatList
        onScroll={onScroll}
        scrollEventThrottle={16}
        data={initialProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProductCard item={item} onPress={() => navigation.navigate('ProductDetail', {
          product: {
            brand: item.brand,
            name: item.name,
            description: 'Advanced daily UV fluid with Antioxidant Vitamin C. High protection.', // Mock till actual data
            rating: parseFloat(item.generalScore),
            reviewsCount: Math.floor(Math.random() * 500) + 50,
            price: item.price,
            aiMatch: {
              score: Math.floor(Math.random() * 20) + 80, // Random 80-99
              explanation: 'Highly recommended for your skin profile. Contains no known allergens for you and provides excellent hydration.'
            },
            analysis: {
              score: parseFloat(item.aiScore),
              safeCount: 13,
              mediumCount: 3,
              riskyCount: 10,
            },
            ingredients: [
              { name: 'AQUA / WATER', subName: 'Pure Water', tag: 'Solvent', severity: 'safe' },
              { name: 'ALCOHOL DENAT.', subName: 'Denatured Alcohol', tag: 'Solvent', severity: 'medium' },
              { name: 'PHENOXYETHANOL', subName: 'Preservative', tag: 'Antimicrobial', severity: 'risky' },
            ]
          }
        })} />}
        contentContainerStyle={[styles.listPadding, { paddingTop: insets.top + HEADER_SCROLL_DISTANCE + 115 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    // Gölgeyi sadece en alta veriyoruz ki bütünlük bozulmasın
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    elevation: 5,
  },
  stickyWrapper: {
    zIndex: 10,
    // paddingTop: 15, 
    backgroundColor: '#ffffff', // Yapıştığında arkası beyaz olsun
    borderBottomLeftRadius: 24, // Orijinal görüntünü korur
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 }, // SADECE AŞAĞI
    shadowRadius: 10,
    elevation: 5,
    overflow: 'visible', // önemli

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