import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Truck, CheckCircle2, Clock } from 'lucide-react-native';

const statusConfig: any = {
    Shipped: { color: '#7C3AED', bg: '#F5F3FF', icon: <Truck size={14} color="#7C3AED" /> },
    Delivered: { color: '#059669', bg: '#ECFDF5', icon: <CheckCircle2 size={14} color="#059669" /> },
    Processing: { color: '#D97706', bg: '#FFFBEB', icon: <Clock size={14} color="#D97706" /> },
};

export const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status] || statusConfig.Processing;
    return (
        <View style={[styles.badge, { backgroundColor: config.bg }]}>
            {config.icon}
            <Text style={[styles.text, { color: config.color }]}>{status}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', gap: 4 },
    text: { fontSize: 12, fontWeight: '600' }
});