import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native'; // İkon için
import { theme } from '@constants/theme';

interface ProfileMenuItemProps {
    label: string;
    icon?: React.ReactNode;
    onPress?: () => void;
    isLogout?: boolean;
    rightElement?: React.ReactNode; // Sağ taraf için esnek alan
    value?: string; // Sağ taraftaki gri metin için (örn: "English")
    isLast?: boolean;
}

export const ProfileMenuItem = ({ label, icon, onPress, isLogout, rightElement, value, isLast }: ProfileMenuItemProps) => (
    <TouchableOpacity style={[styles.item, isLast && { borderBottomWidth: 0 }]}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!onPress}
    >
        <View style={styles.leftContent}>
            <View style={[styles.iconContainer, isLogout && { backgroundColor: '#FEF2F2' }]}>
                {icon}
            </View>
            <Text style={[styles.label, isLogout && { color: '#EF4444' }]}>{label}</Text>
        </View>
        <View style={styles.rightContent}>
            {value && <Text style={styles.valueText}>{value}</Text>}
            {rightElement}
            {!isLogout && !rightElement && <ChevronRight size={20} color="#94A3B8" />}
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.lightGray,
    },
    leftContent: { flexDirection: 'row', alignItems: 'center' },
    label: { fontSize: 16, fontWeight: '500', marginLeft: 12, color: theme.colors.text },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center'
    },
    rightContent: { flexDirection: 'row', alignItems: 'center' },
    valueText: { fontSize: 14, color: '#94A3B8', marginRight: 8 }
});