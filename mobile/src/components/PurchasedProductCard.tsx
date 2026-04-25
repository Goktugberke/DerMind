import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { theme } from '@constants/theme';
import { Star, Flame, MessageSquare } from 'lucide-react-native';

export const PurchasedProductCard = ({ item, onRate, onStartStreak }: any) => {
  return (
    <View style={styles.card}>
      {/* Ürün Görseli ve Bilgisi */}
      <View style={styles.mainInfo}>
        {item.image && item.image !== 'null' ? (
          <Image
            source={{ uri: item.image }}
            style={styles.productImage}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.productImage, { backgroundColor: '#f0f0f0' }]} />
        )}
        <View style={styles.textContainer}>
          <Text style={styles.brand}>{item.brand}</Text>
          <Text style={styles.productName}>{item.name}</Text>
        </View>
      </View>

      {/* Hızlı İşlem Butonları */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={onRate}>
          <MessageSquare size={18} color={theme.colors.primary} />
          <Text style={styles.actionLabel}>Rate</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.actionButton]} onPress={onStartStreak}>
          <Flame size={18} color={theme.colors.primary} />
          <Text style={styles.actionLabel}>Start Streak</Text>
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
    marginHorizontal: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
  },
  mainInfo: { flexDirection: 'row', alignItems: 'center' },
  productImage: { width: 60, height: 60, backgroundColor: '#f4f4f4ff', borderRadius: 12 },
  textContainer: { flex: 1, marginLeft: 15 },
  brand: { fontSize: 14, fontWeight: 'bold', color: theme.colors.primary },
  productName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  actionRow: {
    flexDirection: 'row',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  actionButton: {
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: '#f4f4f4ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#efefefff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  actionLabel: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: theme.colors.text },
});