import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@constants/theme';
import { Star } from 'lucide-react-native';

interface StarRatingProps {
    score: number | string;
    outOf?: 5 | 10;
    size?: number;
    color?: string;
    isInteractive?: boolean;
    onRate?: (rating: number) => void;
}

export const StarRating = ({
    score,
    outOf = 5,
    size = 14,
    color = theme.colors.secondary,
    isInteractive = false,
    onRate,
}: StarRatingProps) => {

    const numScore = typeof score === 'string' ? parseFloat(score) : score;
    const safeScore = isNaN(numScore) ? 0 : numScore;
    const normalizedScore = outOf === 10 ? safeScore / 2 : safeScore;

    return (
        <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((starIndex) => {
                const isFilled = starIndex <= Math.round(normalizedScore);

                const StarIcon = (
                    <Star
                        key={starIndex}
                        size={size}
                        color={color}
                        fill={isFilled ? color : 'transparent'}
                    />
                );

                if (isInteractive) {
                    return (
                        <TouchableOpacity
                            key={starIndex}
                            onPress={() => onRate && onRate(starIndex)}
                        >
                            {StarIcon}
                        </TouchableOpacity>
                    );
                }

                return StarIcon;
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
