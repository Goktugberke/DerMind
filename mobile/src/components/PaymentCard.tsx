// src/components/PaymentCard.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CreditCard } from 'lucide-react-native';
import { theme } from '@constants/theme';

export const PaymentCard = ({ item, isSelected, onSelect }: any) => (
    <TouchableOpacity
        style={[styles.card, isSelected && styles.selectedCard]}
        onPress={onSelect}
        activeOpacity={0.8}
    >
        <View style={styles.iconContainer}>
            <CreditCard size={24} color={theme.colors.text} />
        </View>
        <View style={styles.cardInfo}>
            <Text style={styles.cardType}>{item.type} •••• {item.lastFour}</Text>
            <Text style={styles.expiry}>Expires {item.expiry}</Text>
        </View>
        <View style={[styles.radio, isSelected && styles.radioSelected]}>
            {isSelected && <View style={styles.radioInner} />}
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
        padding: 15, borderRadius: 20, marginBottom: 12,
        borderWidth: 2, borderColor: '#F1F5F9', elevation: 2
    },
    selectedCard: { borderColor: '#8B2E6E' }, // Görseldeki mor tonu
    iconContainer: {
        width: 45, height: 45, backgroundColor: '#F8F9FA',
        borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15
    },
    cardInfo: { flex: 1 },
    cardType: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    expiry: { fontSize: 13, color: '#64748B', marginTop: 2 },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
    radioSelected: { borderColor: '#8B2E6E' },
    radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#8B2E6E' },
});