import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { theme } from '@constants/theme';
import { Heart } from 'lucide-react-native';
import { StarRating } from '@components/StarRating';

interface ProductInfoCardProps {
    brand: string;
    name: string;
    description: string;
    rating: number;
    reviewsCount: number;
    imageUrl?: any;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
}

export const ProductInfoCard = ({
    brand,
    name,
    description,
    rating,
    reviewsCount,
    imageUrl,
    isFavorite = false,
    onToggleFavorite
}: ProductInfoCardProps) => {

    return (
        <View style={styles.cardContainer}>
            {/* Left Side: Product Image Wrapper */}
            <View style={styles.imageWrapper}>
                {imageUrl ? (
                    <Image source={imageUrl} style={styles.productImage} resizeMode="contain" />
                ) : (
                    <View style={styles.imagePlaceholder} />
                )}
            </View>

            {/* Right Side: Product Details */}
            <View style={styles.detailsWrapper}>
                {/* Brand and Favorite Icon Row */}
                <View style={styles.titleRow}>
                    <View style={styles.brandBadge}>
                        <Text style={styles.brandText}>{brand.toUpperCase()}</Text>
                    </View>


                    <TouchableOpacity
                        onPress={onToggleFavorite}
                        style={{ paddingRight: 10, marginTop: 5 }}
                    >
                        <Heart
                            size={26}
                            color={isFavorite ? '#D81B60' : theme.colors.gray}
                            fill={isFavorite ? theme.colors.primary : 'transparent'}
                        />
                    </TouchableOpacity>
                </View>

                {/* Product Name */}
                <Text style={styles.productName}>{name}</Text>

                {/* Description */}
                <Text style={styles.descriptionText} numberOfLines={3}>
                    {description}
                </Text>

                {/* Stars and Reviews (Pushed to Bottom) */}
                <View style={[styles.ratingRow, { marginTop: 'auto' }]}>
                    <StarRating score={rating} outOf={10} size={14} color="#FFB500" />
                    <Text style={styles.reviewsText}>({rating} / {reviewsCount} reviews)</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        flexDirection: 'row',
        paddingVertical: 15,
        paddingHorizontal: 15,
    },
    imageWrapper: {
        width: 130,
        height: 165,
        backgroundColor: theme.colors.white,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 3,
    },
    productImage: {
        width: '80%',
        height: '80%',
    },
    imagePlaceholder: {
        width: 120,
        height: 150,
        backgroundColor: '#f6e49cff',
        borderRadius: 8,
    },
    detailsWrapper: {
        flex: 1,
        marginLeft: 15,
        justifyContent: 'flex-start',
        paddingVertical: 5,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    brandBadge: {
        backgroundColor: '#FFEDF4', // Light pink background like the mockup
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    brandText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.primary, // Pinkish text color
        letterSpacing: 0.5,
    },
    productName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 6,
        letterSpacing: -0.5,
    },
    descriptionText: {
        fontSize: 12,
        color: theme.colors.gray,
        lineHeight: 18,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    starsContainer: {
        flexDirection: 'row',
        marginRight: 6,
        gap: 2,
    },
    reviewsText: {
        fontSize: 12,
        color: theme.colors.text,
        fontWeight: '500',
    }
});
