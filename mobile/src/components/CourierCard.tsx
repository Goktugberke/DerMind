import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { theme } from '@constants/theme';

interface CourierCardProps {
    name: string;
    status: string;
    avatarUrl: string;
    trackingNumber: string;
    onCopyTracking: () => void;
}

export const CourierCard = ({
    name, status, avatarUrl, trackingNumber, onCopyTracking
}: CourierCardProps) => {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    <View style={styles.onlineDot} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.status}>{status}</Text>
                </View>
            </View>

            <View style={styles.trackingBox}>
                <View>
                    <Text style={styles.label}>TRACKING NUMBER</Text>
                    <Text style={styles.code}>{trackingNumber}</Text>
                </View>
                <TouchableOpacity onPress={onCopyTracking}>
                    <Text style={styles.copyText}>Copy</Text>
                </TouchableOpacity>
            </View>

        </View>
    );
};

const styles = StyleSheet.create({
    card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatarContainer: { marginRight: 15 },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#FFF' },
    name: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    status: { fontSize: 12, color: '#64748B' },
    trackingBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 15, borderRadius: 16, marginBottom: 15 },
    label: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
    code: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginTop: 2 },
    copyText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 13 },
});