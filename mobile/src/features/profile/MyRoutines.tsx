import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useMyStreaks, useDeleteStreak } from '@services/api';
import { PageHeader } from '@components/PageHeader';
import { PurchasedProductCard } from '@components/PurchasedProductCard';
import { theme } from '@constants/theme';
import { Calendar, Clock, RotateCw, CheckCircle2, Edit3, Trash2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export const MyRoutines = () => {
    const { data: streaks, isLoading, isError } = useMyStreaks();
    const { mutate: deleteStreak } = useDeleteStreak();
    const navigation = useNavigation<any>();

    const handleDelete = (id: number) => {
        Alert.alert(
            "Delete Routine",
            "Are you sure you want to delete this routine?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteStreak(id) }
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
                onPress: () => navigation.navigate('EditRoutine', { streak: item })
            }}
            secondaryAction={{
                label: 'Delete',
                icon: <Trash2 size={18} color={theme.colors.error} />,
                onPress: () => handleDelete(item.id)
            }}
        >
            <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
                <View style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                    <Text style={[styles.statusText, item.isActive ? styles.activeText : styles.inactiveText]}>
                        {item.isActive ? 'Active' : 'Completed'}
                    </Text>
                </View>
            </View>

            <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                    <RotateCw size={18} color={theme.colors.gray} />
                    <Text style={styles.infoText}>{item.usageFrequency || 'Daily'}</Text>
                </View>

                <View style={styles.infoItem}>
                    <Calendar size={18} color={theme.colors.gray} />
                    <Text style={styles.infoText}>Streak: {item.currentStreak || 0} days</Text>
                </View>
            </View>

            {item.customTimes && item.customTimes.length > 0 && (
                <View style={styles.timeContainer}>
                    <Clock size={16} color={theme.colors.primary} />
                    <Text style={styles.timeText}>
                        {item.customTimes.map((t: string) => t.substring(0, 5)).join(', ')}
                    </Text>
                </View>
            )}
        </PurchasedProductCard>
    );

    return (
        <SafeAreaView style={styles.container}>
            <PageHeader
                title="My Routines"
                showBackButton={true}
            />
            {isLoading ? (
                <View style={styles.centerItem}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : isError ? (
                <View style={styles.centerItem}>
                    <Text style={styles.errorText}>Could not load your routines</Text>
                </View>
            ) : (!streaks || streaks.length === 0) ? (
                <View style={styles.emptyContainer}>
                    <CheckCircle2 size={64} color={theme.colors.lightGray} />
                    <Text style={styles.emptyTitle}>No Routines Yet</Text>
                    <Text style={styles.emptySubText}>Start a streak from your purchased products to build your skincare routine.</Text>
                </View>
            ) : (
                <FlatList
                    data={streaks}
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
    card: {
        backgroundColor: theme.colors.white,
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerLeft: {
        flex: 1,
        marginRight: 10,
    },
    productName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    brandName: {
        fontSize: 14,
        color: theme.colors.gray,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    activeBadge: {
        backgroundColor: '#E8F5E9',
    },
    inactiveBadge: {
        backgroundColor: theme.colors.lightGray,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    activeText: {
        color: '#2E7D32',
    },
    inactiveText: {
        color: theme.colors.gray,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.lightGray,
        marginVertical: 15,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 20,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    infoText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 15,
        backgroundColor: '#FFF0F0', // Light red/pink matching primary theme tentatively
        padding: 10,
        borderRadius: 10,
    },
    timeText: {
        fontSize: 14,
        color: '#D81B60', // slightly darker primary
        fontWeight: '600',
    },
    centerItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: theme.colors.error,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 20,
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: theme.colors.gray,
        textAlign: 'center',
        lineHeight: 20,
    }
});
