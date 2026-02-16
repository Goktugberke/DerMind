import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { theme } from '@constants/theme';
import { Star, Flame, MessageSquare } from 'lucide-react-native';

export const PurchasedProductCard = ({ item, onRate, onStartStreak }: any) => {
  return (
    <View style={styles.card}>
      {/* Ürün Görseli ve Bilgisi */}
      <View style={styles.mainInfo}>
        <View style={styles.imagePlaceholder} />
        <View style={styles.textContainer}>
          <Text style={styles.brand}>{item.brand}</Text>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.statusText}>Durum: {item.orderStatus}</Text>
        </View>
      </View>

      {/* Hızlı İşlem Butonları */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={onRate}>
          <MessageSquare size={18} color={theme.colors.primary} />
          <Text style={styles.actionLabel}>Değerlendir</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.streakButton]} onPress={onStartStreak}>
          <Flame size={18} color="#FF5722" />
          <Text style={styles.streakLabel}>Seriye Başla</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
  },
  mainInfo: { flexDirection: 'row', alignItems: 'center' },
  imagePlaceholder: { width: 60, height: 60, backgroundColor: '#E2E8F0', borderRadius: 12 },
  textContainer: { flex: 1, marginLeft: 15 },
  brand: { fontSize: 14, fontWeight: 'bold', color: theme.colors.gray },
  productName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  statusText: { fontSize: 12, color: '#64748B', marginTop: 4 },
  actionRow: {
    flexDirection: 'row',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    justifyContent: 'space-around',
  },
  actionButton: { flexDirection: 'row', alignItems: 'center' },
  actionLabel: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: theme.colors.text },
  streakButton: { backgroundColor: '#FFF5F2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  streakLabel: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: '#FF5722' },
});