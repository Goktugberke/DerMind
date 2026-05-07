import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@constants/theme';
import { Sparkles } from 'lucide-react-native'; // Represents AI/Magic

interface AiMatchCardProps {
    aiMatchScore: number;
    explanation: string;
}

export const AiMatchCard = ({ aiMatchScore, explanation }: AiMatchCardProps) => {
    return (
        <View style={styles.cardContainer}>
            <View style={styles.headerRow}>
                <View style={styles.titleRow}>
                    <Sparkles size={20} color={theme.colors.secondary} />
                    <Text style={styles.cardTitle}>AI Match Analysis</Text>
                </View>
            </View>

            <View style={styles.contentArea}>
                <Text style={styles.explanationText}>
                    {explanation}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginHorizontal: 15,
        padding: 20,
        marginTop: 5,
        marginBottom: 10,
        // Optional light colored border to make it stand out as an AI feature
        borderWidth: 1,
        borderColor: '#E8F5E9', // Light green tint
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
        color: theme.colors.text,
    },
    scoreBadge: {
        backgroundColor: '#FFEDF4',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    scoreBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.secondary, // Assuming secondary is a green-ish/accent color
    },
    contentArea: {
        backgroundColor: theme.colors.deepbackground,
        padding: 12,
        borderRadius: 12,
    },
    explanationText: {
        fontSize: 13,
        color: theme.colors.text,
        lineHeight: 20,
    }
});
