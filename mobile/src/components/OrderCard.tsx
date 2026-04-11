import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Box } from 'lucide-react-native';
import { StatusBadge } from './StatusBadge';
import { theme } from '@constants/theme';
import { useNavigation } from '@react-navigation/native';

export const OrderCard = ({ item }: any) => {
    const isDelivered = item.status === 'Delivered';
    const navigation = useNavigation<any>();


    const handleActionPress = () => {
        if (!isDelivered) {
            // Eğer teslim edilmemişse 'TrackOrder' sayfasına git ve ürün bilgisini taşı
            navigation.navigate('TrackOrder', { order: item });
        } else {
            // Eğer teslim edilmişse 'Buy Again' (Sepete ekleme mantığı vb.)
            console.log("Tekrar satın al:", item.id);
        }
    };

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.orderNo}>ORDER #{item.id}</Text>
                <Text style={styles.date}>{item.date}</Text>
            </View>

            <View style={styles.productRow}>
                <Image source={{ uri: item.image }} style={styles.image} />
                <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.specs}>{item.specs}</Text>
                    <View style={styles.statusPriceRow}>
                        <StatusBadge status={item.status} />
                        <Text style={styles.price}>${item.price}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.buttonRow}>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isDelivered ? theme.colors.primary : theme.colors.secondary }]}
                    onPress={handleActionPress}
                >
                    {isDelivered ? null : <Box size={18} color="#FFF" style={{ marginRight: 6 }} />}
                    <Text style={styles.actionBtnText}>{isDelivered ? 'Buy Again' : 'Track Order'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: { backgroundColor: '#FFF', borderRadius: 24, padding: 16, marginBottom: 20, elevation: 2, shadowOpacity: 0.05 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    orderNo: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
    date: { fontSize: 12, color: '#94A3B8' },
    productRow: { flexDirection: 'row', marginBottom: 16 },
    image: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F8F9FA' },
    info: { flex: 1, marginLeft: 15, justifyContent: 'center' },
    name: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    specs: { fontSize: 13, color: '#64748B', marginBottom: 8 },
    statusPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    price: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    buttonRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
    actionBtn: { flex: 1, flexDirection: 'row', height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    actionBtnText: { color: '#FFF', fontWeight: 'bold' }
});