import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native'; // İkon için
import { theme } from '@constants/theme';

interface ProfileMenuItemProps {
    label: string;
    icon?: React.ReactNode;
    onPress: () => void;
    isLogout?: boolean;
}

export const ProfileMenuItem = ({ label, icon, onPress, isLogout }: ProfileMenuItemProps) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
        <View style={styles.leftContent}>
            {icon}
            <Text style={[styles.label, isLogout && { color: '#EF4444' }]}>{label}</Text>
        </View>
        {!isLogout && <ChevronRight size={20} color="#94A3B8" />}
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
        marginHorizontal: 20,
    },
    leftContent: { flexDirection: 'row', alignItems: 'center' },
    label: { fontSize: 16, fontWeight: '500', marginLeft: 12, color: theme.colors.text },
});