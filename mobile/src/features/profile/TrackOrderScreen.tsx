import React from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Image, TouchableOpacity } from 'react-native';
import { PageHeader } from '@components/PageHeader';
import { CustomButton } from '@components/CustomButton';
import { TimelineStep } from '@components/TimelineStep';
import { Clock, Truck } from 'lucide-react-native';
import { theme } from '@constants/theme';
import { CourierCard } from '@components/CourierCard';

export const TrackOrderScreen = () => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <PageHeader
                title="Track Order"
                showBackButton
                align="left"
            />

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                {/* ÜRÜN ÖZET KARTI */}
                <View style={styles.productSummary}>
                    <Image
                        source={{ uri: 'https://via.placeholder.com/200' }}
                        style={styles.productImage}
                    />
                    <View style={styles.productInfo}>
                        <Text style={styles.productName}>Hydro-Glow Moisturizer Set</Text>
                        <Text style={styles.brandName}>Lumiere Botanics</Text>
                        <View style={styles.priceRow}>
                            <Text style={styles.price}>$84.50</Text>
                            <Text style={styles.qty}>Qty: 1</Text>
                        </View>
                    </View>
                </View>

                {/* TIMELINE SECTION */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <Clock size={20} color={theme.colors.secondary} />
                        <Text style={styles.sectionTitle}>Delivery Timeline</Text>
                    </View>
                    <View style={styles.etaBadge}>
                        <Text style={styles.etaText}>ETA: Oct 28</Text>
                    </View>
                </View>

                <View style={styles.timelineCard}>
                    <TimelineStep title="Ordered" time="Oct 24, 09:30 AM" description="Your order has been placed successfully." status="completed" />
                    <TimelineStep title="Confirmed" time="Oct 24, 11:45 AM" description="Seller has confirmed your item." status="completed" />
                    <TimelineStep title="Dispatched" time="Oct 25, 08:20 AM" description="Package is ready for pickup by courier." status="completed" />
                    <TimelineStep title="In Transit" time="Oct 26, 02:15 PM" description="Your package is on its way to the sorting center." status="current" />
                    <TimelineStep title="Out for Delivery" time="--:--" description="Courier is in your area, please be available." status="pending" />
                    <TimelineStep title="Delivered" time="--:--" description="Package has been handed over to recipient." status="pending" isLast />
                </View>

                {/* COURIER DETAILS */}
                <View style={[styles.sectionTitleRow, { marginVertical: 20 }]}>
                    <Truck size={20} color={theme.colors.secondary} />
                    <Text style={styles.sectionTitle}>Courier Details</Text>
                </View>

                <CourierCard
                    name="Ricardo Silva"
                    status="Verified Courier"
                    avatarUrl="https://i.pravatar.cc/100"
                    trackingNumber="LBC-TRK-882109X"
                    onCopyTracking={() => console.log("Copied!")}
                />

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* FOOTER BUTONU */}
            <View style={styles.footer}>
                <CustomButton title="Contact Support" onPress={() => console.log('Support contacted')} />
                <Text style={styles.footerNote}>Need help? Our specialists are available 24/7 for order inquiries.</Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    container: { padding: 20, backgroundColor: theme.colors.deepbackground },
    productSummary: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, borderRadius: 24, marginBottom: 15, elevation: 2, shadowOpacity: 0.05 },
    productImage: { width: 90, height: 90, borderRadius: 16, backgroundColor: '#F8F9FA' },
    productInfo: { flex: 1, marginLeft: 15 },
    productName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginTop: 6 },
    brandName: { fontSize: 12, color: '#64748B' },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    price: { fontSize: 16, fontWeight: '800', color: theme.colors.primary },
    qty: { fontSize: 12, color: '#94A3B8' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    etaBadge: { backgroundColor: theme.colors.primary + '10', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    etaText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
    timelineCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
    courierCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
    courierHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatarContainer: { marginRight: 15 },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#FFF' },
    courierName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    courierStatus: { fontSize: 12, color: '#64748B' },
    trackingNumberBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 15, borderRadius: 16, marginBottom: 15 },
    trackingLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
    trackingCode: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginTop: 2 },
    copyText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 13 },
    footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#FFF' },
    footerNote: { textAlign: 'center', color: '#94A3B8', fontSize: 11, marginTop: 12, fontStyle: 'italic' }
});