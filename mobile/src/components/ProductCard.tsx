import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { theme } from '@constants/theme';
import { StarRating } from '@components/StarRating';

export const ProductCard = ({ item, onPress }: any) => {

  const getScoreColor = (score: string | number) => {
    const numScore = parseFloat(score as string);
    if (isNaN(numScore)) return '#E0E0E0'; // Gray fallback
    if (numScore < 5) return '#FFA8A8'; // Light Red
    if (numScore < 8.5) return '#FDE68A'; // Yellow
    return '#86EFAC'; // Light Green
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress} // Tıklama olayı bağlandı
      activeOpacity={0.7} // Tıklandığındaki şeffaflık efekti (0 ile 1 arası)
    >
      {/* Sol taraf: Ürün Fotoğrafı */}
      <Image
        source={{ uri: item.image }}
        style={styles.productImage}
        resizeMode="contain"
      />

      {/* Orta taraf: Ürün Bilgileri */}
      <View style={styles.infoContainer}>
        <Text style={styles.brand}>{item.brand}</Text>
        <Text style={styles.productName}>{item.name} {item.volume}ml</Text>

        <View style={styles.starRow}>
          <StarRating score={item.generalScore} outOf={10} size={14} />
        </View>
      </View>

      {/* Sağ taraf: Skorlar ve Fiyat */}
      <View style={styles.rightContainer}>
        <View style={styles.scoreRow}>
          <View style={[styles.scoreBox, { backgroundColor: getScoreColor(item.generalScore) }]}>
            <Text style={styles.scoreText}>{item.generalScore}</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
          <View style={[styles.scoreBox, { backgroundColor: getScoreColor(item.aiScore) }]}>
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffffff',
    flexDirection: 'row',
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 7,
    alignItems: 'center',
    height: 110,
    elevation: 2,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 15,
  },
  brand: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  productName: { fontSize: 16, fontWeight: '700', color: theme.colors.gray },
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