import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useDeleteReview, useMyReviews } from '@services/api';
import { PageHeader } from '@components/PageHeader';
import { PurchasedProductCard } from '@components/PurchasedProductCard';
import { theme } from '@constants/theme';
import { Star, Edit3, Trash2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export const MyReviewsScreen = () => {
    const { data: reviews, isLoading, isError } = useMyReviews();
    const { mutate: deleteReview } = useDeleteReview();
    const navigation = useNavigation<any>();

    const handleDelete = (id: number) => {
        Alert.alert(
            "Delete Review",
            "Are you sure you want to delete this review?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteReview(id) }
            ]
        );
    };

    const renderItem = ({ item }: { item: any }) => (
        <PurchasedProductCard
            item={{
                brand: item.productBrand || 'Unknown Brand',
                name: item.productName || 'Unknown Product',
                image: null
            }}
            primaryAction={{
                label: 'Edit',
                icon: <Edit3 size={18} color={theme.colors.primary} />,
                onPress: () => navigation.navigate('EditReview', { product: item })
            }}
            secondaryAction={{
                label: 'Delete',
                icon: <Trash2 size={18} color={theme.colors.error} />,
                onPress: () => handleDelete(item.id)
            }}
        >
            <View style={styles.ratingContainer}>
                {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} size={16} color={theme.colors.secondary} fill={theme.colors.secondary} />
                ))}
            </View>

            <Text style={styles.reviewText}>{item.review}</Text>

            {item.skinImprovement && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>Skin Improvement</Text>
                </View>
            )}
        </PurchasedProductCard>
    );

    return (
        <SafeAreaView style={styles.container}>
            <PageHeader
                title="My Reviews"
                showBackButton={true}
            />
            {isLoading ? (
                <View style={styles.centerItem}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : isError ? (
                <View style={styles.centerItem}>
                    <Text style={styles.errorText}>Could not load your reviews</Text>
                </View>
            ) : (!reviews || reviews.length === 0) ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>No Reviews Yet</Text>
                    <Text style={styles.emptySubText}>You haven't reviewed any products yet.</Text>
                </View>
            ) : (
                <FlatList
                    data={reviews}
                    keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.deepbackground,
    },
    listContent: {
        padding: 10,
    },
    centerItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: theme.colors.gray,
        textAlign: 'center',
    },
    ratingContainer: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    reviewText: {
        color: theme.colors.text,
        marginBottom: 12,
        lineHeight: 20,
    },
    badge: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    badgeText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '600',
    },
});