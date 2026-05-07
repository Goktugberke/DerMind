import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@constants/theme';
import { MessageSquareText, ArrowLeft, MoreVertical, ShoppingCart } from 'lucide-react-native';

import { ProductInfoCard } from '@components/ProductInfoCard';
import { useGetProductById, useCheckFavorite, useAddFavorite, useRemoveFavorite, useAiScore, useAiExplain, useAiRecommend, useAiSimilar } from '@services/api';
import { AnalysisChartCard } from '@components/AnalysisChartCard';
import { IngredientListBlock, IngredientDetails } from '@components/IngredientListBlock';
import { AiMatchCard } from '@components/AiMatchCard';
import { TabSelector } from '@components/TabSelector';
import { CommentsTab } from '@components/CommentsTab';
import { CartTab } from '@components/CartTab';
import { RecommendedProductCard } from '@components/RecommendedProductCard';

export const ProductDetailScreen = ({ navigation, route }: any) => {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState('ingredients');

    const initialProduct = route?.params?.product;
    const productId = initialProduct?.id;

    // Query hooks
    const { data: productData, isLoading: isLoadingProduct } = useGetProductById(productId);
    const { data: isFavData } = useCheckFavorite(productId);
    const addFavorite = useAddFavorite();
    const removeFavorite = useRemoveFavorite();

    // AI hooks
    const { data: aiScoreData, isLoading: isLoadingAiScore, error: aiScoreError } = useAiScore(productId);
    const { data: aiExplainData, isLoading: isLoadingAiExplain, error: aiExplainError } = useAiExplain(productId, 'tr');

    const aiScore = aiScoreData?.score ?? null;
    const aiExplanation = aiExplainData?.explanation ?? null;
    
    // AI server hata durumlarını kontrol et
    const isAiServiceUnavailable = 
      (aiScoreError && (aiScoreError as any)?.response?.status === 503) ||
      (aiExplainError && (aiExplainError as any)?.response?.status === 503);

    const currentCategory = productData?.category || initialProduct?.category;
    const currentSecondaryCategory = productData?.secondaryCategory || initialProduct?.secondaryCategory;

    const { data: recommendedProducts, isLoading: isLoadingRecommended, error: recommendError } = useAiRecommend(
        { category: currentCategory, secondaryCategory: currentSecondaryCategory, topK: 10 },
        !!currentCategory
    );

    const { data: similarProducts, isLoading: isLoadingSimilar, error: similarError } = useAiSimilar(productId);

    const [isFavorite, setIsFavorite] = useState(false);

    useEffect(() => {
        setIsFavorite(isFavData === true);
    }, [isFavData]);

    // Merge initial product with fetched data
    const product = {
        ...initialProduct,
        ...productData,
    };

    // Parse ingredients — always ensure we end up with IngredientDetails[]
    const rawIngredients = productData?.ingredients ?? initialProduct?.ingredients;
    let parsedIngredients: IngredientDetails[] = [];
    if (Array.isArray(rawIngredients)) {
        parsedIngredients = rawIngredients;
    } else if (typeof rawIngredients === 'string' && rawIngredients.trim()) {
        parsedIngredients = rawIngredients.split(',').map((ing: string) => ({
            name: ing.trim().toUpperCase(),
            subName: ing.trim(),
            tag: 'Ingredient',
            severity: 'safe' as const,
        }));
    }

    const handleToggleFavorite = () => {
        const newStatus = !isFavorite;
        setIsFavorite(newStatus); // optimistic

        if (newStatus) {
            addFavorite.mutate(productId);
        } else {
            removeFavorite.mutate(productId);
        }
    };

    const getCategoryDisplay = () => {
        const { category, secondaryCategory } = product || {};
        if (category && secondaryCategory) return `${category} | ${secondaryCategory}`;
        if (category) return category;
        return '';
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Top Navigation Bar */}
            <View style={styles.navBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
                    <ArrowLeft size={24} color={theme.colors.text} />
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollArea, { paddingBottom: insets.bottom + 100 }]} // Bottom padding for floating bar
            >
                <ProductInfoCard
                    brand={product?.brand}
                    name={product?.name}
                    imageUrl={product?.image || product?.imageUrl || product?.productImageUrl}
                    description={getCategoryDisplay()}
                    rating={product?.rating || product?.averageUserRating || 0}
                    reviewsCount={product?.reviewsCount || product?.totalRatings || 0}
                    isFavorite={isFavorite}
                    onToggleFavorite={handleToggleFavorite}
                />

                {isLoadingProduct && (
                    <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 10 }} />
                )}

                <AnalysisChartCard
                    score={product?.personalScore ?? product?.qualityScore ?? 0}
                    safeCount={product?.safeIngredientCount ?? 0}
                    mediumCount={product?.cautionIngredientCount ?? 0}
                    riskyCount={product?.riskyIngredientCount ?? 0}
                />

                <AiMatchCard
                    aiMatchScore={aiScore ?? product?.aiMatch?.score ?? 0}
                    explanation={
                        isAiServiceUnavailable 
                            ? '⚠️ AI servisi şu an kullanılamıyor. Lütfen daha sonra tekrar deneyiniz.'
                            : isLoadingAiExplain || isLoadingAiScore
                            ? 'AI analizi yükleniyor...'
                            : aiExplanation
                            ?? product?.aiMatch?.explanation
                            ?? 'Bu ürün için AI analizi şu an kullanılamıyor.'
                    }
                />

                <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />

                {/* Tab Content Area Wrapped in a Card */}
                <View style={styles.tabContentContainer}>
                    {activeTab === 'ingredients' && (
                        <IngredientListBlock ingredients={parsedIngredients} />
                    )}

                    {activeTab === 'comments' && (
                        <CommentsTab productId={product.id || ''} />
                    )}

                    {activeTab === 'cart' && (
                        <CartTab productId={product.id || '1'} price={product.price} />
                    )}
                </View>

                {/* Recommended Products */}
                {isLoadingRecommended ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
                ) : recommendError ? (
                    <View style={styles.placeholderCard}>
                        <Text style={styles.placeholderText}>Benzer ürünler yüklenemedi</Text>
                    </View>
                ) : (
                    recommendedProducts && recommendedProducts.length > 0 && (
                        <View style={styles.recommendationsContainer}>
                            <Text style={styles.recommendationsTitle}>Recommended Products</Text>
                            <FlatList
                                data={recommendedProducts}
                                keyExtractor={(item, idx) => item.product_id?.toString() || item.id?.toString() || idx.toString()}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.recommendationsList}
                                renderItem={({ item }) => (
                                    <RecommendedProductCard
                                        item={item}
                                        onPress={() => navigation.push('ProductDetail', {
                                            product: {
                                                ...item,
                                                id: item.product_id || item.id,
                                                name: item.product_name || item.name
                                            }
                                        })}
                                    />
                                )}
                            />
                        </View>
                    )
                )}

                {/* Similar Products */}
                {isLoadingSimilar ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
                ) : similarError ? null : (
                    similarProducts && similarProducts.length > 0 && (
                        <View style={styles.recommendationsContainer}>
                            <Text style={styles.recommendationsTitle}>Similar Products</Text>
                            <FlatList
                                data={similarProducts}
                                keyExtractor={(item, idx) => item.product_id?.toString() || item.id?.toString() || idx.toString()}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.recommendationsList}
                                renderItem={({ item }) => (
                                    <RecommendedProductCard
                                        item={item}
                                        onPress={() => navigation.push('ProductDetail', {
                                            product: {
                                                ...item,
                                                id: item.product_id || item.id,
                                                name: item.product_name || item.name
                                            }
                                        })}
                                    />
                                )}
                            />
                        </View>
                    )
                )}

            </ScrollView>

            {/* Bottom Bar - Price Display */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Price: </Text>
                    <Text style={styles.priceValue}>$ {product?.price || 0}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.deepbackground, // Light bg across the whole screen
    },
    tabContentContainer: {
        backgroundColor: theme.colors.white,
        marginHorizontal: 15,
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginBottom: 20,
        // Card Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    recommendationsContainer: {
        marginTop: 5,
        marginBottom: 20,
    },
    recommendationsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginLeft: 15,
        marginBottom: 10,
    },
    recommendationsList: {
        paddingHorizontal: 15,
    },
    placeholderCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 50,
        gap: 12,
    },
    placeholderText: {
        color: theme.colors.gray,
        fontSize: 14,
        fontWeight: '500',
    },
    navBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: theme.colors.white,
    },
    navButton: {
        padding: 4,
    },
    scrollArea: {
        // Will be padded dynamically in component
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.colors.white,
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 10,
        alignItems: 'center',
        justifyContent: 'flex-end',
        // Top shadow/border to detach from content
        borderTopWidth: 1,
        borderTopColor: theme.colors.lightGray,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 15,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'flex-end',
    },
    priceLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.gray,
    },
    priceValue: {
        fontSize: 24,
        fontWeight: '900',
        color: theme.colors.text,
        letterSpacing: -1,
    },
});
