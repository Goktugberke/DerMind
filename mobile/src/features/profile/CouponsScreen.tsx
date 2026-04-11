import React from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Clipboard } from 'react-native';
import { PageHeader } from '@components/PageHeader';
import { CouponCard } from '@components/CouponCard';
import { theme } from '@constants/theme';

export const CouponsScreen = () => {
    const couponData = [
        { id: '1', tag: 'Bestsellers', expiry: '2 days', title: '25% OFF', description: 'Applicable on all serums and moisturizers.', conditions: 'Minimum purchase $50.', code: 'GLOW25' },
        { id: '2', tag: 'Welcome Pack', expiry: '5 days', title: 'FREE SHIPPING', description: 'Your first order is on us! Enjoy free delivery nationwide.', conditions: 'Valid for first-time users only.', code: 'FIRSTSHIP' },
        { id: '3', tag: 'New Arrival', expiry: '1 week', title: '$15 OFF', description: 'Get an instant discount on our new cleansing oils collection.', conditions: 'Valid on orders over $100.', code: 'PURESKIN' },
        { id: '4', tag: 'Birthday Gift', expiry: '12 days', title: '30% OFF', description: 'Happy Birthday! A special treat for your skincare ritual.', conditions: 'Valid during your birthday month.', code: 'GLOWB-DAY' },
    ];

    const copyToClipboard = (code: string) => {
        // Clipboard.setString(code); // Gerçek cihazda kopyalama yapar
        console.log('Kopyalanan Kod:', code);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Sağ ikonlar olmadan Header */}
            <PageHeader title="My Coupons" showBackButton align="left" />

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                {/* Your Savings Hub - Sayfaya direkt yazıldı */}
                <Text style={styles.introTitle}>Your Savings Hub</Text>
                <Text style={styles.introSubtitle}>Unlock exclusive deals on PureGlow essentials.</Text>


                <View style={styles.listHeader}>
                    <Text style={styles.listHeaderText}>AVAILABLE REWARDS (4)</Text>
                </View>

                {couponData.map(coupon => (
                    <CouponCard
                        key={coupon.id}
                        tag={coupon.tag}
                        expiry={coupon.expiry}
                        title={coupon.title}
                        description={coupon.description}
                        conditions={coupon.conditions}
                        code={coupon.code}
                        onCopy={() => copyToClipboard(coupon.code)}
                    />
                ))}

                <Text style={styles.footerDisclaimer}>
                    * Coupons cannot be combined with other promotional offers. One code per checkout.
                </Text>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.deepbackground },
    container: { padding: 20 },
    introTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    introSubtitle: {
        fontSize: 13,
        color: theme.colors.gray,
        marginTop: 4,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 15,
    },
    listHeaderText: {
        fontSize: 13,
        fontWeight: '800',
        color: theme.colors.secondary,
        letterSpacing: 0.5,
    },
    footerDisclaimer: {
        textAlign: 'center',
        color: theme.colors.gray,
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 10,
        paddingHorizontal: 20,
        lineHeight: 18,
    },
});