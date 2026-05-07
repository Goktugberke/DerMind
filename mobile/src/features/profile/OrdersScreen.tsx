import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { PageHeader } from '@components/PageHeader';
import { OrderCard } from '@components/OrderCard';
import { Search, Bell, Filter, CheckCircle } from 'lucide-react-native';
import { theme } from '@constants/theme';
import { useMyPurchases } from '@services/api';

export const OrdersScreen = () => {
    const [activeFilter, setActiveFilter] = useState('All');
    const { data: rawOrders, isLoading } = useMyPurchases();

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const orders = (rawOrders || []).map((item: any) => ({
        id: item.id.toString(),
        name: item.productName || 'Unknown Product',
        specs: item.productBrand || 'Brand',
        price: item.totalPrice ? item.totalPrice.toFixed(2) : '0.00',
        date: formatDate(item.purchasedAt || item.createdAt),
        status: item.orderStatus ? item.orderStatus.charAt(0).toUpperCase() + item.orderStatus.slice(1).toLowerCase() : 'Pending',
        image: [item.productImageUrl, item.imageUrl, item.image, item.product?.imageUrl, item.product?.image].find(url => url && url !== 'null' && url !== '') || 'https://via.placeholder.com/100',
        rawStatus: item.orderStatus
    }));

    const filteredOrders = orders.filter((order: any) => {
        if (activeFilter === 'All') return true;
        if (activeFilter === 'Active') return order.rawStatus === 'PENDING' || order.rawStatus === 'SHIPPED' || order.rawStatus === 'PROCESSING';
        if (activeFilter === 'Completed') return order.rawStatus === 'DELIVERED';
        if (activeFilter === 'Cancelled') return order.rawStatus === 'CANCELLED';
        return true;
    });

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <PageHeader title="My Orders" showBackButton align="left" />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <PageHeader title="My Orders" showBackButton align="left" />

            <FlatList
                data={filteredOrders}
                keyExtractor={item => item.id}
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        <Text style={styles.title}>Track Your Glow</Text>
                        <Text style={styles.subtitle}>Manage your skincare journey and recent hauls.</Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                            {['All', 'Active', 'Completed', 'Cancelled'].map(filter => (
                                <TouchableOpacity
                                    key={filter}
                                    onPress={() => setActiveFilter(filter)}
                                    style={[styles.filterChip, activeFilter === filter && { backgroundColor: theme.colors.primary }]}
                                >
                                    <Text style={[styles.filterText, activeFilter === filter && { color: '#FFF' }]}>{filter}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                }
                renderItem={({ item }) => <OrderCard item={item} />}
                contentContainerStyle={styles.scrollContent}
                ListEmptyComponent={
                    <View style={{ marginTop: 50, alignItems: 'center' }}>
                        <Text style={{ color: theme.colors.gray }}>No orders found.</Text>
                    </View>
                }
                ListFooterComponent={
                    filteredOrders.length > 0 ? (
                        <View>
                            <Text style={styles.endText}>END OF RECENT ORDERS</Text>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.deepbackground },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    listHeader: { marginTop: 10, marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
    subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
    filterScroll: { flexDirection: 'row', marginTop: 20 },
    filterChip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', marginRight: 10, borderWidth: 1, borderColor: '#F1F5F9' },
    filterText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
    endText: { textAlign: 'center', color: '#94A3B8', fontSize: 10, letterSpacing: 1, fontWeight: '700' }
});