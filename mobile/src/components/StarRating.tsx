import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@constants/theme';
import { Star } from 'lucide-react-native';

interface StarRatingProps {
    score: number | string;
    outOf?: 5 | 10;
    size?: number;
    color?: string;
}

export const StarRating = ({
    score,
    outOf = 5,
    size = 14,
    color = theme.colors.secondary
}: StarRatingProps) => {

    const numScore = typeof score === 'string' ? parseFloat(score) : score;
    const safeScore = isNaN(numScore) ? 0 : numScore;

    // Endpoint'ten genel skor muhtemelen 10 üzerinden dönüyor (örn: 8.5)
    // Yıldızlarımız ise 5 üzerinden grafikleniyor.
    const normalizedScore = outOf === 10 ? safeScore / 2 : safeScore;

    return (
        <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((starIndex) => {
                // Yuvarlama işlemi: 8.5 -> 4.25 yıldız => 4 yıldız dolar.
                const isFilled = starIndex <= Math.round(normalizedScore);

                return (
                    <Star
                        key={starIndex}
                        size={size}
                        color={color}
                        fill={isFilled ? color : 'transparent'}
                    />
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    starsContainer: {
        flexDirection: 'row',
        gap: 2,
        alignItems: 'center',
    },
});
