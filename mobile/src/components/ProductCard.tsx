import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { theme } from '@constants/theme';
import { StarRating } from '@components/StarRating';

export const ProductCard = ({ item, onPress, ratings }: any) => {

  const avgRating = ratings && ratings.length > 0
    ? ratings.reduce((acc: number, r: any) => acc + r.rating, 0) / ratings.length
    : null;

  const avgPersonal = ratings && ratings.length > 0
    ? ratings.reduce((acc: number, r: any) => acc + (r.personalizedRating || 0), 0) / ratings.length
    : null;

  const getScoreColor = (score: string | number) => {
    const numScore = parseFloat(score as string);
    if (isNaN(numScore)) return '#E0E0E0'; // Gray fallback
    if (numScore < 4) return '#FFA8A8'; // Light Red
    if (numScore < 5) return '#FDE68A'; // Yellow
    return '#86EFAC'; // Light Green
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress} // Tıklama olayı bağlandı
      activeOpacity={0.7} // Tıklandığındaki şeffaflık efekti (0 ile 1 arası)
    >
      {/* Sol taraf: Ürün Fotoğrafı */}
      {item.image && item.image !== 'null' ? (
        <Image
          source={{ uri: item.image }}
          style={styles.productImage}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.productImage, { backgroundColor: '#f0f0f0' }]} />
      )}

      {/* Orta taraf: Ürün Bilgileri */}
      <View style={styles.infoContainer}>
        <Text style={styles.brand}>{item.brand}</Text>
        <Text style={styles.productName}>{item.name}</Text>

        <View style={styles.starRow}>
          <StarRating
            score={avgRating ? avgRating * 2 : item.generalScore}
            outOf={10}
            size={14}
          />
          {avgPersonal ? (
            <View style={styles.aiStarRow}>
              <Text style={styles.aiLabel}>AI</Text>
              <StarRating score={avgPersonal * 2} outOf={10} size={10} />
            </View>
          ) : null}
        </View>
      </View>

      {/* Sağ taraf: Skorlar ve Fiyat */}
      <View style={styles.rightContainer}>
        <View style={styles.scoreRow}>
          <View style={[styles.scoreBox, { backgroundColor: getScoreColor(item.base_score ?? item.generalScore) }]}>
            <Text style={styles.scoreText}>{item.base_score ?? item.generalScore ?? '—'}</Text>
          </View>
          {item.personal_score && item.personal_score !== 'null' ? (
            <>
              <Text style={styles.arrow}>→</Text>
              <View style={[styles.scoreBox, { backgroundColor: getScoreColor(item.personal_score) }]}>
                <Text style={styles.scoreText}>{item.personal_score}</Text>
              </View>
            </>
          ) : null}
        </View>
        <Text style={styles.price}>${item.price && item.price !== 'null' ? item.price : '0'}</Text>
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
  productName: { fontSize: 14, fontWeight: '400', color: theme.colors.gray },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  aiStarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  aiLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginRight: 4,
  },
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 32,
    justifyContent: 'center',
    alignItems: 'center',
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