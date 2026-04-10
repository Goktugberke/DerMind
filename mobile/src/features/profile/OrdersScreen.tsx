import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { PageHeader } from '@components/PageHeader';
import { OrderCard } from '@components/OrderCard';
import { Search, Bell, Filter, CheckCircle } from 'lucide-react-native';
import { theme } from '@constants/theme';

export const OrdersScreen = () => {
    const [activeFilter, setActiveFilter] = useState('All');

    const orders = [
        { id: 'PG-88291', name: 'Hydrating Glow Serum', specs: '30ml • Hyaluronic Acid + Vit C', price: '42.00', date: 'Oct 24, 2023', status: 'Shipped', image: 'https://via.placeholder.com/100' },
        { id: 'PG-88102', name: 'Midnight Repair Cream', specs: '50g • Retinol + Peptides', price: '58.00', date: 'Oct 18, 2023', status: 'Delivered', image: 'https://via.placeholder.com/100' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <PageHeader title="My Orders" showBackButton align="left" />

            <FlatList
                data={orders}
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
                ListFooterComponent={
                    <View>
                        <Text style={styles.endText}>END OF RECENT ORDERS</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    listHeader: { marginTop: 10, marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
    subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
    filterScroll: { flexDirection: 'row', marginTop: 20 },
    filterChip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8F9FA', marginRight: 10, borderWidth: 1, borderColor: '#F1F5F9' },
    filterText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
    endText: { textAlign: 'center', color: '#94A3B8', fontSize: 10, letterSpacing: 1, fontWeight: '700' }
});