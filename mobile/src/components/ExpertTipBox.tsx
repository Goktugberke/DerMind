// src/components/ExpertTipBox.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lightbulb } from 'lucide-react-native';
import { theme } from '@constants/theme';

interface ExpertTipProps {
    tip: string;
}

export const ExpertTipBox = ({ tip }: ExpertTipProps) => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Lightbulb size={20} color={theme.colors.primary} fill={theme.colors.primary + '20'} />
                <Text style={styles.title}>EXPERT TIP</Text>
            </View>
            <Text style={styles.tipText}>{tip}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#dadada7b', //koyu Gri
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#bbbbbb7b',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 12,
        fontWeight: '800',
        color: theme.colors.text,
        marginLeft: 8,
        letterSpacing: 1,
    },
    tipText: {
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 20,
    },
});