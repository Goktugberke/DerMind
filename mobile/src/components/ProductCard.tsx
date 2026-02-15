import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { theme } from '@constants/theme';
import { Star } from 'lucide-react-native';

export const ProductCard = ({ item, onPress }: any) => { // onPress prop'u eklendi
  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress} // Tıklama olayı bağlandı
      activeOpacity={0.7} // Tıklandığındaki şeffaflık efekti (0 ile 1 arası)
    >
      {/* Sol taraf: Ürün Fotoğrafı */}
      <View style={styles.imagePlaceholder} />

      {/* Orta taraf: Ürün Bilgileri */}
      <View style={styles.infoContainer}>
        <Text style={styles.brand}>{item.brand}</Text>
        <Text style={styles.productName}>{item.name} {item.volume}ml</Text>
        
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} size={14} color={theme.colors.secondary} fill={theme.colors.secondary} />
          ))}
        </View>
      </View>

      {/* Sağ taraf: Skorlar ve Fiyat */}
      <View style={styles.rightContainer}>
        <View style={styles.scoreRow}>
          <View style={[styles.scoreBox, { backgroundColor: '#FDE68A' }]}>
            <Text style={styles.scoreText}>{item.generalScore}</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
          <View style={[styles.scoreBox, { backgroundColor: '#86EFAC' }]}>
            <Text style={styles.scoreText}>{item.aiScore}</Text>
          </View>
        </View>
        <Text style={styles.price}>${item.price}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.colors.gray,
    flexDirection: 'row',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    alignItems: 'center',
    height: 110,
  },
  imagePlaceholder: {
    width: 70,
    height: 70,
    backgroundColor: '#D1D5DB',
    borderRadius: 10,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 15,
  },
  brand: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  productName: {
    fontSize: 15,
    color: '#334155',
  },
  starRow: {
    flexDirection: 'row',
    marginTop: 5,
  },
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
  },
  arrow: {
    marginHorizontal: 4,
    fontSize: 16,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});