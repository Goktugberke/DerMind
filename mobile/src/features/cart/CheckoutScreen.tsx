// src/screens/CheckoutScreen.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TextInput, Alert, ActivityIndicator, LayoutAnimation, TouchableOpacity } from 'react-native';
import { PageHeader } from '@components/PageHeader';
import { CustomButton } from '@components/CustomButton';
import { PaymentCard } from '@components/PaymentCard';
import { Lock, Info, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react-native';
import { theme } from '@constants/theme';

import { useCreatePurchase, useClearCart } from '../../services/api';

export const CheckoutScreen = ({ route, navigation }: any) => {
    // CartScreen'den gelen veriler
    const { subtotal, shipping, total, items, appliedCoupon, discount } = route.params || {};
    const [selectedCard, setSelectedCard] = useState('1');
    const [cardName, setCardName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isNewCardExpanded, setIsNewCardExpanded] = useState(false);

    const { mutateAsync: createPurchase } = useCreatePurchase();
    const { mutateAsync: clearCart } = useClearCart();

    const handlePayment = async () => {
        if (!items || items.length === 0) {
            Alert.alert("Error", "Your cart is empty.");
            return;
        }

        setIsProcessing(true);
        try {
            for (const item of items) {
                const productId = item.productId || item.id;

                // 1. Satın alma işlemini kaydet
                await createPurchase({
                    productId: productId,
                    quantity: item.quantity || 1,
                    unitPrice: item.price,
                    paymentMethod: "CREDIT_CARD",
                    shippingAddress: "Default Shipping Address",
                    notes: "Mobile App Purchase"
                });
            }

            // 3. Sepeti temizle
            try {
                await clearCart();
            } catch (e) {
                console.log("Could not clear cart on backend, continuing...", e);
            }

            Alert.alert(
                "Payment Successful",
                "Your products are purchased!",
                [
                    { text: "OK", onPress: () => navigation.navigate('MainApp') }
                ]
            );
        } catch (error) {
            console.error("Payment error:", error);
            Alert.alert("Payment Failed", "An error occurred while processing your payment.");
        } finally {
            setIsProcessing(false);
        }
    };

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
                        onSelect={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setSelectedCard(card.id);
                            setIsNewCardExpanded(false);
                        }}
                    />
                ))}

                {/* YENİ KART EKLEME (PAY WITH UNSAVED CARD) */}
                <TouchableOpacity
                    style={[styles.newCardContainer, isNewCardExpanded && styles.newCardExpanded]}
                    onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        const nextState = !isNewCardExpanded;
                        setIsNewCardExpanded(nextState);
                        if (nextState) {
                            setSelectedCard(''); // Kayıtlı kart seçimini temizle
                        } else {
                            setSelectedCard('1'); // Kapatıldığında ilk karta dön
                        }
                    }}
                    activeOpacity={0.9}
                >
                    <View style={styles.newCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.radio, isNewCardExpanded && styles.radioSelected, { marginRight: 12 }]}>
                                {isNewCardExpanded && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.newCardTitle}>Pay with Another Card</Text>
                        </View>
                        {isNewCardExpanded ? <ChevronDown size={20} color={theme.colors.text} /> : <ChevronUp size={20} color={theme.colors.text} />}
                    </View>

                    {isNewCardExpanded && (
                        <View style={styles.dropdownContent}>
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
                        </View>
                    )}
                </TouchableOpacity>

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
                {isProcessing ? (
                    <ActivityIndicator size="large" color="#8B2E6E" />
                ) : (
                    <CustomButton title="Pay Now" onPress={handlePayment} />
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    container: { padding: 20, backgroundColor: theme.colors.deepbackground },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#8B2E6E', marginBottom: 15, letterSpacing: 0.5 },
    newCardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginTop: 10,
        marginBottom: 15,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    newCardExpanded: {
        borderColor: '#8B2E6E',
        backgroundColor: theme.colors.secondary + '50'
    },
    newCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    newCardTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    dropdownContent: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
    radioSelected: { borderColor: '#8B2E6E' },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#8B2E6E' },
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