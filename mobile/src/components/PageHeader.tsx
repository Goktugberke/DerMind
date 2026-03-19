import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import { theme } from '@constants/theme';

interface PageHeaderProps {
    title: string;
    color?: string;
    fontSize?: number;
    fontWeight?: TextStyle['fontWeight'];
    align?: 'left' | 'center';
}

export const PageHeader = ({ title, color, fontSize, fontWeight, align }: PageHeaderProps) => {

    const overrideStyle = {
        ...(color && { color }),
        ...(fontSize && { fontSize }),
        ...(fontWeight && { fontWeight }),
        ...(align && { textAlign: align }),
    };
    return (
        <View style={styles.headerContainer}>
            <Text style={[styles.headerTitle, overrideStyle]}>
                {title}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 10,
        elevation: 3,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '400',
        color: theme.colors.text,
        letterSpacing: -1,
        paddingHorizontal: 30,
        marginVertical: 5,
    },
});