import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@constants/theme';
import { MessageSquareText, ArrowLeft, MoreVertical, ShoppingCart } from 'lucide-react-native';

import { ProductInfoCard } from '@components/ProductInfoCard';
import { useGetProductById, useCheckFavorite, useAddFavorite, useRemoveFavorite } from '@services/api';
import { AnalysisChartCard } from '@components/AnalysisChartCard';
import { IngredientListBlock, IngredientDetails } from '@components/IngredientListBlock';
import { AiMatchCard } from '@components/AiMatchCard';
import { TabSelector } from '@components/TabSelector';
import { CommentsTab } from '@components/CommentsTab';
import { CartTab } from '@components/CartTab';

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

    const [isFavorite, setIsFavorite] = useState(false);

    useEffect(() => {
        setIsFavorite(isFavData === true);
    }, [isFavData]);

    // Merge initial product with fetched data
    const product = {
        ...initialProduct,
        ...productData,
    };

    // Parse ingredients
    let parsedIngredients = initialProduct?.ingredients;
    if (productData?.ingredients && typeof productData.ingredients === 'string' && productData.ingredients.trim()) {
        parsedIngredients = productData.ingredients.split(',').map((ing: string) => ({
            name: ing.trim().toUpperCase(),
            subName: ing.trim(),
            tag: 'Ingredient',
            severity: 'safe'
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
                <TouchableOpacity style={styles.navButton}>
                    <MoreVertical size={24} color={theme.colors.text} />
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
                    imageUrl={product?.image}
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
                    score={product?.rating || 0}
                    safeCount={product?.analysis?.safeCount || 0}
                    mediumCount={product?.analysis?.mediumCount || 0}
                    riskyCount={product?.analysis?.riskyCount || 0}
                />

                <AiMatchCard
                    aiMatchScore={product?.aiMatch?.score || 0}
                    explanation={product?.aiMatch?.explanation || 'No AI match data available for this product.'}
                />

                <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />

                {/* Tab Content Area Wrapped in a Card */}
                <View style={styles.tabContentContainer}>
                    {activeTab === 'ingredients' && (
                        <IngredientListBlock ingredients={product?.ingredients || []} />
                    )}

                    {activeTab === 'comments' && (
                        <CommentsTab productId={product.id || ''} />
                    )}

                    {activeTab === 'cart' && (
                        <CartTab productId={product.id || '1'} price={product.price} />
                    )}
                </View>

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
