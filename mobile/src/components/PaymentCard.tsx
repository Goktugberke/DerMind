// src/components/PaymentCard.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CheckCircle2, CreditCard, Edit2, MoreVertical, Trash2 } from 'lucide-react-native';
import { theme } from '@constants/theme';

interface PaymentCardProps {
    item: any;
    isSelected: boolean;
    onSelect: () => void;
    isEditable?: boolean; // Düzenleme yeteneğini kontrol eden yeni prop
}

export const PaymentCard = ({ item, isSelected, onSelect, isEditable = false }: PaymentCardProps) => (
    <TouchableOpacity
        style={[
            styles.card,
            isSelected && styles.selectedCard,
            !isEditable && { marginBottom: 12 }
        ]}
        onPress={onSelect}
        activeOpacity={0.8}
    >
        <View style={styles.headerRow}>
            <View style={styles.iconContainer}>
                <CreditCard size={24} color={theme.colors.text} />
            </View>
            <View style={styles.cardInfo}>
                <View style={styles.numberRow}>
                    <Text style={styles.cardType}>{item.type} •••• {item.lastFour}</Text>
                    {isSelected && <CheckCircle2 size={16} color={theme.colors.secondary} style={{ marginLeft: 8 }} />}
                </View>
                <Text style={styles.expiry}>Expires {item.expiry}</Text>
            </View>
            {isEditable && (
                <TouchableOpacity style={styles.moreBtn}>
                    <MoreVertical size={20} color="#94A3B8" />
                </TouchableOpacity>
            )}
            {!isEditable && (
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                </View>
            )}
        </View>
        {isEditable && isSelected && (
            <View style={styles.detailsContainer}>
                <View style={styles.infoGrid}>
                    <View>
                        <Text style={styles.infoLabel}>CARD HOLDER</Text>
                        <Text style={styles.infoValue}>{item.holderName}</Text>
                    </View>
                    <View>
                        <Text style={styles.infoLabel}>BILLING ZIP</Text>
                        <Text style={styles.infoValue}>{item.billingZip}</Text>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.editBtn}>
                        <Edit2 size={16} color={theme.colors.secondary} />
                        <Text style={styles.editBtnText}>Edit card details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn}>
                        <Trash2 size={18} color={theme.colors.secondary} />
                    </TouchableOpacity>
                </View>
            </View>
        )}
    </TouchableOpacity >
);

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
        borderWidth: 1.5,
        borderColor: theme.colors.lightGray,
        // elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.03,
    },
    selectedCard: {
        borderColor: theme.colors.secondary,
        backgroundColor: theme.colors.secondary + '50',
    },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: {
        width: 50, height: 35, backgroundColor: '#F8F9FA',
        borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15,
        borderWidth: 1, borderColor: '#EDF2F7'
    },
    cardInfo: { flex: 1 },
    numberRow: { flexDirection: 'row', alignItems: 'center' },
    cardType: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    expiry: { fontSize: 12, color: '#64748B', marginTop: 2 },
    moreBtn: { padding: 5 },

    // Detay stilleri
    detailsContainer: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#FCE7F3' },
    infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    infoLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8', letterSpacing: 0.5 },
    infoValue: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginTop: 4 },
    actionRow: { flexDirection: 'row', gap: 10 },
    editBtn: {
        flex: 1, flexDirection: 'row', height: 45, borderRadius: 12,
        borderWidth: 1, borderColor: '#FCE7F3', backgroundColor: '#FFF',
        justifyContent: 'center', alignItems: 'center', gap: 8
    },
    editBtnText: { color: theme.colors.secondary, fontWeight: '700', fontSize: 14 },
    deleteBtn: {
        width: 45, height: 45, borderRadius: 12,
        borderWidth: 1, borderColor: '#FCE7F3', backgroundColor: '#FFF',
        justifyContent: 'center', alignItems: 'center'
    },
    // Radyo buton stili (isEditable false iken)
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
    radioSelected: { borderColor: theme.colors.secondary },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.secondary },
});