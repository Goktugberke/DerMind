// src/screens/CheckoutScreen.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TextInput } from 'react-native';
import { PageHeader } from '@components/PageHeader';
import { CustomButton } from '@components/CustomButton';
import { PaymentCard } from '@components/PaymentCard';
import { Lock, Info, ShieldCheck } from 'lucide-react-native';
import { theme } from '@constants/theme';

export const CheckoutScreen = ({ route, navigation }: any) => {
    // CartScreen'den gelen veriler
    const { subtotal, shipping, total, items, appliedCoupon, discount } = route.params || {};
    const [selectedCard, setSelectedCard] = useState('1');
    const [cardName, setCardName] = useState('');

    const savedCards = [
        { id: '1', type: 'Visa', lastFour: '4242', expiry: '05/26' },
        { id: '2', type: 'Mastercard', lastFour: '8891', expiry: '12/24' },
    ];

    return (
        <SafeAreaView style={styles.safeArea}>
            <PageHeader title="Checkout" showBackButton align="left" />

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                {/* KAYITLI KARTLAR */}
                <Text style={styles.sectionTitle}>SAVED CARDS</Text>
                {savedCards.map(card => (
                    <PaymentCard
                        key={card.id}
                        item={card}
                        isSelected={selectedCard === card.id}
                        onSelect={() => setSelectedCard(card.id)}
                    />
                ))}

                {/* YENİ KART EKLEME */}
                <Text style={[styles.sectionTitle, { marginTop: 10 }]}>ADD NEW CARD</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Name on Card</Text>
                    <TextInput style={styles.input} placeholder="e.g. Ayşe Yılmaz" />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Card Number</Text>
                    <View style={styles.iconInputWrapper}>
                        <Lock size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                        <TextInput style={styles.flexInput} placeholder="0000 0000 0000 0000" keyboardType="numeric" />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                        <Text style={styles.inputLabel}>Expiry Date</Text>
                        <TextInput style={styles.input} placeholder="MM/YY" />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={[styles.inputLabel, { marginBottom: 0 }]}>CVC</Text>
                            <Info size={14} color="#94A3B8" style={{ marginLeft: 4 }} />
                        </View>
                        <TextInput style={styles.input} placeholder="123" keyboardType="numeric" />
                    </View>
                </View>

                {/* ORDER SUMMARY (Cart'tan gelen veriler) */}
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>ORDER SUMMARY</Text>
                <View style={styles.summaryCard}>
                    {items?.map((item: any) => (
                        <View key={item.id} style={styles.summaryRow}>
                            <Text style={styles.summaryItemName}>{item.name}</Text>
                            <Text style={styles.summaryItemPrice}>${item.price.toFixed(2)}</Text>
                        </View>
                    ))}
                    <View style={styles.divider} />
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal</Text>
                        <Text style={styles.summaryValue}>${subtotal?.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Shipping</Text>
                        <Text style={styles.summaryValue}>{shipping === 0 ? 'Free' : `$${shipping}`}</Text>
                    </View>
                    {discount > 0 && (
                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: '#22C55E' }]}>
                                Discount ({appliedCoupon})
                            </Text>
                            <Text style={[styles.summaryValue, { color: '#22C55E' }]}>
                                -${discount.toFixed(2)}
                            </Text>
                        </View>
                    )}
                    <View style={[styles.summaryRow, { marginTop: 10 }]}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>${total?.toFixed(2)}</Text>
                    </View>
                </View>

                {/* SECURITY INFO */}
                <View style={styles.securityInfo}>
                    <ShieldCheck size={18} color="#64748B" />
                    <Text style={styles.securityText}>Secure SSL encrypted payment</Text>
                </View>
                <Text style={styles.disclaimer}>
                    Your payment data is processed securely. We do not store your full card details on our servers.
                </Text>

                <View style={{ height: 120 }} />
            </ScrollView>

            <View style={styles.footer}>
                <CustomButton title="Pay Now" onPress={() => console.log('Payment Processed')} />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    container: { padding: 20, backgroundColor: theme.colors.deepbackground },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#8B2E6E', marginBottom: 15, letterSpacing: 0.5 },
    inputGroup: { marginBottom: 15 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
    input: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    iconInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    flexInput: { flex: 1, paddingVertical: 12 },
    row: { flexDirection: 'row' },
    summaryCard: { backgroundColor: theme.colors.primary + '50', borderRadius: 20, padding: 20, marginTop: 5 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryItemName: { fontSize: 14, color: '#475569' },
    summaryItemPrice: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
    divider: { height: 1, backgroundColor: '#FCE7F3', marginVertical: 10 },
    summaryLabel: { fontSize: 14, color: '#64748B' },
    summaryValue: { fontSize: 14, fontWeight: '600' },
    totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    totalValue: { fontSize: 20, fontWeight: 'bold', color: '#8B2E6E' },
    securityInfo: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 20 },
    securityText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    disclaimer: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
    footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
});