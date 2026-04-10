import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '@constants/theme';
import { CheckCircle2 } from 'lucide-react-native';

interface SkinTypeCardProps {
    item: { id: string; title: string; description: string; icon: React.ReactNode };
    isSelected: boolean;
    onSelect: () => void;
}

export const SkinTypeCard = ({ item, isSelected, onSelect }: SkinTypeCardProps) => (
    <TouchableOpacity
        style={[
            styles.card,
            isSelected && {
                backgroundColor: theme.colors.primary, // Kartın arka planı artık primary
                borderColor: theme.colors.secondary,
                borderWidth: 2
            }
        ]}
        onPress={onSelect}
        activeOpacity={0.8}
    >
        {isSelected && (
            <View style={styles.checkIcon}>
                <CheckCircle2 size={16} color="#FFF" fill={theme.colors.secondary} />
            </View>
        )}

        <View style={[
            styles.iconBox,
            { backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.2)' : '#F8F9FA' }
        ]}>
            {React.cloneElement(item.icon as React.ReactElement, {
                color: isSelected ? '#FFF' : theme.colors.secondary
            })}
        </View>

        <Text style={[
            styles.title,
            isSelected && { color: theme.colors.secondary }
        ]}>
            {item.title}
        </Text>

        <Text style={[
            styles.desc,
            isSelected && { color: theme.colors.secondary }
        ]}>
            {item.description}
        </Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    card: {
        width: '48%', backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 15,
        alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowOpacity: 0.05
    },
    checkIcon: { position: 'absolute', top: 8, right: 8, zIndex: 1 },
    iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    title: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    desc: { fontSize: 11, color: '#64748B', marginTop: 2, textAlign: 'center' }
});