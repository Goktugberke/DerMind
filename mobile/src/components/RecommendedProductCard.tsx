import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { theme } from '@constants/theme';
import { StarRating } from '@components/StarRating';

interface RecommendedProductCardProps {
    item: any;
    onPress: () => void;
}

export const RecommendedProductCard = ({ item, onPress }: RecommendedProductCardProps) => {

    const getScoreColor = (score: string | number) => {
        const numScore = parseFloat(score as string);
        if (isNaN(numScore)) return '#E0E0E0';
        if (numScore < 5) return '#FFA8A8';
        if (numScore < 8.5) return '#FDE68A';
        return '#86EFAC';
    };

    const productImage = item.image || item.imageUrl || item.productImageUrl;
    const aiScore = item.personal_score ?? item.base_score ?? item.baseScore ?? item.qualityScore ?? item.aiScore ?? item.generalScore;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.imageContainer}>
                {productImage && productImage !== 'null' ? (
                    <Image
                        source={{ uri: productImage }}
                        style={styles.image}
                        resizeMode="contain"
                    />
                ) : (
                    <View style={[styles.image, { backgroundColor: '#f0f0f0' }]} />
                )}
            </View>

            <View style={styles.infoContainer}>
                <Text style={styles.brand} numberOfLines={1}>{item.brand}</Text>
                <Text style={styles.name} numberOfLines={2}>{item.name || item.product_name}</Text>

                <View style={styles.bottomRow}>
                    <View style={[styles.scoreBox, { backgroundColor: getScoreColor(aiScore) }]}>
                        <Text style={styles.scoreText}>{parseFloat(aiScore).toFixed(1)}</Text>
                    </View>
                    {item.price && item.price !== 'null' && (
                        <Text style={styles.price}>${item.price}</Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        width: 140,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginRight: 15,
        padding: 10,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    imageContainer: {
        width: '100%',
        height: 100,
        borderRadius: 10,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    image: {
        width: '90%',
        height: '90%',
        borderRadius: 8,
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    brand: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.gray,
        marginBottom: 2,
    },
    name: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
        height: 36, // Ensure consistent height for up to 2 lines
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    scoreBox: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    scoreText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#000',
    },
    price: {
        fontSize: 13,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
});
