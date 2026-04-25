import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView } from 'react-native';
import { PageHeader } from '@components/PageHeader';
import { PaymentCard } from '@components/PaymentCard';
import { CustomButton } from '@components/CustomButton';
import { Info, ShieldCheck, Plus } from 'lucide-react-native';
import { theme } from '@constants/theme';

export const PaymentMethodsScreen = () => {
    // Başlangıçta ilk kartın seçili (ve dolayısıyla açık) gelmesi için
    const [selectedId, setSelectedId] = useState('1');

    // Mock data - Gerçekte API'den gelecek
    const cards = [
        {
            id: '1',
            lastFour: '4242',
            expiry: '12/26',
            holderName: 'ALEXANDER D. SMITH',
            billingZip: '10001, NY'
        },
        {
            id: '2',
            lastFour: '8810',
            expiry: '05/25',
            holderName: 'ALEXANDER D. SMITH',
            billingZip: '10001, NY'
        },
    ];

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header: Sade ve sola hizalı */}
            <PageHeader title="Payment Methods" showBackButton align="left" />

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                {/* Başlık Bölümü */}
                <View style={styles.headerSection}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>Your Saved Cards</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{cards.length} Total</Text>
                        </View>
                    </View>
                    <Text style={styles.subtitle}>
                        Select a card to view details or set as default.
                    </Text>
                </View>

                {/* Kart Listesi */}
                {cards.map(card => (
                    <PaymentCard
                        key={card.id}
                        item={card}
                        isSelected={selectedId === card.id}
                        onSelect={() => setSelectedId(card.id)}
                        isEditable={true} // Bu sayfa düzenleme sayfası olduğu için true veriyoruz
                    />
                ))}

                {/* Bilgilendirme Kutusu */}
                <View style={styles.securityBox}>
                    <Info size={18} color="#64748B" />
                    <Text style={styles.securityText}>
                        Cards are stored securely using PCI-DSS level 1 compliant encryption.
                        Your full card number is never stored on our servers.
                    </Text>
                </View>
            </ScrollView>

            {/* Alt Buton ve Güvenlik İbaresi */}
            <View style={styles.footer}>
                <CustomButton
                    title="Add New Card"
                    onPress={() => console.log("Yeni kart ekleme")}
                />
                <View style={styles.secureFooter}>
                    <ShieldCheck size={14} color="#94A3B8" />
                    <Text style={styles.secureFooterText}>SECURE ENCRYPTED PAYMENTS</Text>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.deepbackground
    },
    container: {
        padding: 20
    },
    headerSection: {
        marginBottom: 25
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 6
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1E293B'
    },
    badge: {
        backgroundColor: '#FCE7F3',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10
    },
    badgeText: {
        color: '#8B2E6E',
        fontSize: 10,
        fontWeight: '800'
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B'
    },
    securityBox: {
        flexDirection: 'row',
        backgroundColor: theme.colors.lightGray,
        padding: 16,
        borderRadius: 16,
        gap: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: theme.colors.lightGray
    },
    securityText: {
        flex: 1,
        fontSize: 12,
        color: '#64748B',
        lineHeight: 18
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        backgroundColor: '#FFF'
    },
    secureFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginTop: 15
    },
    secureFooterText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 1
    }
});