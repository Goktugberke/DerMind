import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@constants/theme';
import { MessageSquareText, ArrowLeft, MoreVertical, ShoppingCart } from 'lucide-react-native';

import { ProductInfoCard } from '@components/ProductInfoCard';
import { AnalysisChartCard } from '@components/AnalysisChartCard';
import { IngredientListBlock, IngredientDetails } from '@components/IngredientListBlock';
import { AiMatchCard } from '@components/AiMatchCard';
import { TabSelector } from '@components/TabSelector';
import { CommentsTab } from '@components/CommentsTab';
import { CartTab } from '@components/CartTab';

// Mock Data representing the visual mockup
const DUMMY_PRODUCT = {
    brand: 'L\'Oréal Paris',
    name: 'Revitalift Clinical Vitamin C SPF50+',
    description: 'Advanced daily UV fluid with Antioxidant Vitamin C. High protection for all skin types.',
    rating: 4.2,
    reviewsCount: 128,
    price: '749.90',
    aiMatch: {
        score: 85,
        explanation: 'Highly recommended for your skin profile. Contains no known allergens for you and provides excellent hydration.'
    },
    analysis: {
        score: 8.7,
        safeCount: 13,
        mediumCount: 3,
        riskyCount: 10,
    },
    ingredients: [
        { name: 'AQUA / WATER', subName: 'Pure Water', tag: 'Solvent', severity: 'safe' },
        { name: 'ALCOHOL DENAT.', subName: 'Denatured Alcohol', tag: 'Solvent', severity: 'medium' },
        { name: 'DIISOPROPYL SEBACATE', subName: 'Emollient', tag: 'Skin Care', severity: 'safe' },
        { name: 'SILICA', subName: 'Silica', tag: 'Mattifier', severity: 'safe' },
        { name: 'ISOPROPYL MYRISTATE', subName: 'Isopropyl Myristate', tag: 'Emollient', severity: 'safe' },
        { name: 'ETHYLHEXYL SALICYLATE', subName: 'Octisalate', tag: 'UV Filter', severity: 'medium' },
        { name: 'PHENOXYETHANOL', subName: 'Preservative', tag: 'Antimicrobial', severity: 'risky' },
    ] as IngredientDetails[]
};

export const ProductDetailScreen = ({ navigation, route }: any) => {
    const insets = useSafeAreaInsets();
    const [isFavorite, setIsFavorite] = useState(false);
    const [activeTab, setActiveTab] = useState('ingredients');

    // If a product was passed via navigation params, use it, otherwise use DUMMY
    const product = route?.params?.product || DUMMY_PRODUCT;

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
                    brand={product.brand}
                    name={product.name}
                    description={product.description}
                    rating={product.rating}
                    reviewsCount={product.reviewsCount}
                    isFavorite={isFavorite}
                    onToggleFavorite={() => setIsFavorite(!isFavorite)}
                />

                <AnalysisChartCard
                    score={product.rating}
                    safeCount={product.analysis.safeCount}
                    mediumCount={product.analysis.mediumCount}
                    riskyCount={product.analysis.riskyCount}
                />

                <AiMatchCard
                    aiMatchScore={product.aiMatch.score}
                    explanation={product.aiMatch.explanation}
                />

                <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />

                {/* Tab Content Area Wrapped in a Card */}
                <View style={styles.tabContentContainer}>
                    {activeTab === 'ingredients' && (
                        <IngredientListBlock ingredients={product.ingredients} />
                    )}

                    {activeTab === 'comments' && (
                        <CommentsTab />
                    )}

                    {activeTab === 'cart' && (
                        <CartTab price={product.price} />
                    )}
                </View>

            </ScrollView>

            {/* Bottom Bar - Price Display */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Price: </Text>
                    <Text style={styles.priceValue}>${product.price}</Text>
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
