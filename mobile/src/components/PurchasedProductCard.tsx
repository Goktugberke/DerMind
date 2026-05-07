import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { theme } from '@constants/theme';
import { Star, Flame, MessageSquare } from 'lucide-react-native';

export const PurchasedProductCard = ({
  item,
  onRate,
  onStartStreak,
  primaryAction,
  secondaryAction,
  children
}: any) => {
  return (
    <View style={styles.card}>
      {/* Ürün Görseli ve Bilgisi */}
      <View style={styles.mainInfo}>
        <View style={styles.imageContainer}>
          {item.image && item.image !== 'null' && typeof item.image === 'string' && item.image.trim() !== '' ? (
            <Image
              source={{ uri: item.image }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={{ fontSize: 10, color: theme.colors.gray }}>No Img</Text>
            </View>
          )}
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.brand}>{item.brand}</Text>
          <Text style={styles.productName}>{item.name}</Text>
        </View>
      </View>

      {children && (
        <View style={styles.childrenContainer}>
          {children}
        </View>
      )}

      {/* Hızlı İşlem Butonları */}
      <View style={styles.actionRow}>
        {primaryAction ? (
          <TouchableOpacity style={styles.actionButton} onPress={primaryAction.onPress}>
            {primaryAction.icon}
            <Text style={styles.actionLabel}>{primaryAction.label}</Text>
          </TouchableOpacity>
        ) : onRate ? (
          <TouchableOpacity style={styles.actionButton} onPress={onRate}>
            <MessageSquare size={18} color={theme.colors.primary} />
            <Text style={styles.actionLabel}>Rate</Text>
          </TouchableOpacity>
        ) : null}

        {secondaryAction ? (
          <TouchableOpacity style={styles.actionButton} onPress={secondaryAction.onPress}>
            {secondaryAction.icon}
            <Text style={styles.actionLabel}>{secondaryAction.label}</Text>
          </TouchableOpacity>
        ) : onStartStreak ? (
          <TouchableOpacity style={styles.actionButton} onPress={onStartStreak}>
            <Flame size={18} color={theme.colors.primary} />
            <Text style={styles.actionLabel}>Start Streak</Text>
          </TouchableOpacity>
        ) : null}
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
  mainInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  imageContainer: {
    width: 70,
    height: 70,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  productImage: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
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
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  actionLabel: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: theme.colors.text },
  childrenContainer: {
    marginTop: 15,
  }
});