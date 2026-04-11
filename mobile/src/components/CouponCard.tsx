import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Copy, Sparkles, Clock } from 'lucide-react-native';
import { theme } from '@constants/theme';

interface CouponCardProps {
    tag: string;
    expiry: string;
    title: string;
    description: string;
    conditions: string; // Senin istediğin yeni alan
    code: string;
    onCopy: () => void;
}

export const CouponCard = ({ tag, expiry, title, description, conditions, code, onCopy }: CouponCardProps) => {
    return (
        <View style={styles.card}>
            {/* Sol kenardaki renkli şerit */}
            <View style={styles.accentBar} />

            <View style={styles.content}>
                <View style={styles.topRow}>
                    <View style={styles.tagBadge}>
                        <Text style={styles.tagText}>{tag}</Text>
                    </View>
                    <View style={styles.expiryRow}>
                        <Clock size={14} color="#94A3B8" />
                        <Text style={styles.expiryText}>Expires in {expiry}</Text>
                    </View>
                </View>

                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description}>{description}</Text>

                {/* Koşullar Bölümü */}
                <Text style={styles.conditionsText}>Conditions: {conditions}</Text>

                <View style={styles.bottomRow}>
                    <View style={styles.codeBox}>
                        <Text style={styles.codeText}>{code}</Text>
                        <Sparkles size={16} color={theme.colors.primary} opacity={0.3} />
                    </View>
                    <TouchableOpacity style={styles.copyBtn} onPress={onCopy} activeOpacity={0.7}>
                        <Copy size={18} color="#FFF" />
                        <Text style={styles.copyBtnText}>Copy</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        marginBottom: 16,
        flexDirection: 'row',
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    accentBar: {
        width: 6,
        backgroundColor: theme.colors.secondary,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    tagBadge: {
        backgroundColor: theme.colors.primary + '10',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    tagText: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.colors.secondary,
        textTransform: 'uppercase',
    },
    expiryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    expiryText: {
        fontSize: 12,
        color: '#94A3B8',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 6,
    },
    description: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
    },
    conditionsText: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 8,
        fontStyle: 'italic',
    },
    bottomRow: {
        flexDirection: 'row',
        marginTop: 15,
        gap: 12,
    },
    codeBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 48,
    },
    codeText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        letterSpacing: 1,
    },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        paddingHorizontal: 20,
        height: 48,
        gap: 8,
    },
    copyBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
});